import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { telegramMessageHandler } from "../controllers/telegram-controller.js";
import { logger } from "../lib/logger.js";

export const telegramRouter = Router();

// Debug logging middleware
telegramRouter.use((req, _res, next) => {
  logger.info("telegram_route_hit", {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl
  });
  next();
});

/**
 * Endpoint for Telegram bot operations
 * Mimics the Telegram webhook flow without requiring actual Telegram integration
 */
telegramRouter.post("/query", asyncHandler(telegramMessageHandler));
