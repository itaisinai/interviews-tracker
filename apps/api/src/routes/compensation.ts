import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";
import { compensationInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const compensationRouter = Router();

compensationRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await prisma.compensation.findMany({ where: { ownerEmail: (request as AuthenticatedRequest).auth.email }, include: { jobOpportunity: true }, orderBy: { updatedAt: "desc" } }));
}));

compensationRouter.post("/", asyncHandler(async (request, response) => {
  const input = compensationInputSchema.parse(request.body);
  response.status(201).json(await prisma.compensation.upsert({
    where: { jobOpportunityId: input.jobOpportunityId },
    update: input,
    create: { ...input, ownerEmail: (request as AuthenticatedRequest).auth.email }
  }));
}));

compensationRouter.delete("/:id", asyncHandler(async (request, response) => {
  await prisma.compensation.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
