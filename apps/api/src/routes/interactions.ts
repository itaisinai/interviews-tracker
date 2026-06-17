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

interactionsRouter.get("/", asyncHandler(async (request, response) => {
  response.json(await listInteractionsHandler(request as AuthenticatedRequest));
}));

interactionsRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json(await createInteractionHandler(request as AuthenticatedRequest));
}));

interactionsRouter.put("/:id", asyncHandler(async (request, response) => {
  response.json(await updateInteractionHandler(request as AuthenticatedRequest));
}));

interactionsRouter.delete("/:id", asyncHandler(async (request, response) => {
  await deleteInteractionHandler(request as AuthenticatedRequest);
  response.status(204).end();
}));
