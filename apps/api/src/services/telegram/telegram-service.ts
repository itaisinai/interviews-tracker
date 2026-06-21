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

export function sendTelegramMessage(chatId: string | number, text: string, parseMode?: "Markdown" | "HTML") {
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) {
    payload.parse_mode = parseMode;
  }
  return telegramApiRequest("sendMessage", payload);
}

export async function editTelegramMessage(chatId: string | number, messageId: number, text: string) {
  return telegramApiRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text
  });
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

function isCommand(text: string): boolean {
  return text.startsWith("/");
}

async function handleStartCommand(chatId: string | number) {
  const welcomeMessage = `👋 *Welcome to Opportunity Tracker!*

I help you track job opportunities by extracting details from descriptions.

*How to use:*
Simply send me a job description and I'll create an opportunity for you.

*Example:*
_"Senior Software Engineer at Google
Remote, $180k-$220k
Applied through LinkedIn"_

Ready? Just paste your opportunity! 🚀`;

  await sendTelegramMessage(chatId, welcomeMessage, "Markdown");
}

async function handleHelpCommand(chatId: string | number) {
  const helpMessage = `📋 *How to use this bot:*

*1. Send a job description*
Just paste any job opportunity details:
• Company name
• Role title
• Location (optional)
• Compensation (optional)
• How you heard about it (optional)

*2. I'll extract the details*
My AI will automatically parse:
✓ Company name
✓ Role title
✓ Status & priority
✓ Notes

*3. Opportunity created!*
You'll get a confirmation with the opportunity details.

*Commands:*
/start - Show welcome message
/help - Show this help message

*Example opportunity:*
_Senior Backend Engineer at Stripe
$180k-$220k, Remote
Applied through referral_`;

  await sendTelegramMessage(chatId, helpMessage, "Markdown");
}

async function handleOpportunityCreation(message: { chatId: string | number; messageId: number; text: string; fromUserId?: number | null; username?: string | null }) {
  // Send loading message
  const loadingResponse = await sendTelegramMessage(
    message.chatId,
    "🔄 Processing your opportunity...\nExtracting details with AI..."
  );
  const loadingMessageId = (loadingResponse as { result?: { message_id?: number } }).result?.message_id;

  try {
    const result = await forwardOpportunityTextToBackend({
      text: message.text,
      telegramMessageId: message.messageId,
      fromUserId: message.fromUserId,
      username: message.username
    });

    const opportunity = result.opportunity;
    const companyName = opportunity?.companyName || "Unknown Company";
    const roleTitle = opportunity?.roleTitle || "Position";

    const successMessage = `✅ *Opportunity Created!*

📊 *${companyName}*
💼 ${roleTitle}

The opportunity has been added to your tracker.`;

    // Update the loading message with success
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, successMessage);
    } else {
      await sendTelegramMessage(message.chatId, successMessage, "Markdown");
    }

    return { ignored: false, ok: true, opportunity };
  } catch (error) {
    logError("telegram", "Failed to create opportunity", {
      messageId: message.messageId,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    const errorMessage = `❌ *Failed to create opportunity*

${error instanceof Error ? error.message : "An unknown error occurred"}

Please try again or check the format of your message.`;

    // Update the loading message with error
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, errorMessage);
    } else {
      await sendTelegramMessage(message.chatId, errorMessage, "Markdown");
    }

    return { ignored: false, ok: false };
  }
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
    await sendTelegramMessage(message.chatId, "❓ Unknown command. Send /help for available commands.");
    return { ignored: false, ok: false, command: "unknown" };
  }

  // Handle opportunity creation
  return handleOpportunityCreation(message);
}
