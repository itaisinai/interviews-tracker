import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { taskInputSchema } from "../lib/schemas.js";
import { prisma } from "../lib/prisma.js";

export const tasksRouter = Router();

tasksRouter.get("/", asyncHandler(async (_request, response) => {
  response.json(await prisma.task.findMany({
    include: { jobOpportunity: true, interaction: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }]
  }));
}));

tasksRouter.post("/", asyncHandler(async (request, response) => {
  const input = taskInputSchema.parse(request.body);
  response.status(201).json(await prisma.task.create({ data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null } }));
}));

tasksRouter.put("/:id", asyncHandler(async (request, response) => {
  const input = taskInputSchema.parse(request.body);
  response.json(await prisma.task.update({ where: { id: request.params.id }, data: { ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null } }));
}));

tasksRouter.delete("/:id", asyncHandler(async (request, response) => {
  await prisma.task.delete({ where: { id: request.params.id } });
  response.status(204).end();
}));
