/**
 * Telegram Bot API client
 * Handles low-level communication with Telegram API
 */

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

export function sendTelegramMessage(chatId: string | number, text: string, parseMode?: "Markdown" | "MarkdownV2" | "HTML") {
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  return telegramApiRequest("sendMessage", payload);
}

export async function editTelegramMessage(chatId: string | number, messageId: number, text: string, parseMode?: "Markdown" | "MarkdownV2" | "HTML") {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text
  };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  return telegramApiRequest("editMessageText", payload);
}

export async function forwardOpportunityTextToBackend(input: {
  text: string;
  telegramMessageId: number;
  fromUserId?: number | null;
  username?: string | null;
}) {
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

  return response.json() as Promise<{
    opportunity?: {
      id?: string;
      slug?: string;
      companyName?: string;
      roleTitle?: string;
    };
  }>;
}
