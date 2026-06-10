import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { verifySharedSecretHeader } from "../lib/webhook-auth.js";
import { createOpportunityFromWebhookHandler, telegramWebhookHandler } from "../controllers/webhooks-controller.js";

export const webhooksRouter = Router();

webhooksRouter.post("/opportunities/telegram", asyncHandler(async (request, response) => {
  if (!verifySharedSecretHeader(request, response, {
    headerName: "x-opportunity-webhook-secret",
    expectedSecret: process.env.OPPORTUNITY_WEBHOOK_SECRET,
    missingConfigMessage: "Opportunity webhook secret is not configured"
  })) {
    return;
  }

  response.status(201).json(await createOpportunityFromWebhookHandler(request));
}));

webhooksRouter.post("/telegram", asyncHandler(async (request, response) => {
  if (!verifySharedSecretHeader(request, response, {
    headerName: "x-telegram-bot-api-secret-token",
    expectedSecret: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
    missingConfigMessage: "Telegram webhook secret token is not configured"
  })) {
    return;
  }

  response.status(202).json(telegramWebhookHandler(request));
}));
