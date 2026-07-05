import type { QueryResponse } from "./telegram-query-answerer.js";

/**
 * Escape MarkdownV2 special characters in user-provided text
 * MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * Reference: https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format a date for Telegram display
 */
function formatDateForDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  } else {
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${dayOfWeek}, ${dateStr} at ${timeStr}`;
  }
}

/**
 * Formats a query response into a Telegram message with markdown and links
 */
export function formatQueryResponseForTelegram(
  response: QueryResponse,
  webAppBaseUrl: string
): string {
  // Use answer as-is (AI already formatted it nicely)
  let message = response.answer;

  // Add links to relevant opportunities if any
  if (response.relevantOpportunities && response.relevantOpportunities.length > 0) {
    message += "\n\n📎 *View Details:*\n";

    response.relevantOpportunities.forEach((opp) => {
      const slug = opp.slug || opp.id;
      const url = `${webAppBaseUrl}/opportunities/${slug}`;
      const companyName = escapeMarkdownV2(opp.companyName || "Unknown");
      const roleText = opp.roleTitle ? ` - ${escapeMarkdownV2(opp.roleTitle)}` : "";
      message += `• [${companyName}${roleText}](${url})\n`;
    });
  }

  // Add clarification question if needed
  if (response.needsClarification && response.clarificationQuestion) {
    message += `\n\n❓ ${response.clarificationQuestion}`;
  }

  return message;
}

/**
 * Formats an opportunity creation success message
 */
export function formatOpportunityCreatedMessage(opportunity: {
  id?: string;
  slug?: string;
  companyName?: string;
  roleTitle?: string;
}, webAppBaseUrl: string): string {
  const companyName = escapeMarkdownV2(opportunity.companyName || "Unknown Company");
  const roleTitle = escapeMarkdownV2(opportunity.roleTitle || "Position");
  const slug = opportunity.slug || opportunity.id;

  let message = `✅ *Opportunity Created!*\n\n`;
  message += `📊 *${companyName}*\n`;
  message += `💼 ${roleTitle}\n\n`;

  if (slug) {
    const url = `${webAppBaseUrl}/opportunities/${slug}`;
    message += `[View in App](${url})\n\n`;
  }

  message += `The opportunity has been added to your tracker.`;

  return message;
}

/**
 * Formats error messages for Telegram
 */
export function formatErrorMessage(error: Error | string): string {
  const errorText = typeof error === "string" ? error : error.message;

  return `❌ *Error*\n\n${errorText}\n\nPlease try again or check the format of your message.`;
}

/**
 * Formats clarification request messages
 */
export function formatClarificationMessage(question: string): string {
  return `❓ *Need More Info*\n\n${question}`;
}
