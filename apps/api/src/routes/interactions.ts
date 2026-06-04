import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { interactionInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

export const interactionsRouter = Router();

interactionsRouter.get("/", asyncHandler(async (_request, response) => {
  response.json(await prisma.interaction.findMany({
    include: { jobOpportunity: true },
    orderBy: { date: "asc" }
  }));
}));

interactionsRouter.post("/", asyncHandler(async (request, response) => {
  const input = interactionInputSchema.extend({ jobOpportunityId: z.string().min(1) }).parse(request.body);
  response.status(201).json(await prisma.interaction.create({
    data: {
      ...input,
      date: new Date(input.date)
    },
    include: { jobOpportunity: true }
  }));
}));

interactionsRouter.put("/:id", asyncHandler(async (request, response) => {
  const input = interactionInputSchema.parse(request.body);
  response.json(await prisma.interaction.update({ where: { id: request.params.id }, data: { ...input, date: new Date(input.date) } }));
}));

interactionsRouter.delete("/:id", asyncHandler(async (request, response) => {
  await prisma.interaction.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
