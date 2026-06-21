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
  attachMultipleEmailsToInteraction,
  removeEmailFromInteraction,
  listInteractionEmails,
  reparseInteractionEmails
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
  const auth0Email = (request as AuthenticatedRequest).auth.email;
  const emails = await listInteractionEmails(auth0Email, id);
  response.json(emails);
}));

// Attach Gmail message(s) to an interaction
interactionsRouter.post("/:id/emails", asyncHandler(async (request, response) => {
  const { id: interactionId } = request.params;
  const { gmailMessageId, gmailMessageIds } = request.body;
  const auth0Email = (request as AuthenticatedRequest).auth.email;

  // Support both single and batch attachment
  if (gmailMessageIds && Array.isArray(gmailMessageIds)) {
    const result = await attachMultipleEmailsToInteraction({
      auth0Email,
      interactionId,
      gmailMessageIds
    });
    response.status(201).json(result);
  } else if (gmailMessageId) {
    const result = await attachEmailToInteraction({
      auth0Email,
      interactionId,
      gmailMessageId
    });
    response.status(result.alreadyAttached ? 200 : 201).json(result.email);
  } else {
    response.status(400).json({ error: "gmailMessageId or gmailMessageIds required" });
  }
}));

// Remove an email attachment from an interaction
interactionsRouter.delete("/:id/emails/:emailId", asyncHandler(async (request, response) => {
  const { id: interactionId, emailId } = request.params;
  const auth0Email = (request as AuthenticatedRequest).auth.email;

  await removeEmailFromInteraction({ auth0Email, interactionId, emailId });

  response.status(204).end();
}));

// Re-parse and re-aggregate all attached emails
interactionsRouter.post("/:id/reparse", asyncHandler(async (request, response) => {
  const { id: interactionId } = request.params;
  const auth0Email = (request as AuthenticatedRequest).auth.email;

  const updatedInteraction = await reparseInteractionEmails(auth0Email, interactionId);

  response.json(updatedInteraction);
}));
