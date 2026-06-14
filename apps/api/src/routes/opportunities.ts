import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  createOpportunityHandler,
  createOpportunityInteractionHandler,
  createOpportunityNoteHandler,
  createOpportunityTaskHandler,
  deleteOpportunityHandler,
  getOpportunityHandler,
  listOpportunityInteractionsHandler,
  listOpportunitiesHandler,
  listTrackedOpportunityGmailMessagesHandler,
  parseOpportunityInteractionTextHandler,
  parseOpportunityGmailEmailHandler,
  restoreOpportunityGmailMessageHandler,
  searchOpportunityGmailHandler,
  hideOpportunityGmailMessageHandler,
  updateOpportunityHandler
} from "../controllers/opportunities-controller.js";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listOpportunitiesHandler(request));
}));

opportunitiesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityHandler(request));
}));

opportunitiesRouter.get("/:id", asyncHandler(async (request, response) => {
  response.json(await getOpportunityHandler(request));
}));

opportunitiesRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await updateOpportunityHandler(request));
}));

opportunitiesRouter.delete("/:id", asyncHandler(async (request, response) => {
  await deleteOpportunityHandler(request);
  response.status(204).end();
}));

opportunitiesRouter.get("/:id/interactions", asyncHandler(async (request, response) => {
  response.json(await listOpportunityInteractionsHandler(request));
}));

opportunitiesRouter.post("/:id/interactions", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityInteractionHandler(request));
}));

opportunitiesRouter.post("/:id/notes", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityNoteHandler(request));
}));

opportunitiesRouter.post("/:id/tasks", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityTaskHandler(request));
}));

opportunitiesRouter.get("/:id/gmail/search", asyncHandler(async (request, response) => {
  const result = await searchOpportunityGmailHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.get("/:id/gmail/message-states", asyncHandler(async (request, response) => {
  const result = await listTrackedOpportunityGmailMessagesHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:id/gmail/parse-email", asyncHandler(async (request, response) => {
  const result = await parseOpportunityGmailEmailHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:id/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await hideOpportunityGmailMessageHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.delete("/:id/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await restoreOpportunityGmailMessageHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.post("/:id/interactions/parse-text", asyncHandler(async (request, response) => {
  const result = await parseOpportunityInteractionTextHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));
