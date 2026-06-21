import { prisma } from "../../lib/prisma.js";
import { parseStructuredGmailEmail, deriveInteractionFromStructuredEmail } from "../gmail/gmail-message-parser.js";
import { getAccessTokenForEmail } from "../gmail/gmail-auth.js";
import { fetchJson } from "../gmail/gmail-http.js";
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

  // Store the attached email
  const interactionEmail = await prisma.interactionEmail.create({
    data: {
      interactionId,
      gmailMessageId,
      subject: structuredEmail.subject,
      from: structuredEmail.fromRaw,
      receivedDate: new Date(structuredEmail.internalDate),
      extractedData: derived as any
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

  if (!interaction || interaction.attachedEmails.length === 0) {
    return;
  }

  const allParticipants = new Set<string>();
  const allNotes: string[] = [];
  let latestDate: string | null = null;
  let latestEndDate: string | null = null;
  let latestType: string | null = null;
  let latestStage: string | null = null;
  let latestStatus: string | null = null;
  let latestAgenda: string | null = null;
  let latestMeetingLink: string | null = null;
  let latestLocation: string | null = null;

  // Process emails from newest to oldest
  for (const email of interaction.attachedEmails) {
    const extracted = email.extractedData as GmailDerivedInteraction | null;
    if (!extracted) continue;

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

    // Combine notes
    if (extracted.notes) {
      allNotes.push(`[From: ${email.subject}]\n${extracted.notes}`);
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
      notes: allNotes.length > 0 ? allNotes.join('\n\n---\n\n') : interaction.notes
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
