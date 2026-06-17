import type { Request } from "express";
import { z } from "zod";
import { interactionInputSchema } from "../lib/schemas.js";
import { createInteraction, deleteInteraction, listInteractions, updateInteraction } from "../services/interactions/interaction-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export function listInteractionsHandler(request: AuthenticatedRequest) {
  return listInteractions(request.auth.email);
}

export function createInteractionHandler(request: AuthenticatedRequest) {
  const input = interactionInputSchema.extend({ jobOpportunityId: z.string().min(1) }).parse(request.body);
  return createInteraction(input, request.auth.email);
}

export function updateInteractionHandler(request: AuthenticatedRequest) {
  const input = interactionInputSchema.parse(request.body);
  return updateInteraction(request.params.id, input, request.auth.email);
}

export function deleteInteractionHandler(request: AuthenticatedRequest) {
  return deleteInteraction(request.params.id, request.auth.email, { auth0Email: request.auth.email });
}
