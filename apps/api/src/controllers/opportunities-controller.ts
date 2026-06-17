import { createOpportunity, deleteOpportunity, getOpportunity, listOpportunities, updateOpportunity } from "../services/opportunities/opportunity-service.js";
import { createOpportunityNoteRecord, createOpportunityTaskRecord, getOpportunityRecord, getOpportunitySummaryRecord, listOpportunityInteractionsRecord } from "../repositories/opportunity-repository.js";
import { hideGmailMessage, listTrackedGmailMessages, parseGmailEmailToInteraction, restoreHiddenGmailMessage, searchGmailMessages, unmarkUsedGmailMessageState } from "../services/gmail/gmail-service.js";
import { interactionInputSchema, noteInputSchema, opportunityInputSchema, taskInputSchema } from "../lib/schemas.js";

import type { Request } from "express";
import { createInteraction as createInteractionRecord } from "../services/interactions/interaction-service.js";
import { createTimer } from "../lib/logger.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";
import { z } from "zod";

type AuthenticatedRequest = Request & { auth: { email: string } };

export function listOpportunitiesHandler(request: AuthenticatedRequest) {
  return listOpportunities(request.query as Record<string, string | undefined>, request.auth.email);
}

export function createOpportunityHandler(request: AuthenticatedRequest) {
  return createOpportunity(opportunityInputSchema.parse(request.body), request.auth.email);
}

export function getOpportunityHandler(request: AuthenticatedRequest) {
  return getOpportunity(request.params.slugOrId, request.auth.email);
}

export function updateOpportunityHandler(request: AuthenticatedRequest) {
  return updateOpportunity(request.params.slugOrId, opportunityInputSchema.parse(request.body), request.auth.email);
}

export function deleteOpportunityHandler(request: AuthenticatedRequest) {
  return deleteOpportunity(request.params.slugOrId, request.auth.email);
}

export function listOpportunityInteractionsHandler(request: AuthenticatedRequest) {
  return listOpportunityInteractionsRecord(request.params.slugOrId, request.auth.email);
}

export async function createOpportunityInteractionHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);
  if (!opportunity) return null;
  const input = interactionInputSchema.parse(request.body);
  return createInteractionRecord({ ...input, jobOpportunityId: opportunity.id }, request.auth.email);
}

export async function createOpportunityNoteHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);
  if (!opportunity) return null;
  const body = request.body as Record<string, unknown>;
  const input = noteInputSchema.parse({ ...body, jobOpportunityId: opportunity.id });
  return createOpportunityNoteRecord(opportunity.id, input, request.auth.email);
}

export async function createOpportunityTaskHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);
  if (!opportunity) return null;
  const body = request.body as Record<string, unknown>;
  const input = taskInputSchema.parse({ ...body, jobOpportunityId: opportunity.id });
  return createOpportunityTaskRecord(opportunity.id, input, request.auth.email);
}

export async function searchOpportunityGmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const timer = createTimer("gmail", "search opportunity emails", { company: opportunity.companyName });
  const result = await searchGmailMessages({
    auth0Email: request.auth.email,
    jobOpportunityId: opportunity.id,
    companyName: opportunity.companyName,
    companySearchName: opportunity.companySearchName,
    roleTitle: opportunity.roleTitle,
    companyDomains: opportunity.domains.map((item) => item.domain.label)
  });
  timer.end({ candidates: result.candidates.length });
  return result;
}

export async function listTrackedOpportunityGmailMessagesHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  return listTrackedGmailMessages({
    auth0Email: request.auth.email,
    jobOpportunityId: opportunity.id
  });
}

export async function parseOpportunityGmailEmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.body);
  const timer = createTimer("gmail", "parse opportunity email", { company: opportunity.companyName, messageId });
  const result = await parseGmailEmailToInteraction({
    auth0Email: request.auth.email,
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle,
    messageId,
    jobOpportunityId: opportunity.id
  });
  timer.end({ company: opportunity.companyName });
  return result;
}

export async function hideOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await hideGmailMessage({
    auth0Email: request.auth.email,
    messageId,
    jobOpportunityId: opportunity.id
  });

  return { ok: true };
}

export async function restoreOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await restoreHiddenGmailMessage({
    auth0Email: request.auth.email,
    messageId,
    jobOpportunityId: opportunity.id
  });

  return { ok: true };
}

export async function unpickOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await unmarkUsedGmailMessageState({
    auth0Email: request.auth.email,
    messageId,
    jobOpportunityId: opportunity.id
  });

  return { ok: true };
}

export async function parseOpportunityInteractionTextHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunityRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { text } = z.object({ text: z.string().min(20) }).parse(request.body);
  const timer = createTimer("ai", "parse opportunity interaction text", {
    company: opportunity.companyName,
    role: opportunity.roleTitle
  });
  const result = await getAiParserService().parseInteractionText({
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle,
    opportunityContext: `Status: ${opportunity.status} · Pipeline: ${opportunity.pipelineType} · Next step: ${opportunity.nextStep ?? "None"}${opportunity.notes ? ` · Notes: ${opportunity.notes}` : ""}`,
    text,
    nowIso: new Date().toISOString()
  });
  timer.end({ company: opportunity.companyName });
  return { interaction: result };
}
