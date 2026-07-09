import type { z } from "zod";

import { logger } from "../../lib/logger.js";
import type { interactionInputSchema } from "../../lib/schemas.js";
import { promoteOverdueInteractionStatusForRead } from "../../repositories/interaction-read-normalizer.js";
import {
  createInteractionRecord,
  deleteInteractionRecord,
  listInteractionRecords,
  updateInteractionRecord,
} from "../../repositories/interaction-repository.js";
import { syncOpportunityStatusRecord } from "../../repositories/opportunity-repository.js";
import { unmarkUsedGmailMessageState } from "../gmail/gmail-service.js";

type InteractionInput = z.infer<typeof interactionInputSchema>;

export function listInteractions(ownerEmail: string) {
  return listInteractionRecords(ownerEmail);
}

export async function createInteraction(input: InteractionInput & { jobOpportunityId: string }, ownerEmail: string) {
  const interaction = await createInteractionRecord(input, ownerEmail);
  logger.operational("interaction_added", { opportunityId: input.jobOpportunityId, interactionId: interaction.id });
  await syncOpportunityStatusRecord(input.jobOpportunityId, ownerEmail);
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function updateInteraction(id: string, input: InteractionInput, ownerEmail: string) {
  const interaction = await updateInteractionRecord(id, input, ownerEmail);
  await syncOpportunityStatusRecord(interaction.jobOpportunityId, ownerEmail);
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function deleteInteraction(id: string, ownerEmail: string, input?: { auth0Email?: string | null }) {
  const interaction = await deleteInteractionRecord(id, ownerEmail);
  if (interaction.gmailMessageId && input?.auth0Email) {
    await unmarkUsedGmailMessageState({
      auth0Email: input.auth0Email,
      messageId: interaction.gmailMessageId,
      jobOpportunityId: interaction.jobOpportunityId,
    });
  }
  logger.operational("interaction_deleted", {
    opportunityId: interaction.jobOpportunityId,
    interactionId: interaction.id,
  });
  await syncOpportunityStatusRecord(interaction.jobOpportunityId, ownerEmail);
  return interaction;
}
