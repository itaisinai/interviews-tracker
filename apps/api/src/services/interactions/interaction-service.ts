import type { interactionInputSchema } from "../../lib/schemas.js";
import type { z } from "zod";
import {
  createInteractionRecord,
  deleteInteractionRecord,
  listInteractionRecords,
  updateInteractionRecord
} from "../../repositories/interaction-repository.js";
import { syncOpportunityStatusRecord } from "../../repositories/opportunity-repository.js";
import { promoteOverdueInteractionStatusForRead } from "../../repositories/interaction-read-normalizer.js";

type InteractionInput = z.infer<typeof interactionInputSchema>;

export function listInteractions() {
  return listInteractionRecords();
}

export async function createInteraction(input: InteractionInput & { jobOpportunityId: string }) {
  const interaction = await createInteractionRecord(input);
  await syncOpportunityStatusRecord(input.jobOpportunityId);
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function updateInteraction(id: string, input: InteractionInput) {
  const interaction = await updateInteractionRecord(id, input);
  await syncOpportunityStatusRecord(interaction.jobOpportunityId);
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function deleteInteraction(id: string) {
  const interaction = await deleteInteractionRecord(id);
  await syncOpportunityStatusRecord(interaction.jobOpportunityId);
  return interaction;
}
