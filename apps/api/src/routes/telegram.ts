import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { telegramMessageHandler } from "../controllers/telegram-controller.js";

export const telegramRouter = Router();

/**
 * Endpoint for Telegram bot operations
 * Mimics the Telegram webhook flow without requiring actual Telegram integration
 */
telegramRouter.post("/query", asyncHandler(telegramMessageHandler));
