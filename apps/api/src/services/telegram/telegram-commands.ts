/**
 * Telegram bot command handlers
 * Handles /start, /help, and other commands
 */

import { sendTelegramMessage } from "./telegram-api-client.js";

export function isCommand(text: string): boolean {
  return text.startsWith("/");
}

export async function handleStartCommand(chatId: string | number) {
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

export async function handleHelpCommand(chatId: string | number) {
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

export async function handleUnknownCommand(chatId: string | number) {
  await sendTelegramMessage(chatId, "❓ Unknown command. Send /help for available commands.");
}
