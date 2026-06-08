import type { opportunityInputSchema } from "../../lib/schemas.js";
import type { z } from "zod";
import {
  createOpportunityRecord,
  deleteOpportunityRecord,
  getOpportunityRecord,
  listOpportunityRecords,
  updateOpportunityRecord
} from "../../repositories/opportunity-repository.js";

type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export function listOpportunities(query: Record<string, string | undefined>) {
  return listOpportunityRecords(query);
}

export function getOpportunity(id: string) {
  return getOpportunityRecord(id);
}

export function createOpportunity(input: OpportunityInput) {
  return createOpportunityRecord(input);
}

export function updateOpportunity(id: string, input: OpportunityInput) {
  return updateOpportunityRecord(id, input);
}

export function deleteOpportunity(id: string) {
  return deleteOpportunityRecord(id);
}
