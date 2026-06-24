import type { GmailAttachmentResponse, GmailMessageResponse } from "../gmail/gmail-message-utils.js";
import { deriveInteractionFromStructuredEmail, parseStructuredGmailEmail } from "../gmail/gmail-message-parser.js";

import type { GmailDerivedInteraction } from "../gmail/gmail-message-parser.js";
import { fetchJson } from "../gmail/gmail-http.js";
import { getAccessTokenForEmail } from "../gmail/gmail-auth.js";
import { getAiParserService } from "../ai/ai-parser-service.js";
import { prisma } from "../../lib/prisma.js";
import { resolveInteractionId } from "../../repositories/interaction-repository.js";

/**
 * Attach a Gmail message to an interaction
 */
export async function attachEmailToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  gmailMessageId: string;
}) {
  const { auth0Email, interactionId: interactionSlugOrId, gmailMessageId } = params;
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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
  console.log('[AGGREGATE] ========== START ==========');
  console.log('[AGGREGATE] Interaction ID:', interactionId);

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: { orderBy: { receivedDate: 'desc' } },
      jobOpportunity: { select: { companyName: true, roleTitle: true } }
    }
  });

  if (!interaction) {
    console.log('[AGGREGATE] Interaction not found');
    return;
  }

  if (interaction.attachedEmails.length === 0) {
    console.log('[AGGREGATE] No attached emails');
    return;
  }

  console.log(`[AGGREGATE] Found ${interaction.attachedEmails.length} attached emails`);
  console.log('[AGGREGATE] Company:', interaction.jobOpportunity?.companyName);
  console.log('[AGGREGATE] Role:', interaction.jobOpportunity?.roleTitle);

  const emails = [];
  for (const email of interaction.attachedEmails) {
    console.log(`[AGGREGATE] Email ${email.id}: subject="${email.subject}", from="${email.from}"`);

    const data = email.extractedData as any;
    console.log('[AGGREGATE] extractedData keys:', Object.keys(data || {}));

    const structured = data?.structured;
    console.log('[AGGREGATE] Has structured:', !!structured);
    console.log('[AGGREGATE] Has plainText:', !!structured?.plainText);

    if (structured?.plainText) {
      console.log('[AGGREGATE] plainText length:', structured.plainText.length);
      console.log('[AGGREGATE] plainText preview:', structured.plainText.slice(0, 200));
    }

    if (!structured?.plainText) {
      console.log('[AGGREGATE] ⚠️ SKIPPING - no plainText');
      continue;
    }

    const emailData = {
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
    };

    console.log('[AGGREGATE] ✅ Added email to AI input');
    emails.push(emailData);
  }

  if (emails.length === 0) {
    console.log('[AGGREGATE] ⚠️ No emails with plainText');
    return;
  }

  console.log(`[AGGREGATE] Calling AI with ${emails.length} emails`);

  const aiService = getAiParserService();
  const parsed = await aiService.parseMultipleEmailsToInteraction({
    companyName: interaction.jobOpportunity?.companyName || 'Unknown',
    roleTitle: interaction.jobOpportunity?.roleTitle || null,
    emails
  });

  console.log('[AGGREGATE] ✅ AI returned result');
  console.log('[AGGREGATE] notes:', parsed.notes);

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

  console.log('[AGGREGATE] ✅ Database updated');

  const { syncOpportunityStatusRecord } = await import("../../repositories/opportunity-repository.js");
  await syncOpportunityStatusRecord(interaction.jobOpportunityId, interaction.ownerEmail);

  console.log('[AGGREGATE] ========== END ==========');
}

export async function attachMultipleEmailsToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  gmailMessageIds: string[];
}) {
  const { auth0Email, interactionId: interactionSlugOrId, gmailMessageIds } = params;
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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
  const { auth0Email, interactionId: interactionSlugOrId, emailId } = params;
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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
export async function listInteractionEmails(auth0Email: string, interactionSlugOrId: string) {
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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
export async function reparseInteractionEmails(auth0Email: string, interactionSlugOrId: string) {
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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

  // Re-fetch and re-parse any emails that have null extractedData OR missing plainText
  // This handles legacy emails that were attached before we added plainText extraction
  const emailsNeedingParse = interaction.attachedEmails.filter(e => {
    if (!e.extractedData) return true;
    const data = e.extractedData as any;
    const hasPlainText = data?.structured?.plainText;
    console.log(`[REPARSE] Email ${e.id} has plainText:`, !!hasPlainText);
    return !hasPlainText;
  });

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
        console.log('[REPARSE] Gmail payload structure:', {
          mimeType: rawMessage.payload?.mimeType,
          hasBody: !!rawMessage.payload?.body,
          bodySize: rawMessage.payload?.body?.size,
          bodyHasData: !!rawMessage.payload?.body?.data,
          hasParts: !!rawMessage.payload?.parts,
          partsCount: rawMessage.payload?.parts?.length,
          partMimeTypes: rawMessage.payload?.parts?.map(p => p.mimeType)
        });

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

        console.log('[REPARSE] Parsed structuredEmail:', {
          subject: structuredEmail.subject,
          hasPlainText: !!structuredEmail.plainText,
          plainTextLength: structuredEmail.plainText?.length,
          plainTextPreview: structuredEmail.plainText?.slice(0, 200),
          hasCalendar: !!structuredEmail.calendar,
          calendarStart: structuredEmail.calendar?.start
        });

        const derived = deriveInteractionFromStructuredEmail(structuredEmail);

        const dataToSave = {
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
        };

        console.log('[REPARSE] Saving to database:', {
          emailId: email.id,
          hasPlainText: !!dataToSave.extractedData.structured.plainText,
          plainTextLength: dataToSave.extractedData.structured.plainText?.length
        });

        // Update the email with parsed data
        await prisma.interactionEmail.update({
          where: { id: email.id },
          data: dataToSave
        });

        console.log('[REPARSE] ✅ Database updated for email', email.id);
      } catch (error) {
        console.error(`Failed to re-parse email ${email.gmailMessageId}:`, error);
        // Continue with other emails even if one fails
      }
    }
  }

  // Return interaction for frontend to decide whether to save
  // Don't auto-aggregate here - let frontend show AI results for review
  const refreshedInteraction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: {
        orderBy: { receivedDate: 'desc' }
      },
      jobOpportunity: {
        select: { companyName: true, roleTitle: true }
      }
    }
  });

  if (!refreshedInteraction) {
    throw new Error('Interaction not found after reparse');
  }

  // Generate AI results WITHOUT saving to database
  const emails = [];
  for (const email of refreshedInteraction.attachedEmails) {
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

  let aiSuggestion = null;
  if (emails.length > 0) {
    const aiService = getAiParserService();
    aiSuggestion = await aiService.parseMultipleEmailsToInteraction({
      companyName: refreshedInteraction.jobOpportunity?.companyName || 'Unknown',
      roleTitle: refreshedInteraction.jobOpportunity?.roleTitle || null,
      emails
    });
    console.log('[REPARSE] AI suggestion (NOT saved):', aiSuggestion.notes?.slice(0, 200));
  }

  console.log('[REPARSE] Returning interaction with AI suggestion for review');

  return {
    ...refreshedInteraction,
    aiSuggestion // Frontend can use this to pre-fill edit form
  };
}
