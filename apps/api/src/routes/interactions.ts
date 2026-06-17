import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  createInteractionHandler,
  deleteInteractionHandler,
  listInteractionsHandler,
  updateInteractionHandler
} from "../controllers/interactions-controller.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const interactionsRouter = Router();

interactionsRouter.get("/", asyncHandler(async (request: AuthenticatedRequest, response) => {
  response.json(await listInteractionsHandler(request));
}));

interactionsRouter.post("/", asyncHandler(async (request: AuthenticatedRequest, response) => {
  response.status(201).json(await createInteractionHandler(request));
}));

interactionsRouter.put("/:id", asyncHandler(async (request: AuthenticatedRequest, response) => {
  response.json(await updateInteractionHandler(request));
}));

interactionsRouter.delete("/:id", asyncHandler(async (request: AuthenticatedRequest, response) => {
  await deleteInteractionHandler(request);
  response.status(204).end();
}));
