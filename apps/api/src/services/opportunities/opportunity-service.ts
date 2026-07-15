import type { z } from "zod";

import { logger } from "../../lib/logger.js";
import type { opportunityInputSchema } from "../../lib/schemas.js";
import { findOrCreateCompanyByName } from "../../repositories/company-repository.js";
import {
  createOpportunityRecord,
  deleteOpportunityRecord,
  getOpportunityRecord,
  listOpportunityRecords,
  listOpportunityRecordsLightweight,
  updateOpportunityRecord,
} from "../../repositories/opportunity-repository.js";

type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export function listOpportunities(query: Record<string, string | undefined>, ownerEmail: string) {
  return listOpportunityRecords(query, ownerEmail);
}

export function listOpportunitiesLightweight(ownerEmail: string) {
  return listOpportunityRecordsLightweight(ownerEmail);
}

export function getOpportunity(id: string, ownerEmail: string) {
  return getOpportunityRecord(id, ownerEmail);
}

export async function createOpportunity(
  input: OpportunityInput & {
    location?: string | null;
    funding?: string | null;
    employeesRangeId?: string | null;
    companyStageId?: string | null;
    companyDescription?: string | null;
    productDescription?: string | null;
    customersTraction?: string | null;
    techStack?: string | null;
    backendFrontendSplit?: string | null;
  },
  ownerEmail: string
) {
  // Resolve companyId: use provided companyId, or create/find company by name
  let companyId: string;

  if (input.companyId) {
    companyId = input.companyId;
    logger.operational("create_opportunity_called", { source: "api", companyId });
  } else if (input.companyName) {
    // Auto-create or find company by name for backward compatibility
    companyId = await findOrCreateCompanyByName(input.companyName, ownerEmail);
    logger.operational("create_opportunity_called", {
      source: "api",
      companyName: input.companyName,
      autoCreatedCompanyId: companyId,
    });
  } else {
    throw new Error("Either companyId or companyName must be provided");
  }

  // Enrich company with parsed data if provided
  const {
    location,
    funding,
    employeesRangeId,
    companyStageId,
    companyDescription,
    productDescription,
    customersTraction,
    techStack,
    backendFrontendSplit,
    ...opportunityInput
  } = input;

  if (
    location ||
    funding ||
    employeesRangeId ||
    companyStageId ||
    companyDescription ||
    productDescription ||
    customersTraction ||
    techStack ||
    backendFrontendSplit
  ) {
    const { updateCompanyRecord } = await import("../../repositories/company-repository.js");
    await updateCompanyRecord(
      companyId,
      {
        location,
        funding,
        employeesRangeId,
        companyStageId,
        description: companyDescription,
        productDescription,
        customersTraction,
        techStack,
        backendFrontendSplit,
      },
      ownerEmail
    );
    logger.operational("company_enriched_from_opportunity_creation", { companyId });
  }

  logger.operational("create_opportunity_started", { companyId });
  const opportunity = await createOpportunityRecord(opportunityInput, ownerEmail, companyId);
  logger.operational("create_opportunity_completed", {
    opportunityId: opportunity.id,
    companyId,
    companyName: opportunity.company.name,
  });
  return opportunity;
}

export async function updateOpportunity(id: string, input: Partial<OpportunityInput>, ownerEmail: string) {
  // Handle company change if companyName provided (optional for partial updates)
  let companyId: string | undefined;

  if (input.companyName) {
    companyId = await findOrCreateCompanyByName(input.companyName, ownerEmail);
  } else if (input.companyId) {
    companyId = input.companyId;
  }

  const opportunity = await updateOpportunityRecord(id, input, ownerEmail, companyId);
  logger.operational("opportunity_updated", {
    opportunityId: id,
    companyId: opportunity.company.id,
    companyName: opportunity.company.name,
  });
  return opportunity;
}

export function deleteOpportunity(id: string, ownerEmail: string) {
  return deleteOpportunityRecord(id, ownerEmail);
}
