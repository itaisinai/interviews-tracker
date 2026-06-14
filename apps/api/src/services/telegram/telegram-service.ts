import { z } from "zod";
import { logError, logInfo } from "../../lib/logger.js";

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

async function telegramApiRequest(method: string, body: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to reply to Telegram messages.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export function sendTelegramMessage(chatId: string | number, text: string) {
  return telegramApiRequest("sendMessage", { chat_id: chatId, text });
}

export async function forwardOpportunityTextToBackend(input: { text: string; telegramMessageId: number; fromUserId?: number | null; username?: string | null }) {
  const targetUrl = process.env.TELEGRAM_BACKEND_WEBHOOK_URL;
  const secret = process.env.OPPORTUNITY_WEBHOOK_SECRET;

  if (!targetUrl) {
    throw new Error("TELEGRAM_BACKEND_WEBHOOK_URL is required.");
  }

  if (!secret) {
    throw new Error("OPPORTUNITY_WEBHOOK_SECRET is required.");
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-opportunity-webhook-secret": secret
    },
    body: JSON.stringify({
      text: input.text,
      source: "telegram",
      telegramMessageId: input.telegramMessageId,
      fromUserId: input.fromUserId,
      username: input.username
    })
  });

  if (!response.ok) {
    throw new Error(`Backend opportunity webhook failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<{ opportunity?: { id?: string; companyName?: string; roleTitle?: string } }>;
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = extractTelegramTextMessage(update);

  if (!message) {
    logInfo("telegram", "Ignored update without text message", { updateId: update.update_id });
    return { ignored: true };
  }

  logInfo("telegram", "Received opportunity text", {
    updateId: update.update_id,
    messageId: message.messageId,
    fromUserId: message.fromUserId,
    username: message.username
  });

  try {
    const result = await forwardOpportunityTextToBackend({
      text: message.text,
      telegramMessageId: message.messageId,
      fromUserId: message.fromUserId,
      username: message.username
    });
    const opportunity = result.opportunity;
    const label = opportunity?.companyName && opportunity?.roleTitle ? `${opportunity.companyName} — ${opportunity.roleTitle}` : "the opportunity";
    await sendTelegramMessage(message.chatId, `✅ Created ${label}.`);
    return { ignored: false, ok: true, opportunity };
  } catch (error) {
    logError("telegram", "Failed to create opportunity from Telegram message", {
      updateId: update.update_id,
      messageId: message.messageId,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    await sendTelegramMessage(message.chatId, "❌ I could not create that opportunity. Please check the backend logs and try again.");
    return { ignored: false, ok: false };
  }
}
