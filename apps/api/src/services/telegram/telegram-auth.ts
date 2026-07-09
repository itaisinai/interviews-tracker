/**
 * Telegram user authorization
 * Controls who can access sensitive bot features
 */

import { logError, logInfo } from "../../lib/logger.js";

export function isAuthorizedTelegramUser(userId: number | null, chatId: string | number): boolean {
  // Check if user is authorized via user ID or chat ID
  const allowedUserIds =
    process.env.TELEGRAM_ALLOWED_USER_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || [];
  const allowedChatIds =
    process.env.TELEGRAM_ALLOWED_CHAT_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || [];

  logInfo("telegram", "Authorization check", {
    fromUserId: userId,
    chatId: chatId,
    allowedUserIdsCount: allowedUserIds.length,
    allowedChatIdsCount: allowedChatIds.length,
    envVarConfigured: !!process.env.TELEGRAM_ALLOWED_USER_IDS || !!process.env.TELEGRAM_ALLOWED_CHAT_IDS,
  });

  // If no restrictions configured, deny access (fail-safe)
  if (allowedUserIds.length === 0 && allowedChatIds.length === 0) {
    logError("telegram", "Authorization denied: No allowed users or chats configured", {
      fromUserId: userId,
      chatId: chatId,
      hint: "Set TELEGRAM_ALLOWED_USER_IDS or TELEGRAM_ALLOWED_CHAT_IDS environment variable",
    });
    return false;
  }

  // Check user ID if provided
  if (userId !== null && allowedUserIds.includes(String(userId))) {
    logInfo("telegram", "Authorization granted via user ID", {
      fromUserId: userId,
      chatId: chatId,
    });
    return true;
  }

  // Check chat ID
  if (allowedChatIds.includes(String(chatId))) {
    logInfo("telegram", "Authorization granted via chat ID", {
      fromUserId: userId,
      chatId: chatId,
    });
    return true;
  }

  logError("telegram", "Authorization denied: User/chat not in allowed list", {
    fromUserId: userId,
    chatId: chatId,
    allowedUserIdsCount: allowedUserIds.length,
    allowedChatIdsCount: allowedChatIds.length,
  });
  return false;
}
