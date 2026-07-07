import type { Request } from "express";
import { z } from "zod";
import { createTimer, logError, logInfo } from "../lib/logger.js";
import { createOpportunityFromText } from "../services/opportunities/opportunity-text-ingestion-service.js";
import { handleTelegramUpdate, telegramUpdateSchema, type TelegramUpdate } from "../services/telegram/telegram-service.js";

const opportunityWebhookSchema = z.object({
  text: z.string().trim().min(20),
  source: z.string().trim().min(1).optional(),
  telegramMessageId: z.number().optional(),
  fromUserId: z.number().nullable().optional(),
  username: z.string().nullable().optional()
});

type TelegramUpdateProcessor = (update: TelegramUpdate) => Promise<unknown>;

export async function createOpportunityFromWebhookHandler(request: Request) {
  const input = opportunityWebhookSchema.parse(request.body);
  const timer = createTimer("webhook", "create opportunity from text", {
    source: input.source ?? "unknown",
    telegramMessageId: input.telegramMessageId,
    fromUserId: input.fromUserId,
    username: input.username
  });

  try {
    const opportunity = await createOpportunityFromText(input.text);
    timer.end({ opportunityId: opportunity.id, company: opportunity.company.name });
    return { opportunity };
  } catch (error) {
    timer.fail(error, { source: input.source ?? "unknown" });
    throw error;
  }
}

export function queueTelegramUpdateProcessing(update: TelegramUpdate, processUpdate: TelegramUpdateProcessor = handleTelegramUpdate) {
  setImmediate(() => {
    void processUpdate(update).catch((error) => {
      logError("telegram", "Background webhook processing failed", {
        updateId: update.update_id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    });
  });

  return { accepted: true };
}

export function telegramWebhookHandler(request: Request) {
  const update = telegramUpdateSchema.parse(request.body);
  logInfo("telegram", "Webhook update accepted", { updateId: update.update_id });
  return queueTelegramUpdateProcessing(update);
}
