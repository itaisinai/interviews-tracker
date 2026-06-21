import { prisma } from "../../lib/prisma.js";
import { parseStructuredGmailEmail, deriveInteractionFromStructuredEmail } from "../gmail/gmail-message-parser.js";
import { getAccessTokenForEmail } from "../gmail/gmail-auth.js";
import { fetchJson } from "../gmail/gmail-http.js";
import { getAiParserService } from "../ai/ai-parser-service.js";
import type { GmailDerivedInteraction } from "../gmail/gmail-message-parser.js";
import type { GmailMessageResponse, GmailAttachmentResponse } from "../gmail/gmail-message-utils.js";

/**
 * Attach a Gmail message to an interaction
 */
export async function attachEmailToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  gmailMessageId: string;
}) {
  const { auth0Email, interactionId, gmailMessageId } = params;

  // Verify interaction ownership
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { ownerEmail: true }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  if (interaction.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.ownerEmail}`);
  }

  // Check if already attached
  const existing = await prisma.interactionEmail.findUnique({
    where: {
      interactionId_gmailMessageId: {
        interactionId,
        gmailMessageId
      }
    }
  });

  if (existing) {
    return { alreadyAttached: true, email: existing };
  }

  // Fetch the email from Gmail
  const access = await getAccessTokenForEmail(auth0Email);
  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const rawMessage = await fetchJson<GmailMessageResponse>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}?${new URLSearchParams({ format: "full" })}`,
    { headers: { Authorization: `Bearer ${access.accessToken}` } }
  );

  const structuredEmail = await parseStructuredGmailEmail({
    message: rawMessage,
    attachmentFetcher: async (messageId, attachmentId) => {
      const attachment = await fetchJson<GmailAttachmentResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${access.accessToken}` } }
      );
      if (!attachment.data) {
        return "";
      }
      return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    }
  });

  const derived = deriveInteractionFromStructuredEmail(structuredEmail);

  // Get the interaction's opportunity ID to mark email as used
  const interactionForOpportunity = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { jobOpportunityId: true }
  });

  if (!interactionForOpportunity) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  // Store the attached email with both derived and structured data
  const interactionEmail = await prisma.interactionEmail.create({
    data: {
      interactionId,
      gmailMessageId,
      subject: structuredEmail.subject,
      from: structuredEmail.fromRaw,
      receivedDate: new Date(structuredEmail.internalDate),
      extractedData: {
        derived,
        structured: {
          subject: structuredEmail.subject,
          from: structuredEmail.fromRaw,
          plainText: structuredEmail.plainText,
          calendar: structuredEmail.calendar
        }
      } as any
    }
  });

  // Mark email as used in Gmail message state to prevent re-import
  await prisma.gmailMessageState.upsert({
    where: {
      auth0Email_messageId: {
        auth0Email,
        messageId: gmailMessageId
      }
    },
    create: {
      auth0Email,
      jobOpportunityId: interactionForOpportunity.jobOpportunityId,
      messageId: gmailMessageId,
      status: "USED"
    },
    update: {
      status: "USED",
      jobOpportunityId: interactionForOpportunity.jobOpportunityId
    }
  });

  // Re-aggregate all emails for this interaction
  await aggregateInteractionEmails(interactionId);

  return { email: interactionEmail };
}

/**
 * Aggregate data from all attached emails and update the interaction
 * Strategy: Latest wins for conflicts, merge participants, combine notes
 */
/**
 * Aggregate data from all attached emails using AI
 */
export async function aggregateInteractionEmails(interactionId: string) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: { orderBy: { receivedDate: 'desc' } },
      jobOpportunity: { select: { companyName: true, roleTitle: true } }
    }
  });

  if (!interaction || interaction.attachedEmails.length === 0) return;

  console.log(`[AGGREGATE] Processing ${interaction.attachedEmails.length} emails`);

  const emails = [];
  for (const email of interaction.attachedEmails) {
    const data = email.extractedData as any;
    const structured = data?.structured;
    if (!structured?.plainText) continue;

    emails.push({
      subject: email.subject || '',
      from: email.from || '',
      date: email.receivedDate?.toISOString() || '',
      body: structured.plainText.slice(0, 2000),
      calendar: structured.calendar ? {
        start: structured.calendar.start || null,
        end: structured.calendar.end || null,
        summary: structured.calendar.summary || null,
        location: structured.calendar.location || null
      } : null
    });
  }

  if (emails.length === 0) return;

  const aiService = getAiParserService();
  const parsed = await aiService.parseMultipleEmailsToInteraction({
    companyName: interaction.jobOpportunity?.companyName || 'Unknown',
    roleTitle: interaction.jobOpportunity?.roleTitle || null,
    emails
  });

  console.log('[AGGREGATE] AI result:', { date: parsed.date, type: parsed.type });

  await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      date: new Date(parsed.date),
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      type: parsed.type,
      stage: parsed.stage || null,
      status: parsed.status as any,
      personName: parsed.personName || null,
      personRole: parsed.personRole || null,
      agenda: parsed.agenda || null,
      meetingLink: parsed.meetingLink || null,
      notes: parsed.notes || null,
      outcome: parsed.outcome || null,
      followUp: parsed.followUp || null
    }
  });

  const { syncOpportunityStatusRecord } = await import("../../repositories/opportunity-repository.js");
  await syncOpportunityStatusRecord(interaction.jobOpportunityId, interaction.ownerEmail);
}

export async function attachMultipleEmailsToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  gmailMessageIds: string[];
}) {
  const { auth0Email, interactionId, gmailMessageIds } = params;

  // Verify interaction ownership
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { ownerEmail: true, jobOpportunityId: true }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  if (interaction.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.ownerEmail}`);
  }

  // Fetch and parse all emails
  const access = await getAccessTokenForEmail(auth0Email);
  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const attachedEmails = [];

  for (const gmailMessageId of gmailMessageIds) {
    // Skip if already attached
    const existing = await prisma.interactionEmail.findUnique({
      where: {
        interactionId_gmailMessageId: {
          interactionId,
          gmailMessageId
        }
      }
    });

    if (existing) {
      attachedEmails.push(existing);
      continue;
    }

    // Fetch the email from Gmail
    const rawMessage = await fetchJson<GmailMessageResponse>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}?${new URLSearchParams({ format: "full" })}`,
      { headers: { Authorization: `Bearer ${access.accessToken}` } }
    );

    const structuredEmail = await parseStructuredGmailEmail({
      message: rawMessage,
      attachmentFetcher: async (messageId, attachmentId) => {
        const attachment = await fetchJson<GmailAttachmentResponse>(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
          { headers: { Authorization: `Bearer ${access.accessToken}` } }
        );
        if (!attachment.data) {
          return "";
        }
        return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      }
    });

    const derived = deriveInteractionFromStructuredEmail(structuredEmail);

    // Store the attached email
    const interactionEmail = await prisma.interactionEmail.create({
      data: {
        interactionId,
        gmailMessageId,
        subject: structuredEmail.subject,
        from: structuredEmail.fromRaw,
        receivedDate: new Date(structuredEmail.internalDate),
        extractedData: {
          derived,
          structured: {
            subject: structuredEmail.subject,
            from: structuredEmail.fromRaw,
            plainText: structuredEmail.plainText,
            calendar: structuredEmail.calendar
          }
        } as any
      }
    });

    attachedEmails.push(interactionEmail);

    // Mark email as used
    await prisma.gmailMessageState.upsert({
      where: {
        auth0Email_messageId: {
          auth0Email,
          messageId: gmailMessageId
        }
      },
      create: {
        auth0Email,
        jobOpportunityId: interaction.jobOpportunityId,
        messageId: gmailMessageId,
        status: "USED"
      },
      update: {
        status: "USED",
        jobOpportunityId: interaction.jobOpportunityId
      }
    });
  }

  // Re-aggregate once after all emails are attached
  await aggregateInteractionEmails(interactionId);

  return { attachedEmails };
}

/**
 * Remove an attached email from an interaction
 */
export async function removeEmailFromInteraction(params: {
  auth0Email: string;
  interactionId: string;
  emailId: string;
}) {
  const { auth0Email, interactionId, emailId } = params;

  // Verify interaction ownership
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { ownerEmail: true }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  if (interaction.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.ownerEmail}`);
  }

  await prisma.interactionEmail.delete({
    where: { id: emailId }
  });

  // Re-aggregate remaining emails
  await aggregateInteractionEmails(interactionId);
}

/**
 * List all emails attached to an interaction
 */
export async function listInteractionEmails(auth0Email: string, interactionId: string) {
  // Verify interaction ownership
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    select: { ownerEmail: true }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  if (interaction.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.ownerEmail}`);
  }

  return prisma.interactionEmail.findMany({
    where: { interactionId },
    orderBy: { receivedDate: 'desc' }
  });
}

/**
 * Re-parse and re-aggregate all attached emails for an interaction
 * Useful when emails have been added/removed or to refresh the summarization
 */
export async function reparseInteractionEmails(auth0Email: string, interactionId: string) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: true,
      jobOpportunity: {
        select: { ownerEmail: true }
      }
    }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  // Verify ownership
  if (interaction.jobOpportunity.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.jobOpportunity.ownerEmail}`);
  }

  // Re-fetch and re-parse any emails that have null extractedData
  // This handles legacy emails that were attached before we added parsing
  const emailsNeedingParse = interaction.attachedEmails.filter(e => !e.extractedData);

  if (emailsNeedingParse.length > 0) {
    const access = await getAccessTokenForEmail(interaction.jobOpportunity.ownerEmail);
    if (!access) {
      throw new Error("Gmail is not connected.");
    }

    for (const email of emailsNeedingParse) {
      try {
        console.log(`[REPARSE] Fetching Gmail message ${email.gmailMessageId} for interaction ${interactionId}`);

        // Fetch the email from Gmail
        const rawMessage = await fetchJson<GmailMessageResponse>(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.gmailMessageId}?${new URLSearchParams({ format: "full" })}`,
          { headers: { Authorization: `Bearer ${access.accessToken}` } }
        );

        console.log(`[REPARSE] Fetched email subject: ${rawMessage.payload?.headers?.find(h => h.name === 'Subject')?.value}`);

        const structuredEmail = await parseStructuredGmailEmail({
          message: rawMessage,
          attachmentFetcher: async (messageId, attachmentId) => {
            const attachment = await fetchJson<GmailAttachmentResponse>(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
              { headers: { Authorization: `Bearer ${access.accessToken}` } }
            );
            if (!attachment.data) {
              return "";
            }
            return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
          }
        });

        const derived = deriveInteractionFromStructuredEmail(structuredEmail);

        // Update the email with parsed data
        await prisma.interactionEmail.update({
          where: { id: email.id },
          data: {
            subject: structuredEmail.subject,
            from: structuredEmail.fromRaw,
            receivedDate: new Date(structuredEmail.internalDate),
            extractedData: {
              derived,
              structured: {
                subject: structuredEmail.subject,
                from: structuredEmail.fromRaw,
                plainText: structuredEmail.plainText,
                calendar: structuredEmail.calendar
              }
            } as any
          }
        });
      } catch (error) {
        console.error(`Failed to re-parse email ${email.gmailMessageId}:`, error);
        // Continue with other emails even if one fails
      }
    }
  }

  // Now aggregate all emails (both newly parsed and existing ones)
  await aggregateInteractionEmails(interactionId);

  // Return the updated interaction
  return prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: {
        orderBy: { receivedDate: 'desc' }
      }
    }
  });
}
