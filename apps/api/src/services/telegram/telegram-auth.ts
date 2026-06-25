/**
 * Telegram user authorization
 * Controls who can access sensitive bot features
 */

export function isAuthorizedTelegramUser(userId: number | null, chatId: string | number): boolean {
  // Check if user is authorized via user ID or chat ID
  const allowedUserIds = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(",").map(id => id.trim()).filter(Boolean) || [];
  const allowedChatIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.split(",").map(id => id.trim()).filter(Boolean) || [];

  // If no restrictions configured, deny access (fail-safe)
  if (allowedUserIds.length === 0 && allowedChatIds.length === 0) {
    return false;
  }

  // Check user ID if provided
  if (userId !== null && allowedUserIds.includes(String(userId))) {
    return true;
  }

  // Check chat ID
  if (allowedChatIds.includes(String(chatId))) {
    return true;
  }

  return false;
}
