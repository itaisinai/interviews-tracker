import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { compensationInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

export const compensationRouter = Router();

compensationRouter.get("/", asyncHandler(async (_request, response) => {
  response.json(await prisma.compensation.findMany({ include: { jobOpportunity: true }, orderBy: { updatedAt: "desc" } }));
}));

compensationRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await prisma.compensation.upsert({
    where: { jobOpportunityId: compensationInputSchema.parse(request.body).jobOpportunityId },
    update: compensationInputSchema.parse(request.body),
    create: compensationInputSchema.parse(request.body)
  }));
}));

compensationRouter.delete("/:id", asyncHandler(async (request, response) => {
  await prisma.compensation.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
