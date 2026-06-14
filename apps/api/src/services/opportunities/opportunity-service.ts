import type { opportunityInputSchema } from "../../lib/schemas.js";
import type { z } from "zod";
import { logger } from "../../lib/logger.js";
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

export async function createOpportunity(input: OpportunityInput) {
  logger.operational("create_opportunity_called", { source: "api", company: input.companyName });
  logger.operational("create_opportunity_started", { company: input.companyName });
  const opportunity = await createOpportunityRecord(input);
  logger.operational("create_opportunity_completed", { opportunityId: opportunity.id, company: opportunity.companyName });
  return opportunity;
}

export async function updateOpportunity(id: string, input: OpportunityInput) {
  const opportunity = await updateOpportunityRecord(id, input);
  logger.operational("opportunity_updated", { opportunityId: id, company: opportunity.companyName });
  return opportunity;
}

export function deleteOpportunity(id: string) {
  return deleteOpportunityRecord(id);
}
