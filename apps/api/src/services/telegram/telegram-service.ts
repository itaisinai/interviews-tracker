import { z } from "zod";
import { logError, logInfo } from "../../lib/logger.js";
import { classifyMessageIntent, answerOpportunityQuery } from "./telegram-query-service.js";
import { formatOpportunitiesForAI } from "../opportunities/opportunity-query-data-service.js";
import { formatQueryResponseForTelegram, formatOpportunityCreatedMessage, formatErrorMessage } from "./telegram-response-formatter.js";

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

I help you track job opportunities and answer questions about your process.

*What I can do:*
📝 Create opportunities from job descriptions
🔍 Answer questions about your opportunities

*Examples:*
_Create: "Senior Software Engineer at Google, Remote, $180k-$220k"_
_Query: "What's my next interview?"_
_Query: "What are my active processes?"_

Ready? Just send me a message! 🚀`;

  await sendTelegramMessage(chatId, welcomeMessage, "Markdown");
}

async function handleHelpCommand(chatId: string | number) {
  const helpMessage = `📋 *How to use this bot:*

*Create Opportunities*
Just paste job details and I'll create an opportunity:
_"Senior Backend Engineer at Stripe
$180k-$220k, Remote
Applied through referral"_

*Query Your Data*
Ask me questions about your opportunities:
• "What's my next interview?"
• "What's the next interaction at company X?"
• "What are my active processes?"
• "Who are the participants in my X interview?"
• "What are the instructions for my next interview?"

*Commands:*
/start - Show welcome message
/help - Show this help message

I'll automatically detect if you're creating an opportunity or asking a question! 🤖`;

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
    const webAppBaseUrl = process.env.WEB_APP_BASE_URL || "https://localhost:3000";
    const successMessage = formatOpportunityCreatedMessage(opportunity || {}, webAppBaseUrl);

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

    const errorMessage = formatErrorMessage(error instanceof Error ? error : "An unknown error occurred");

    // Update the loading message with error
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, errorMessage);
    } else {
      await sendTelegramMessage(message.chatId, errorMessage, "Markdown");
    }

    return { ignored: false, ok: false };
  }
}

async function handleOpportunityQuery(message: { chatId: string | number; messageId: number; text: string; fromUserId?: number | null; username?: string | null }) {
  // Send loading message
  const loadingResponse = await sendTelegramMessage(
    message.chatId,
    "🔍 Looking up your opportunities..."
  );
  const loadingMessageId = (loadingResponse as { result?: { message_id?: number } }).result?.message_id;

  try {
    // Get owner email (same logic as opportunity creation)
    const ownerEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase();

    if (!ownerEmail) {
      throw new Error("Cannot query opportunities: ALLOWED_EMAIL not configured");
    }

    // Fetch opportunities data filtered by user email
    const opportunitiesData = await formatOpportunitiesForAI(ownerEmail);

    // Get web app base URL for links
    const webAppBaseUrl = process.env.WEB_APP_BASE_URL || "https://localhost:3000";

    // Use AI to answer the query
    const queryResponse = await answerOpportunityQuery({
      query: message.text,
      opportunitiesData,
      webAppBaseUrl
    });

    // Format response with markdown and links
    const responseMessage = formatQueryResponseForTelegram(queryResponse, webAppBaseUrl);

    // Update the loading message with the response
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, responseMessage);
    } else {
      await sendTelegramMessage(message.chatId, responseMessage, "Markdown");
    }

    return { ignored: false, ok: true, queryResponse };
  } catch (error) {
    logError("telegram", "Failed to answer query", {
      messageId: message.messageId,
      error: error instanceof Error ? error.message : "Unknown error"
    });

    const errorMessage = formatErrorMessage(error instanceof Error ? error : "An unknown error occurred");

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
