import { getAiParserService } from "../ai/ai-parser-service.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Add feedback to an interaction and smart-merge with existing notes
 */
export async function addFeedbackToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  feedbackContent: string;
  source?: string;
}) {
  const { auth0Email, interactionId, feedbackContent, source = "Manual" } = params;

  console.log('[FEEDBACK] Starting addFeedbackToInteraction', { interactionId, contentLength: feedbackContent.length });

  // Verify interaction ownership and fetch current data
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      jobOpportunity: {
        select: {
          companyName: true,
          roleTitle: true
        }
      }
    }
  });

  if (!interaction) {
    throw new Error(`Interaction ${interactionId} not found`);
  }

  if (interaction.ownerEmail !== auth0Email) {
    throw new Error(`Unauthorized: interaction belongs to ${interaction.ownerEmail}`);
  }

  // Save feedback record
  const feedbackRecord = await prisma.interactionFeedback.create({
    data: {
      interactionId,
      content: feedbackContent,
      source,
    }
  });

  console.log('[FEEDBACK] Saved feedback record:', feedbackRecord.id);

  // Get all feedback for this interaction (including the new one)
  const allFeedback = await prisma.interactionFeedback.findMany({
    where: { interactionId },
    orderBy: { attachedAt: 'asc' }
  });

  console.log('[FEEDBACK] Total feedback count:', allFeedback.length);

  // Call AI to smart-merge existing notes + all feedback
  const aiParser = getAiParserService();
  const result = await aiParser.smartMergeFeedback({
    companyName: interaction.jobOpportunity.companyName,
    roleTitle: interaction.jobOpportunity.roleTitle,
    existingNotes: interaction.notes,
    feedbackItems: allFeedback.map(f => ({
      content: f.content,
      source: f.source ?? 'Unknown',
      date: f.attachedAt
    }))
  });

  console.log('[FEEDBACK] AI merged notes length:', result.mergedNotes?.length ?? 0);

  // Store AI extraction in feedback record
  await prisma.interactionFeedback.update({
    where: { id: feedbackRecord.id },
    data: {
      extractedData: {
        aiMergeResult: result
      }
    }
  });

  // Return interaction with AI suggestion (NOT saved yet - user must review)
  return {
    ...interaction,
    feedback: allFeedback,
    aiSuggestion: {
      notes: result.mergedNotes,
      // Keep other fields unchanged
      date: interaction.date,
      endDate: interaction.endDate,
      type: interaction.type,
      stage: interaction.stage,
      status: interaction.status,
      personName: interaction.personName,
      personRole: interaction.personRole,
      agenda: interaction.agenda,
      meetingLink: interaction.meetingLink,
      outcome: interaction.outcome,
      followUp: interaction.followUp,
    }
  };
}

/**
 * List all feedback for an interaction
 */
export async function listInteractionFeedback(params: {
  auth0Email: string;
  interactionId: string;
}) {
  const { auth0Email, interactionId } = params;

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

  return prisma.interactionFeedback.findMany({
    where: { interactionId },
    orderBy: { attachedAt: 'desc' }
  });
}
