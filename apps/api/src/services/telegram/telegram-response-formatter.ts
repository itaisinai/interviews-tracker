import type { QueryResponse } from "./telegram-query-answerer.js";

/**
 * Formats a query response into a Telegram message with markdown and links
 */
export function formatQueryResponseForTelegram(
  response: QueryResponse,
  webAppBaseUrl: string
): string {
  let message = `💡 *Query Result*\n\n${response.answer}`;

  // Add links to relevant opportunities if any
  if (response.relevantOpportunities && response.relevantOpportunities.length > 0) {
    message += "\n\n📎 *Related Opportunities:*\n";

    response.relevantOpportunities.forEach((opp) => {
      const slug = opp.slug || opp.id;
      const url = `${webAppBaseUrl}/opportunities/${slug}`;
      message += `• [${opp.companyName} - ${opp.roleTitle}](${url})\n`;
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
  const companyName = opportunity.companyName || "Unknown Company";
  const roleTitle = opportunity.roleTitle || "Position";
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
