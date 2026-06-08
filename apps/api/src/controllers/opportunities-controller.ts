import type { Request } from "express";
import { z } from "zod";
import { createTimer } from "../lib/logger.js";
import { interactionInputSchema, noteInputSchema, taskInputSchema, opportunityInputSchema } from "../lib/schemas.js";
import { getOpportunitySummaryRecord, listOpportunityInteractionsRecord, createOpportunityInteractionRecord, createOpportunityNoteRecord, createOpportunityTaskRecord } from "../repositories/opportunity-repository.js";
import { createOpportunity, deleteOpportunity, getOpportunity, listOpportunities, updateOpportunity } from "../services/opportunities/opportunity-service.js";
import { parseGmailEmailToInteraction, searchGmailMessages } from "../services/gmail/gmail-service.js";

type AuthenticatedRequest = Request & { auth?: { email?: string | null } };

export function listOpportunitiesHandler(request: Request) {
  return listOpportunities(request.query as Record<string, string | undefined>);
}

export function createOpportunityHandler(request: Request) {
  return createOpportunity(opportunityInputSchema.parse(request.body));
}

export function getOpportunityHandler(request: Request) {
  return getOpportunity(request.params.id);
}

export function updateOpportunityHandler(request: Request) {
  return updateOpportunity(request.params.id, opportunityInputSchema.parse(request.body));
}

export function deleteOpportunityHandler(request: Request) {
  return deleteOpportunity(request.params.id);
}

export function listOpportunityInteractionsHandler(request: Request) {
  return listOpportunityInteractionsRecord(request.params.id);
}

export function createOpportunityInteractionHandler(request: Request) {
  const input = interactionInputSchema.parse(request.body);
  return createOpportunityInteractionRecord(request.params.id, input);
}

export function createOpportunityNoteHandler(request: Request) {
  const body = request.body as Record<string, unknown>;
  const input = noteInputSchema.parse({ ...body, jobOpportunityId: request.params.id });
  return createOpportunityNoteRecord(request.params.id, input);
}

export function createOpportunityTaskHandler(request: Request) {
  const body = request.body as Record<string, unknown>;
  const input = taskInputSchema.parse({ ...body, jobOpportunityId: request.params.id });
  return createOpportunityTaskRecord(request.params.id, input);
}

export async function searchOpportunityGmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.id);

  if (!opportunity) {
    return null;
  }

  const timer = createTimer("gmail", "search opportunity emails", { company: opportunity.companyName });
  const result = await searchGmailMessages({
    auth0Email: request.auth?.email ?? "",
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle
  });
  timer.end({ candidates: result.candidates.length });
  return result;
}

export async function parseOpportunityGmailEmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.id);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.body);
  const timer = createTimer("gmail", "parse opportunity email", { company: opportunity.companyName, messageId });
  const result = await parseGmailEmailToInteraction({
    auth0Email: request.auth?.email ?? "",
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle,
    messageId
  });
  timer.end({ company: opportunity.companyName });
  return result;
}
