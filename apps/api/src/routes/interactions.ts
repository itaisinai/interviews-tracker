import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  createInteractionHandler,
  deleteInteractionHandler,
  listInteractionsHandler,
  updateInteractionHandler
} from "../controllers/interactions-controller.js";
import {
  attachEmailToInteraction,
  removeEmailFromInteraction,
  listInteractionEmails
} from "../services/interactions/interaction-email-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const interactionsRouter = Router();

interactionsRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listInteractionsHandler(request as AuthenticatedRequest));
}));

interactionsRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createInteractionHandler(request as AuthenticatedRequest));
}));

interactionsRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await updateInteractionHandler(request as AuthenticatedRequest));
}));

interactionsRouter.delete("/:id", asyncHandler(async (request, response) => {
  await deleteInteractionHandler(request as AuthenticatedRequest);
  response.status(204).end();
}));

// Get all emails attached to an interaction
interactionsRouter.get("/:id/emails", asyncHandler(async (request, response) => {
  const { id } = request.params;
  const emails = await listInteractionEmails(id);
  response.json(emails);
}));

// Attach a Gmail message to an interaction
interactionsRouter.post("/:id/emails", asyncHandler(async (request, response) => {
  const { id: interactionId } = request.params;
  const { gmailMessageId } = request.body;
  const auth0Email = (request as AuthenticatedRequest).auth.email;

  const result = await attachEmailToInteraction({
    auth0Email,
    interactionId,
    gmailMessageId
  });

  response.status(result.alreadyAttached ? 200 : 201).json(result.email);
}));

// Remove an email attachment from an interaction
interactionsRouter.delete("/:id/emails/:emailId", asyncHandler(async (request, response) => {
  const { id: interactionId, emailId } = request.params;

  await removeEmailFromInteraction({ interactionId, emailId });

  response.status(204).end();
}));
