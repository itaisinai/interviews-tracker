import { getAiParserService } from "../ai/ai-parser-service.js";
import { prisma } from "../../lib/prisma.js";
import { resolveInteractionId } from "../../repositories/interaction-repository.js";

/**
 * Add feedback to an interaction and smart-merge with existing notes
 */
export async function addFeedbackToInteraction(params: {
  auth0Email: string;
  interactionId: string;
  feedbackContent: string;
  source?: string;
}) {
  const { auth0Email, interactionId: interactionSlugOrId, feedbackContent, source = "Manual" } = params;
  const interactionId = await resolveInteractionId(interactionSlugOrId, auth0Email);
  if (!interactionId) {
    throw new Error(`Interaction ${interactionSlugOrId} not found`);
  }

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

  // Get persisted feedback for this interaction before adding the new item.
  const existingFeedback = await prisma.interactionFeedback.findMany({
    where: { interactionId },
    orderBy: { attachedAt: 'asc' }
  });

  console.log('[FEEDBACK] Existing feedback count:', existingFeedback.length);

  const pendingFeedbackAttachedAt = new Date();
  const feedbackItems = [
    ...existingFeedback.map(f => ({
      content: f.content,
      source: f.source ?? 'Unknown',
      date: f.attachedAt
    })),
    {
      content: feedbackContent,
      source: source ?? 'Unknown',
      date: pendingFeedbackAttachedAt
    }
  ];

  // Call AI to smart-merge existing notes + persisted feedback + the new feedback.
  // The new feedback is only saved after this succeeds, so failed merge attempts
  // cannot leave duplicate or failed feedback rows behind.
  const aiParser = getAiParserService();
  const result = await aiParser.smartMergeFeedback({
    companyName: interaction.jobOpportunity.companyName,
    roleTitle: interaction.jobOpportunity.roleTitle,
    existingNotes: interaction.notes,
    feedbackItems
  });

  console.log('[FEEDBACK] AI merged notes length:', result.mergedNotes?.length ?? 0);

  // Save feedback record only after the merge succeeds.
  const feedbackRecord = await prisma.interactionFeedback.create({
    data: {
      interactionId,
      content: feedbackContent,
      source,
      extractedData: {
        aiMergeResult: result
      }
    }
  });

  console.log('[FEEDBACK] Saved feedback record:', feedbackRecord.id);

  const allFeedback = [...existingFeedback, feedbackRecord];

  console.log('[FEEDBACK] AI suggestions:', {
    suggestedStatus: result.suggestedStatus,
    suggestedOutcome: result.suggestedOutcome ? 'present' : 'null'
  });

  // Return interaction with AI suggestion (NOT saved yet - user must review)
  return {
    ...interaction,
    feedback: allFeedback,
    aiSuggestion: {
      notes: result.mergedNotes,
      // Use AI-suggested status and outcome if provided, otherwise keep unchanged
      status: result.suggestedStatus || interaction.status,
      outcome: result.suggestedOutcome || interaction.outcome,
      // Keep other fields unchanged
      date: interaction.date,
      endDate: interaction.endDate,
      type: interaction.type,
      stage: interaction.stage,
      personName: interaction.personName,
      personRole: interaction.personRole,
      agenda: interaction.agenda,
      meetingLink: interaction.meetingLink,
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
  const { auth0Email, interactionId: interactionSlugOrId } = params;
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

  return prisma.interactionFeedback.findMany({
    where: { interactionId },
    orderBy: { attachedAt: 'desc' }
  });
}
