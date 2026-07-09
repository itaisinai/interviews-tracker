import { type Request, Router } from "express";

import {
  createOpportunityHandler,
  createOpportunityInteractionHandler,
  deleteOpportunityHandler,
  getOpportunityHandler,
  hideOpportunityGmailMessageHandler,
  ignoreOpportunityGmailMessageHandler,
  listOpportunitiesHandler,
  listOpportunityInteractionsHandler,
  listTrackedOpportunityGmailMessagesHandler,
  parseOpportunityGmailEmailHandler,
  parseOpportunityInteractionTextHandler,
  restoreOpportunityGmailMessageHandler,
  searchOpportunityGmailHandler,
  syncOpportunityAttachedGmailDataHandler,
  unignoreOpportunityGmailMessageHandler,
  unpickOpportunityGmailMessageHandler,
  updateOpportunityHandler,
} from "../controllers/opportunities-controller.js";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  serializeInteraction,
  serializeInteractions,
  serializeOpportunities,
  serializeOpportunity,
  serializePerson,
} from "../lib/serializers.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const opportunitiesRouter = Router();

opportunitiesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const opportunities = await listOpportunitiesHandler(request as AuthenticatedRequest);
    response.json(serializeOpportunities(opportunities));
  })
);

opportunitiesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const opportunity = await createOpportunityHandler(request as AuthenticatedRequest);
    response.status(201).json(serializeOpportunity(opportunity));
  })
);

opportunitiesRouter.get(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    const opportunity = await getOpportunityHandler(request as AuthenticatedRequest);
    response.json(serializeOpportunity(opportunity));
  })
);

opportunitiesRouter.put(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    const opportunity = await updateOpportunityHandler(request as AuthenticatedRequest);
    response.json(serializeOpportunity(opportunity));
  })
);

opportunitiesRouter.delete(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    await deleteOpportunityHandler(request as AuthenticatedRequest);
    response.status(204).end();
  })
);

opportunitiesRouter.get(
  "/:slugOrId/interactions",
  asyncHandler(async (request, response) => {
    const interactions = await listOpportunityInteractionsHandler(request as AuthenticatedRequest);
    response.json(serializeInteractions(interactions));
  })
);

opportunitiesRouter.post(
  "/:slugOrId/interactions",
  asyncHandler(async (request, response) => {
    const result = await createOpportunityInteractionHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(201).json(result);
  })
);

opportunitiesRouter.get(
  "/:slugOrId/gmail/search",
  asyncHandler(async (request, response) => {
    const result = await searchOpportunityGmailHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.json(result);
  })
);

opportunitiesRouter.get(
  "/:slugOrId/gmail/message-states",
  asyncHandler(async (request, response) => {
    const result = await listTrackedOpportunityGmailMessagesHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.json(result);
  })
);

opportunitiesRouter.post(
  "/:slugOrId/gmail/parse-email",
  asyncHandler(async (request, response) => {
    const result = await parseOpportunityGmailEmailHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.json(result);
  })
);

opportunitiesRouter.post(
  "/:slugOrId/gmail/sync-attached",
  asyncHandler(async (request, response) => {
    const result = await syncOpportunityAttachedGmailDataHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.json(result);
  })
);

opportunitiesRouter.post(
  "/:slugOrId/gmail/messages/:messageId/hide",
  asyncHandler(async (request, response) => {
    const result = await hideOpportunityGmailMessageHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(204).end();
  })
);

opportunitiesRouter.delete(
  "/:slugOrId/gmail/messages/:messageId/hide",
  asyncHandler(async (request, response) => {
    const result = await restoreOpportunityGmailMessageHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(204).end();
  })
);

opportunitiesRouter.post(
  "/:slugOrId/interactions/parse-text",
  asyncHandler(async (request, response) => {
    const result = await parseOpportunityInteractionTextHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.json(result);
  })
);

opportunitiesRouter.delete(
  "/:slugOrId/gmail/messages/:messageId/used",
  asyncHandler(async (request, response) => {
    const result = await unpickOpportunityGmailMessageHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(204).end();
  })
);

opportunitiesRouter.post(
  "/:slugOrId/gmail/messages/:messageId/ignore",
  asyncHandler(async (request, response) => {
    const result = await ignoreOpportunityGmailMessageHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(204).end();
  })
);

opportunitiesRouter.delete(
  "/:slugOrId/gmail/messages/:messageId/ignore",
  asyncHandler(async (request, response) => {
    const result = await unignoreOpportunityGmailMessageHandler(request as AuthenticatedRequest);
    if (!result) {
      response.status(404).json({ message: "Opportunity not found" });
      return;
    }

    response.status(204).end();
  })
);

// Get opportunity contacts
opportunitiesRouter.get(
  "/:slugOrId/contacts",
  asyncHandler(async (request, response) => {
    const { slugOrId } = request.params;

    const opportunity = await prisma.jobOpportunity.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      include: { company: true },
    });

    if (!opportunity) {
      response.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const contacts = await prisma.person.findMany({
      where: { companyId: opportunity.company.id },
      include: { research: true, company: true },
      orderBy: { updatedAt: "desc" },
    });

    response.json(contacts.map(serializePerson));
  })
);
