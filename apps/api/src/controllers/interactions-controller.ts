import type { Request } from "express";
import { z } from "zod";
import { interactionInputSchema } from "../lib/schemas.js";
import { createInteraction, deleteInteraction, listInteractions, updateInteraction } from "../services/interactions/interaction-service.js";
import { addFeedbackToInteraction, listInteractionFeedback } from "../services/interactions/interaction-feedback-service.js";
import { resolveOpportunitySlug } from "../lib/slug-resolver.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export function listInteractionsHandler(request: AuthenticatedRequest) {
  return listInteractions(request.auth.email);
}

export async function createInteractionHandler(request: AuthenticatedRequest) {
  // Accept either opportunitySlug (preferred) or jobOpportunityId (deprecated)
  const inputSchema = interactionInputSchema.and(z.object({
    opportunitySlug: z.string().min(1).optional(),
    jobOpportunityId: z.string().min(1).optional()
  })).refine(
    (data) => data.opportunitySlug || data.jobOpportunityId,
    { message: "Either opportunitySlug or jobOpportunityId is required" }
  );

  const { opportunitySlug, jobOpportunityId: providedId, ...input } = inputSchema.parse(request.body);

  // Resolve slug to ID if slug provided, otherwise use provided ID
  const jobOpportunityId = opportunitySlug
    ? await resolveOpportunitySlug(opportunitySlug, request.auth.email)
    : providedId!;

  return createInteraction({ ...input, jobOpportunityId }, request.auth.email);
}

export function updateInteractionHandler(request: AuthenticatedRequest) {
  const input = interactionInputSchema.parse(request.body);
  return updateInteraction(request.params.id, input, request.auth.email);
}

export function deleteInteractionHandler(request: AuthenticatedRequest) {
  return deleteInteraction(request.params.id, request.auth.email, { auth0Email: request.auth.email });
}

export function addFeedbackHandler(request: AuthenticatedRequest) {
  const input = z.object({
    content: z.string().min(1),
    source: z.string().optional()
  }).parse(request.body);

  return addFeedbackToInteraction({
    auth0Email: request.auth.email,
    interactionId: request.params.id,
    feedbackContent: input.content,
    source: input.source
  });
}

export function listFeedbackHandler(request: AuthenticatedRequest) {
  return listInteractionFeedback({
    auth0Email: request.auth.email,
    interactionId: request.params.id
  });
}
