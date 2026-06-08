import type { interactionInputSchema } from "../../lib/schemas.js";
import type { z } from "zod";
import {
  createInteractionRecord,
  deleteInteractionRecord,
  listInteractionRecords,
  updateInteractionRecord
} from "../../repositories/interaction-repository.js";

type InteractionInput = z.infer<typeof interactionInputSchema>;

export function listInteractions() {
  return listInteractionRecords();
}

export function createInteraction(input: InteractionInput & { jobOpportunityId: string }) {
  return createInteractionRecord(input);
}

export function updateInteraction(id: string, input: InteractionInput) {
  return updateInteractionRecord(id, input);
}

export function deleteInteraction(id: string) {
  return deleteInteractionRecord(id);
}
