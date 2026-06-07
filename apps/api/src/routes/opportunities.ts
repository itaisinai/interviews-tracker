import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { z } from "zod";
import { opportunityInputSchema, interactionInputSchema, noteInputSchema, taskInputSchema } from "../lib/schemas.js";
import { createOpportunity, deleteOpportunity, getOpportunity, listOpportunities, updateOpportunity } from "../services/opportunity-service.js";
import { prisma } from "../lib/prisma.js";
import { parseGmailEmailToInteraction, searchGmailMessages } from "../services/gmail-service.js";

export const opportunitiesRouter = Router();

opportunitiesRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listOpportunities(request.query as Record<string, string | undefined>));
}));

opportunitiesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createOpportunity(opportunityInputSchema.parse(request.body)));
}));

opportunitiesRouter.get("/:id", asyncHandler(async (request, response) => {
  response.json(await getOpportunity(request.params.id));
}));

opportunitiesRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await updateOpportunity(request.params.id, opportunityInputSchema.parse(request.body)));
}));

opportunitiesRouter.delete("/:id", asyncHandler(async (request, response) => {
  await deleteOpportunity(request.params.id);
  response.status(204).end();
}));

opportunitiesRouter.get("/:id/interactions", asyncHandler(async (request, response) => {
  response.json(await prisma.interaction.findMany({ where: { jobOpportunityId: request.params.id }, orderBy: { date: "asc" } }));
}));

opportunitiesRouter.post("/:id/interactions", asyncHandler(async (request, response) => {
  const input = interactionInputSchema.parse(request.body);
  response.status(201).json(await prisma.interaction.create({ data: { ...input, date: new Date(input.date), jobOpportunityId: request.params.id } }));
}));

opportunitiesRouter.post("/:id/notes", asyncHandler(async (request, response) => {
  const input = noteInputSchema.parse({ ...request.body, jobOpportunityId: request.params.id });
  response.status(201).json(await prisma.note.create({ data: input }));
}));

opportunitiesRouter.post("/:id/tasks", asyncHandler(async (request, response) => {
  const input = taskInputSchema.parse({ ...request.body, jobOpportunityId: request.params.id });
  response.status(201).json(await prisma.task.create({ data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null } }));
}));

opportunitiesRouter.get("/:id/gmail/search", asyncHandler(async (request, response) => {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: { id: request.params.id },
    select: { companyName: true, roleTitle: true }
  });

  if (!opportunity) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  const timer = createTimer("gmail", "search opportunity emails", { company: opportunity.companyName });
  const result = await searchGmailMessages({
    auth0Email: request.auth?.email ?? "",
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle
  });
  timer.end({ candidates: result.candidates.length });
  response.json(result);
}));

opportunitiesRouter.post("/:id/gmail/parse-email", asyncHandler(async (request, response) => {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: { id: request.params.id },
    select: { companyName: true, roleTitle: true }
  });

  if (!opportunity) {
    response.status(404).json({ message: "Opportunity not found" });
    return;
  }

  const { messageId } = z.object({ messageId: z.string().min(1) }).parse(request.body);
  const timer = createTimer("gmail", "parse opportunity email", { company: opportunity.companyName, messageId });
  const result = await parseGmailEmailToInteraction({
    auth0Email: request.auth?.email ?? "",
    companyName: opportunity.companyName,
    roleTitle: opportunity.roleTitle,
    messageId
  });
  timer.end({ company: opportunity.companyName });
  response.json(result);
}));
