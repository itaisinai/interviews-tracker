import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  createInteractionHandler,
  deleteInteractionHandler,
  listInteractionsHandler,
  updateInteractionHandler
} from "../controllers/interactions-controller.js";

export const interactionsRouter = Router();

interactionsRouter.get("/", asyncHandler(async (_request, response) => {
  response.json(await listInteractionsHandler());
}));

interactionsRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createInteractionHandler(request));
}));

interactionsRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await updateInteractionHandler(request));
}));

interactionsRouter.delete("/:id", asyncHandler(async (request, response) => {
  await deleteInteractionHandler(request);
  response.status(204).end();
}));
