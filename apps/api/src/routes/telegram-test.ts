import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { testTelegramMessageHandler } from "../controllers/telegram-test-controller.js";

export const telegramTestRouter = Router();

/**
 * Test endpoint for Telegram bot operations
 * Mimics the Telegram webhook flow without requiring actual Telegram integration
 */
telegramTestRouter.post("/test", asyncHandler(testTelegramMessageHandler));
