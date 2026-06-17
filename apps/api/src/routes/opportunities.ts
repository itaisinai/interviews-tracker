import {
  createOpportunityHandler,
  createOpportunityInteractionHandler,
  createOpportunityNoteHandler,
  createOpportunityTaskHandler,
  deleteOpportunityHandler,
  getOpportunityHandler,
  hideOpportunityGmailMessageHandler,
  listOpportunitiesHandler,
  listOpportunityInteractionsHandler,
  listTrackedOpportunityGmailMessagesHandler,
  parseOpportunityGmailEmailHandler,
  syncOpportunityAttachedGmailDataHandler,
  parseOpportunityInteractionTextHandler,
  restoreOpportunityGmailMessageHandler,
  searchOpportunityGmailHandler,
  unpickOpportunityGmailMessageHandler,
  updateOpportunityHandler
} from "../controllers/opportunities-controller.js";

import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listOpportunitiesHandler(request as AuthenticatedRequest));
}));

opportunitiesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityHandler(request as AuthenticatedRequest));
}));

opportunitiesRouter.get("/:slugOrId", asyncHandler(async (request, response) => {
  response.json(await getOpportunityHandler(request as AuthenticatedRequest));
}));

opportunitiesRouter.put("/:slugOrId", asyncHandler(async (request, response) => {
  response.json(await updateOpportunityHandler(request as AuthenticatedRequest));
}));

opportunitiesRouter.delete("/:slugOrId", asyncHandler(async (request, response) => {
  await deleteOpportunityHandler(request as AuthenticatedRequest);
  response.status(204).end();
}));

opportunitiesRouter.get("/:slugOrId/interactions", asyncHandler(async (request, response) => {
  response.json(await listOpportunityInteractionsHandler(request as AuthenticatedRequest));
}));

opportunitiesRouter.post("/:slugOrId/interactions", asyncHandler(async (request, response) => {
  const result = await createOpportunityInteractionHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.post("/:slugOrId/notes", asyncHandler(async (request, response) => {
  const result = await createOpportunityNoteHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.post("/:slugOrId/tasks", asyncHandler(async (request, response) => {
  const result = await createOpportunityTaskHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.get("/:slugOrId/gmail/search", asyncHandler(async (request, response) => {
  const result = await searchOpportunityGmailHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.get("/:slugOrId/gmail/message-states", asyncHandler(async (request, response) => {
  const result = await listTrackedOpportunityGmailMessagesHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:slugOrId/gmail/parse-email", asyncHandler(async (request, response) => {
  const result = await parseOpportunityGmailEmailHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:slugOrId/gmail/sync-attached", asyncHandler(async (request, response) => {
  const result = await syncOpportunityAttachedGmailDataHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:slugOrId/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await hideOpportunityGmailMessageHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.delete("/:slugOrId/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await restoreOpportunityGmailMessageHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.post("/:slugOrId/interactions/parse-text", asyncHandler(async (request, response) => {
  const result = await parseOpportunityInteractionTextHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.delete("/:slugOrId/gmail/messages/:messageId/used", asyncHandler(async (request, response) => {
  const result = await unpickOpportunityGmailMessageHandler(request as AuthenticatedRequest);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));
