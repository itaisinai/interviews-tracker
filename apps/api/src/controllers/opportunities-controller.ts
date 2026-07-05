import { createOpportunity, deleteOpportunity, getOpportunity, listOpportunities, updateOpportunity } from "../services/opportunities/opportunity-service.js";
import { getOpportunityRecord, getOpportunitySummaryRecord, listOpportunityInteractionsRecord } from "../repositories/opportunity-repository.js";
import { hideGmailMessage, ignoreGmailMessage, listTrackedGmailMessages, parseGmailEmailToInteraction, restoreHiddenGmailMessage, searchGmailMessages, syncAttachedGmailInteractionData, unignoreGmailMessage, unmarkUsedGmailMessageState } from "../services/gmail/gmail-service.js";
import { interactionInputSchema, opportunityInputSchema } from "../lib/schemas.js";

import type { Request } from "express";
import { createInteraction as createInteractionRecord } from "../services/interactions/interaction-service.js";
import { attachEmailToInteraction } from "../services/interactions/interaction-email-service.js";
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

  // Support both single messageId and array of messageIds
  const body = z.union([
    z.object({ messageId: z.string().min(1) }),
    z.object({ messageIds: z.array(z.string().min(1)).min(1) })
  ]).parse(request.body);

  const messageIds = 'messageIds' in body ? body.messageIds : [body.messageId];

  const timer = createTimer("gmail", "parse opportunity email", {
    company: opportunity.companyName,
    messageIds: messageIds.join(","),
    count: messageIds.length
  });

  // Parse all emails and merge their data
  const parsedResults = await Promise.all(
    messageIds.map(messageId =>
      parseGmailEmailToInteraction({
        auth0Email: request.auth.email,
        companyName: opportunity.companyName,
        roleTitle: opportunity.roleTitle,
        messageId,
        jobOpportunityId: opportunity.id
      })
    )
  );

  // If only one email, return it with the message ID list
  if (parsedResults.length === 1) {
    timer.end({ company: opportunity.companyName, count: 1 });
    return {
      ...parsedResults[0],
      allGmailMessageIds: messageIds
    };
  }

  // Merge the parsed interactions into one
  // Strategy: take the most complete data from all emails
  // Collect all Gmail message IDs from all parsed results
  const allGmailMessageIds = parsedResults
    .map(r => r.interaction.gmailMessageId)
    .filter(Boolean) as string[];

  const mergedInteraction = parsedResults.reduce((merged, current) => {
    // Merge personName lists (comma-separated)
    const mergedPersonNames = new Set([
      ...(merged.interaction.personName?.split(',').map(n => n.trim()) || []),
      ...(current.interaction.personName?.split(',').map(n => n.trim()) || [])
    ].filter(Boolean));

    // Merge personRole lists (comma-separated)
    const mergedPersonRoles = new Set([
      ...(merged.interaction.personRole?.split(',').map(r => r.trim()) || []),
      ...(current.interaction.personRole?.split(',').map(r => r.trim()) || [])
    ].filter(Boolean));

    return {
      interaction: {
        ...merged.interaction,
        // Keep the earliest date or first non-null date
        date: merged.interaction.date || current.interaction.date,
        // Keep the latest endDate or first non-null endDate
        endDate: merged.interaction.endDate || current.interaction.endDate,
        // Prefer non-null/non-empty values
        type: merged.interaction.type || current.interaction.type,
        stage: merged.interaction.stage || current.interaction.stage,
        status: merged.interaction.status || current.interaction.status,
        // Merge all participant names
        personName: mergedPersonNames.size > 0 ? Array.from(mergedPersonNames).join(', ') : null,
        // Merge all participant roles
        personRole: mergedPersonRoles.size > 0 ? Array.from(mergedPersonRoles).join(', ') : null,
        meetingLink: merged.interaction.meetingLink || current.interaction.meetingLink,
        // Concatenate notes/agendas if both exist
        notes: [merged.interaction.notes, current.interaction.notes]
          .filter(Boolean)
          .join("\n\n") || null,
        agenda: [merged.interaction.agenda, current.interaction.agenda]
          .filter(Boolean)
          .join("\n\n") || null,
        // Keep first non-null outcome/followUp
        outcome: merged.interaction.outcome || current.interaction.outcome,
        followUp: merged.interaction.followUp || current.interaction.followUp,
        // Use the first Gmail message ID (primary)
        gmailMessageId: allGmailMessageIds[0] || null
      },
      // Also pass through the email metadata from the first result
      email: merged.email || current.email,
      analysis: merged.analysis || current.analysis
    };
  });

  timer.end({ company: opportunity.companyName, count: messageIds.length });

  // Return the merged interaction along with the list of all message IDs
  return {
    ...mergedInteraction,
    allGmailMessageIds: messageIds
  };
}

export async function syncOpportunityAttachedGmailDataHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const result = await syncAttachedGmailInteractionData({
    auth0Email: request.auth?.email ?? "",
    jobOpportunityId: opportunity.id
  });
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

export async function ignoreOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await ignoreGmailMessage({
    auth0Email: request.auth.email,
    messageId,
    jobOpportunityId: opportunity.id
  });

  return { ok: true };
}

export async function unignoreOpportunityGmailMessageHandler(request: AuthenticatedRequest) {
  const opportunity = await getOpportunitySummaryRecord(request.params.slugOrId, request.auth.email);

  if (!opportunity) {
    return null;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.params);
  await unignoreGmailMessage({
    auth0Email: request.auth.email,
    messageId
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
