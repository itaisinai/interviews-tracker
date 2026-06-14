import type { Request } from "express";
import { z } from "zod";
import { interactionInputSchema } from "../lib/schemas.js";
import { createInteraction, deleteInteraction, listInteractions, updateInteraction } from "../services/interactions/interaction-service.js";

export function listInteractionsHandler(_request?: Request) {
  return listInteractions();
}

export function createInteractionHandler(request: Request) {
  const input = interactionInputSchema.extend({ jobOpportunityId: z.string().min(1) }).parse(request.body);
  return createInteraction(input);
}

export function updateInteractionHandler(request: Request) {
  const input = interactionInputSchema.parse(request.body);
  return updateInteraction(request.params.id, input);
}

export function deleteInteractionHandler(request: Request) {
  return deleteInteraction(request.params.id, { auth0Email: (request as Request & { auth?: { email?: string | null } }).auth?.email });
}
