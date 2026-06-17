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
  parseOpportunityInteractionTextHandler,
  restoreOpportunityGmailMessageHandler,
  searchOpportunityGmailHandler,
  unpickOpportunityGmailMessageHandler,
  updateOpportunityHandler
} from "../controllers/opportunities-controller.js";

import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listOpportunitiesHandler(request));
}));

opportunitiesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunityHandler(request));
}));

opportunitiesRouter.get("/:slugOrId", asyncHandler(async (request, response) => {
  response.json(await getOpportunityHandler(request));
}));

opportunitiesRouter.put("/:slugOrId", asyncHandler(async (request, response) => {
  response.json(await updateOpportunityHandler(request));
}));

opportunitiesRouter.delete("/:slugOrId", asyncHandler(async (request, response) => {
  await deleteOpportunityHandler(request);
  response.status(204).end();
}));

opportunitiesRouter.get("/:slugOrId/interactions", asyncHandler(async (request, response) => {
  response.json(await listOpportunityInteractionsHandler(request));
}));

opportunitiesRouter.post("/:slugOrId/interactions", asyncHandler(async (request, response) => {
  const result = await createOpportunityInteractionHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.post("/:slugOrId/notes", asyncHandler(async (request, response) => {
  const result = await createOpportunityNoteHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.post("/:slugOrId/tasks", asyncHandler(async (request, response) => {
  const result = await createOpportunityTaskHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(201).json(result);
}));

opportunitiesRouter.get("/:slugOrId/gmail/search", asyncHandler(async (request, response) => {
  const result = await searchOpportunityGmailHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.get("/:slugOrId/gmail/message-states", asyncHandler(async (request, response) => {
  const result = await listTrackedOpportunityGmailMessagesHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:slugOrId/gmail/parse-email", asyncHandler(async (request, response) => {
  const result = await parseOpportunityGmailEmailHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.post("/:slugOrId/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await hideOpportunityGmailMessageHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.delete("/:slugOrId/gmail/messages/:messageId/hide", asyncHandler(async (request, response) => {
  const result = await restoreOpportunityGmailMessageHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

opportunitiesRouter.post("/:slugOrId/interactions/parse-text", asyncHandler(async (request, response) => {
  const result = await parseOpportunityInteractionTextHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.json(result);
}));

opportunitiesRouter.delete("/:slugOrId/gmail/messages/:messageId/used", asyncHandler(async (request, response) => {
  const result = await unpickOpportunityGmailMessageHandler(request);
  if (!result) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  response.status(204).end();
}));

// Get opportunity contacts
opportunitiesRouter.get("/:slugOrId/contacts", asyncHandler(async (request, response) => {
  const { slugOrId } = request.params;

  console.log("Getting contacts for opportunity:", slugOrId);

  const opportunity = await prisma.jobOpportunity.findFirst({
    where: {
      OR: [
        { id: slugOrId },
        { slug: slugOrId }
      ]
    }
  });

  if (!opportunity) {
    console.log("Opportunity not found");
    response.status(404).json({ error: "Opportunity not found" });
    return;
  }

  console.log("Found opportunity:", opportunity.id, opportunity.companyName);

  const contacts = await prisma.person.findMany({
    where: { jobOpportunityId: opportunity.id },
    include: { research: true },
    orderBy: { updatedAt: "desc" }
  });

  console.log("Found", contacts.length, "contacts");

  response.json(contacts);
}));
