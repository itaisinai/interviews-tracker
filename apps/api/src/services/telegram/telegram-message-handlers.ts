/**
 * Telegram message handlers
 * Handles opportunity creation and query messages
 */

import { logError } from "../../lib/logger.js";
import { sendTelegramMessage, editTelegramMessage, forwardOpportunityTextToBackend } from "./telegram-api-client.js";
import { isAuthorizedTelegramUser } from "./telegram-auth.js";
import { answerOpportunityQuery } from "./telegram-query-answerer.js";
import {
  formatQueryResponseForTelegram,
  formatOpportunityCreatedMessage,
  formatErrorMessage
} from "./telegram-response-formatter.js";

export interface TelegramMessage {
  chatId: string | number;
  messageId: number;
  text: string;
  fromUserId?: number | null;
  username?: string | null;
}

export async function handleOpportunityCreation(message: TelegramMessage) {
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
    const webAppBaseUrl = process.env.WEB_APP_BASE_URL || process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() || "http://localhost:3000";
    const successMessage = formatOpportunityCreatedMessage(opportunity || {}, webAppBaseUrl);

    // Update the loading message with success
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, successMessage, "MarkdownV2");
    } else {
      await sendTelegramMessage(message.chatId, successMessage, "MarkdownV2");
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
      await editTelegramMessage(message.chatId, loadingMessageId, errorMessage, "MarkdownV2");
    } else {
      await sendTelegramMessage(message.chatId, errorMessage, "Markdown");
    }

    return { ignored: false, ok: false };
  }
}

export async function handleOpportunityQuery(message: TelegramMessage) {
  // Send loading message
  const loadingResponse = await sendTelegramMessage(
    message.chatId,
    "🔍 Looking up your opportunities..."
  );
  const loadingMessageId = (loadingResponse as { result?: { message_id?: number } }).result?.message_id;

  try {
    // Authorize the telegram user before accessing sensitive data
    if (!isAuthorizedTelegramUser(message.fromUserId ?? null, message.chatId)) {
      throw new Error("Unauthorized: This bot can only be used by authorized users");
    }

    // Get owner email (same logic as opportunity creation)
    const ownerEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase();

    if (!ownerEmail) {
      throw new Error("Cannot query opportunities: ALLOWED_EMAIL not configured");
    }

    // Get web app base URL for links
    const webAppBaseUrl = process.env.WEB_APP_BASE_URL || process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() || "http://localhost:3000";

    // Use AI to answer the query with function calling
    const queryResponse = await answerOpportunityQuery({
      query: message.text,
      ownerEmail,
      webAppBaseUrl
    });

    // Format response with markdown and links
    const responseMessage = formatQueryResponseForTelegram(queryResponse, webAppBaseUrl);

    // Update the loading message with the response
    if (loadingMessageId) {
      await editTelegramMessage(message.chatId, loadingMessageId, responseMessage, "MarkdownV2");
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
      await editTelegramMessage(message.chatId, loadingMessageId, errorMessage, "MarkdownV2");
    } else {
      await sendTelegramMessage(message.chatId, errorMessage, "Markdown");
    }

    return { ignored: false, ok: false };
  }
}
