import type { GmailMessageResponse } from "../gmail/gmail-message-utils.js";
import { fetchJson } from "../gmail/gmail-http.js";
import { getAccessTokenForEmail } from "../gmail/gmail-auth.js";
import { prisma } from "../../lib/prisma.js";
import { resolveInteractionId } from "../../repositories/interaction-repository.js";
import { fetchAndParseGmailMessage, createExtractedData } from "./email-fetch-utils.js";
import { generateAiSuggestionFromEmails, aggregateAndSaveInteractionEmails } from "./email-ai-aggregation.js";
import { fetchInteractionWithEmails, markEmailAsUsed } from "./email-db-utils.js";
import { serializeInteraction, serializeInteractionEmails } from "../../lib/serializers.js";

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
    select: { ownerEmail: true, jobOpportunityId: true }
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
    return { alreadyAttached: true, email: serializeInteractionEmails([existing])[0] };
  }

  // Fetch the email from Gmail
  const access = await getAccessTokenForEmail(auth0Email);
  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const parsed = await fetchAndParseGmailMessage(gmailMessageId, access);

  // Store the attached email
  const interactionEmail = await prisma.interactionEmail.create({
    data: {
      interactionId,
      gmailMessageId,
      subject: parsed.structured.subject,
      from: parsed.structured.fromRaw,
      receivedDate: new Date(parsed.structured.internalDate),
      extractedData: createExtractedData(parsed) as any
    }
  });

  // Mark email as used
  await markEmailAsUsed(auth0Email, gmailMessageId, interaction.jobOpportunityId);

  // Generate AI suggestion WITHOUT saving to database (consistent with batch attach)
  const refreshedInteraction = await fetchInteractionWithEmails(interactionId);
  const aiSuggestion = await generateAiSuggestionFromEmails(refreshedInteraction);

  console.log('[ATTACH SINGLE] AI suggestion (NOT saved):', aiSuggestion?.notes?.slice(0, 200));

  return {
    email: serializeInteractionEmails([interactionEmail])[0],
    interaction: serializeInteraction(refreshedInteraction),
    aiSuggestion
  };
}

/**
 * Aggregate data from all attached emails and update the interaction
 * Strategy: Latest wins for conflicts, merge participants, combine notes
 *
 * NOTE: This is a legacy function that auto-saves. New flows should use
 * generateAiSuggestionFromEmails and let the frontend review before saving.
 */
export const aggregateInteractionEmails = aggregateAndSaveInteractionEmails;

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

    // Fetch and parse the email
    const parsed = await fetchAndParseGmailMessage(gmailMessageId, access);

    // Store the attached email
    const interactionEmail = await prisma.interactionEmail.create({
      data: {
        interactionId,
        gmailMessageId,
        subject: parsed.structured.subject,
        from: parsed.structured.fromRaw,
        receivedDate: new Date(parsed.structured.internalDate),
        extractedData: createExtractedData(parsed) as any
      }
    });

    attachedEmails.push(interactionEmail);

    // Mark email as used
    await markEmailAsUsed(auth0Email, gmailMessageId, interaction.jobOpportunityId);
  }

  // Generate AI suggestion WITHOUT saving to database
  const refreshedInteraction = await fetchInteractionWithEmails(interactionId);
  const aiSuggestion = await generateAiSuggestionFromEmails(refreshedInteraction);

  console.log('[ATTACH] AI suggestion (NOT saved):', aiSuggestion?.notes?.slice(0, 200));
  console.log('[ATTACH] Returning interaction with AI suggestion for review');

  return {
    newlyAttachedEmails: serializeInteractionEmails(attachedEmails),
    interaction: serializeInteraction(refreshedInteraction),
    aiSuggestion
  };
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

        const parsed = await fetchAndParseGmailMessage(email.gmailMessageId, access);

        console.log('[REPARSE] Parsed structuredEmail:', {
          subject: parsed.structured.subject,
          hasPlainText: !!parsed.structured.plainText,
          plainTextLength: parsed.structured.plainText?.length,
          plainTextPreview: parsed.structured.plainText?.slice(0, 200)
        });

        const dataToSave = {
          subject: parsed.structured.subject,
          from: parsed.structured.fromRaw,
          receivedDate: new Date(parsed.structured.internalDate),
          extractedData: createExtractedData(parsed) as any
        };

        console.log('[REPARSE] Saving to database:', {
          emailId: email.id,
          hasPlainText: !!(dataToSave.extractedData as any).structured.plainText,
          plainTextLength: (dataToSave.extractedData as any).structured.plainText?.length
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
  const refreshedInteraction = await fetchInteractionWithEmails(interactionId);
  const aiSuggestion = await generateAiSuggestionFromEmails(refreshedInteraction);

  console.log('[REPARSE] AI suggestion (NOT saved):', aiSuggestion?.notes?.slice(0, 200));
  console.log('[REPARSE] Returning interaction with AI suggestion for review');

  return {
    ...refreshedInteraction,
    aiSuggestion // Frontend can use this to pre-fill edit form
  };
}
