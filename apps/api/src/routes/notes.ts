import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";
import { noteInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const notesRouter = Router();

notesRouter.get("/", asyncHandler(async (request: AuthenticatedRequest, response) => {
  response.json(await prisma.note.findMany({ where: { ownerEmail: request.auth.email }, include: { jobOpportunity: true, interaction: true }, orderBy: { updatedAt: "desc" } }));
}));

notesRouter.post("/", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const input = noteInputSchema.parse(request.body);
  response.status(201).json(await prisma.note.create({ data: { ...input, ownerEmail: request.auth.email } }));
}));

notesRouter.put("/:id", asyncHandler(async (request: AuthenticatedRequest, response) => {
  response.json(await prisma.note.update({ where: { id: request.params.id }, data: noteInputSchema.parse(request.body) }));
}));

notesRouter.delete("/:id", asyncHandler(async (request: AuthenticatedRequest, response) => {
  await prisma.note.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
