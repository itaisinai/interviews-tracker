import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { noteInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

export const notesRouter = Router();

notesRouter.get("/", asyncHandler(async (_request, response) => {
  response.json(await prisma.note.findMany({ include: { jobOpportunity: true, interaction: true }, orderBy: { updatedAt: "desc" } }));
}));

notesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await prisma.note.create({ data: noteInputSchema.parse(request.body) }));
}));

notesRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await prisma.note.update({ where: { id: request.params.id }, data: noteInputSchema.parse(request.body) }));
}));

notesRouter.delete("/:id", asyncHandler(async (request, response) => {
  await prisma.note.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
