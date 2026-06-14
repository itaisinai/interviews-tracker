import type { Request } from "express";
import { z } from "zod";
import { createTimer } from "../lib/logger.js";
import { interactionInputSchema, noteInputSchema, taskInputSchema, opportunityInputSchema } from "../lib/schemas.js";
import { getOpportunityRecord, getOpportunitySummaryRecord, listOpportunityInteractionsRecord, createOpportunityNoteRecord, createOpportunityTaskRecord } from "../repositories/opportunity-repository.js";
import { createOpportunity, deleteOpportunity, getOpportunity, listOpportunities, updateOpportunity } from "../services/opportunities/opportunity-service.js";
import { createInteraction as createInteractionRecord } from "../services/interactions/interaction-service.js";
import { hideGmailMessage, listTrackedGmailMessages, parseGmailEmailToInteraction, restoreHiddenGmailMessage, searchGmailMessages } from "../services/gmail/gmail-service.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";

type AuthenticatedRequest = Request & { auth?: { email?: string | null } };

export function listOpportunitiesHandler(request: Request) {
  return listOpportunities(request.query as Record<string, string | undefined>);
}

export function createOpportunityHandler(request: Request) {
  return createOpportunity(opportunityInputSchema.parse(request.body));
}

export function getOpportunityHandler(request: Request) {
  return getOpportunity(request.params.slugOrId);
}

export function updateOpportunityHandler(request: Request) {
  return updateOpportunity(request.params.slugOrId, opportunityInputSchema.parse(request.body));
}

export function deleteOpportunityHandler(request: Request) {
  return deleteOpportunity(request.params.slugOrId);
}

export function listOpportunityInteractionsHandler(request: Request) {
  return listOpportunityInteractionsRecord(request.params.slugOrId);
}

export async function createOpportunityInteractionHandler(request: Request) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);
  if (!opportunity) return null;
  const input = interactionInputSchema.parse(request.body);
  return createInteractionRecord({ ...input, jobOpportunityId: opportunity.id });
}

export async function createOpportunityNoteHandler(request: Request) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);
  if (!opportunity) return null;
  const body = request.body as Record<string, unknown>;
  const input = noteInputSchema.parse({ ...body, jobOpportunityId: opportunity.id });
  return createOpportunityNoteRecord(opportunity.id, input);
}

export async function createOpportunityTaskHandler(request: Request) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);
  if (!opportunity) return null;
  const body = request.body as Record<string, unknown>;
  const input = taskInputSchema.parse({ ...body, jobOpportunityId: opportunity.id });
  return createOpportunityTaskRecord(opportunity.id, input);
}

export async function searchOpportunityGmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);

  if (!opportunity) {
    return null;
  }

  const timer = createTimer("gmail", "search opportunity emails", { company: opportunity.companyName });
  const result = await searchGmailMessages({
    auth0Email: request.auth?.email ?? "",
    jobOpportunityId: opportunity.id,
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle
  });
  timer.end({ candidates: result.candidates.length });
  return result;
}

export async function listTrackedOpportunityGmailMessagesHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);

  if (!opportunity) {
    return null;
  }

  return listTrackedGmailMessages({
    auth0Email: request.auth?.email ?? "",
    jobOpportunityId: opportunity.id
  });
}

export async function parseOpportunityGmailEmailHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.body);
  const timer = createTimer("gmail", "parse opportunity email", { company: opportunity.companyName, messageId });
  const result = await parseGmailEmailToInteraction({
    auth0Email: request.auth?.email ?? "",
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle,
    messageId,
    jobOpportunityId: opportunity.id
  });
  timer.end({ company: opportunity.companyName });
  return result;
}

export async function hideOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await hideGmailMessage({
    auth0Email: request.auth?.email ?? "",
    messageId,
    jobOpportunityId: opportunity.id
  });

  return { ok: true };
}

export async function restoreOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await restoreHiddenGmailMessage({
    auth0Email: request.auth?.email ?? "",
    messageId
  });

  return { ok: true };
}

export async function parseOpportunityInteractionTextHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunityRecord(request.params.slugOrId);

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
