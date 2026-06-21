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

  // Re-aggregate all emails for this interaction
  await aggregateInteractionEmails(interactionId);

  return { email: interactionEmail };
}

/**
 * Aggregate data from all attached emails and update the interaction
 * Strategy: Latest wins for conflicts, merge participants, combine notes
 */
export async function aggregateInteractionEmails(interactionId: string) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      attachedEmails: {
        orderBy: { receivedDate: 'desc' }
      }
    }
  });

  if (!interaction) {
    return;
  }

  // Handle legacy interactions with gmailMessageId but no attachedEmails
  if (interaction.attachedEmails.length === 0 && interaction.gmailMessageId) {
    // Try to find if this email was already migrated but query didn't include it
    const existingEmail = await prisma.interactionEmail.findFirst({
      where: {
        interactionId: interaction.id,
        gmailMessageId: interaction.gmailMessageId
      }
    });

    if (existingEmail) {
      // Email exists but wasn't included - refetch
      interaction.attachedEmails = [existingEmail];
    }
  }

  // If still no emails, nothing to aggregate
  if (interaction.attachedEmails.length === 0) {
    return;
  }

  const allParticipants = new Set<string>();
  const allNotes: Array<{ subject: string; from: string; date: string; body: string }> = [];
  let latestDate: string | null = null;
  let latestEndDate: string | null = null;
  let latestType: string | null = null;
  let latestStage: string | null = null;
  let latestStatus: string | null = null;
  let latestAgenda: string | null = null;
  let latestMeetingLink: string | null = null;
  let latestLocation: string | null = null;

  // Process emails from newest to oldest
  console.log(`[AGGREGATE] Processing ${interaction.attachedEmails.length} emails for interaction ${interactionId}`);

  for (const email of interaction.attachedEmails) {
    console.log(`[AGGREGATE] Email ID: ${email.id}, Gmail ID: ${email.gmailMessageId}, Subject: ${email.subject}`);

    const data = email.extractedData as any;
    // Handle both new structure (with derived/structured) and old structure (direct)
    const extracted = (data?.derived || data) as GmailDerivedInteraction | null;
    const structured = data?.structured;

    if (!extracted) {
      console.log(`[AGGREGATE] Skipping email ${email.id} - no extractedData`);
      continue;
    }

    // Latest wins for scalar fields
    if (!latestDate && extracted.date) latestDate = extracted.date;
    if (!latestEndDate && extracted.endDate) latestEndDate = extracted.endDate;
    if (!latestType && extracted.type) latestType = extracted.type;
    if (!latestStage && extracted.stage) latestStage = extracted.stage;
    if (!latestStatus && extracted.status) latestStatus = extracted.status;
    if (!latestAgenda && extracted.agenda) latestAgenda = extracted.agenda;
    if (!latestMeetingLink && extracted.meetingLink) latestMeetingLink = extracted.meetingLink;

    // Merge participants (accumulate all unique names)
    if (extracted.personName) {
      const names = extracted.personName.split(/\s+and\s+|,\s*/).map(n => n.trim()).filter(Boolean);
      names.forEach(name => allParticipants.add(name));
    }

    // Collect email body text for AI summarization
    // Priority: structured.plainText > old notes field > subject
    let bodyText = '';

    if (structured?.plainText) {
      // New format: use clean plainText
      bodyText = structured.plainText.trim();
    } else if (extracted.notes) {
      // Old format: extract body from notes field
      // Notes field has format: "Subject: ...\nFrom: ...\nBody: actual content"
      const bodyMatch = extracted.notes.match(/Body:\s*(.+)/s);
      if (bodyMatch && bodyMatch[1]) {
        bodyText = bodyMatch[1].trim();
      } else {
        // If no Body: prefix, use the whole notes field
        bodyText = extracted.notes;
      }
    }

    // Only add if we have actual content (not just metadata)
    if (bodyText && bodyText.length > 20) {
      allNotes.push({
        subject: email.subject || 'No subject',
        from: email.from || 'Unknown',
        date: email.receivedDate?.toISOString() || '',
        body: bodyText.slice(0, 2000) // Limit to avoid token overload
      });
    }
  }

  // Use AI to summarize notes from multiple emails
  let summarizedNotes: string | null = null;
  if (allNotes.length > 0) {
    console.log(`[AGGREGATE] Summarizing ${allNotes.length} email bodies with AI`);
    console.log(`[AGGREGATE] Email bodies preview:`, allNotes.map(n => ({ subject: n.subject, bodyPreview: n.body.slice(0, 100) })));

    try {
      const aiService = getAiParserService();
      summarizedNotes = await aiService.summarizeMultipleEmails({ emails: allNotes });
      console.log('[AGGREGATE] AI returned notes:', summarizedNotes);
    } catch (error) {
      console.error('Failed to summarize notes with AI:', error);
      // Fallback to simple concatenation if AI fails
      summarizedNotes = allNotes.map(n => n.body).join('\n\n');
    }
  }

  // Update the interaction with aggregated data
  await prisma.interaction.update({
    where: { id: interactionId },
    data: {
      date: latestDate ? new Date(latestDate) : undefined,
      endDate: latestEndDate ? new Date(latestEndDate) : null,
      type: latestType || interaction.type,
      stage: latestStage || interaction.stage,
      status: latestStatus as any || interaction.status,
      personName: allParticipants.size > 0 ? Array.from(allParticipants).join(', ') : interaction.personName,
      agenda: latestAgenda || interaction.agenda,
      meetingLink: latestMeetingLink || interaction.meetingLink,
      notes: summarizedNotes || interaction.notes
    }
  });
}

/**
 * Remove an attached email from an interaction
 */
export async function removeEmailFromInteraction(params: {
  interactionId: string;
  emailId: string;
}) {
  const { interactionId, emailId } = params;

  await prisma.interactionEmail.delete({
    where: { id: emailId }
  });

  // Re-aggregate remaining emails
  await aggregateInteractionEmails(interactionId);
}

/**
 * List all emails attached to an interaction
 */
export async function listInteractionEmails(interactionId: string) {
  return prisma.interactionEmail.findMany({
    where: { interactionId },
    orderBy: { receivedDate: 'desc' }
  });
}

/**
 * Re-parse and re-aggregate all attached emails for an interaction
 * Useful when emails have been added/removed or to refresh the summarization
 */
export async function reparseInteractionEmails(interactionId: string) {
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
