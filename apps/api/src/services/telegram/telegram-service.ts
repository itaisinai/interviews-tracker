/**
 * Telegram bot service - Main orchestration
 * Routes incoming updates to appropriate handlers
 */

import { z } from "zod";
import { logError, logInfo } from "../../lib/logger.js";
import { classifyMessageIntent } from "./telegram-intent-classifier.js";
import { isCommand, handleStartCommand, handleHelpCommand, handleUnknownCommand } from "./telegram-commands.js";
import { handleOpportunityCreation, handleOpportunityQuery } from "./telegram-message-handlers.js";

export const telegramUpdateSchema = z.object({
  update_id: z.number().optional(),
  message: z.object({
    message_id: z.number(),
    chat: z.object({ id: z.union([z.number(), z.string()]) }),
    text: z.string().optional(),
    from: z.object({ id: z.number().optional(), username: z.string().optional() }).optional()
  }).optional()
}).passthrough();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

export function extractTelegramTextMessage(update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim();

  if (!message || !text) {
    return null;
  }

  return {
    chatId: message.chat.id,
    messageId: message.message_id,
    text,
    fromUserId: message.from?.id ?? null,
    username: message.from?.username ?? null
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = extractTelegramTextMessage(update);

  if (!message) {
    logInfo("telegram", "Ignored update without text message", { updateId: update.update_id });
    return { ignored: true };
  }

  logInfo("telegram", "Received message", {
    updateId: update.update_id,
    messageId: message.messageId,
    text: message.text.substring(0, 50),
    fromUserId: message.fromUserId,
    username: message.username
  });

  // Handle commands
  if (isCommand(message.text)) {
    const command = message.text.toLowerCase();

    if (command === "/start") {
      await handleStartCommand(message.chatId);
      return { ignored: false, ok: true, command: "start" };
    }

    if (command === "/help") {
      await handleHelpCommand(message.chatId);
      return { ignored: false, ok: true, command: "help" };
    }

    // Unknown command
    await handleUnknownCommand(message.chatId);
    return { ignored: false, ok: false, command: "unknown" };
  }

  // Classify message intent
  try {
    const intent = await classifyMessageIntent(message.text);

    logInfo("telegram", "Classified message intent", {
      messageId: message.messageId,
      intent: intent.intent,
      confidence: intent.confidence,
      reasoning: intent.reasoning
    });

    // Route based on intent
    if (intent.intent === "QUERY") {
      return handleOpportunityQuery(message);
    } else {
      return handleOpportunityCreation(message);
    }
  } catch (error) {
    // If classification fails, fall back to opportunity creation (old behavior)
    logError("telegram", "Intent classification failed, falling back to opportunity creation", {
      messageId: message.messageId,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return handleOpportunityCreation(message);
  }
}
