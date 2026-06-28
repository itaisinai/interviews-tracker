import type { Request, Response } from "express";
import { z } from "zod";
import { createTimer, logInfo, logError } from "../lib/logger.js";
import { classifyMessageIntent } from "../services/telegram/telegram-intent-classifier.js";
import { createOpportunityFromText } from "../services/opportunities/opportunity-text-ingestion-service.js";
import { answerOpportunityQuery } from "../services/telegram/telegram-query-answerer.js";
import {
  formatQueryResponseForTelegram,
  formatOpportunityCreatedMessage,
  formatErrorMessage
} from "../services/telegram/telegram-response-formatter.js";

const telegramMessageSchema = z.object({
  text: z.string().trim().min(1)
});

export async function telegramMessageHandler(request: Request, response: Response) {
  const input = telegramMessageSchema.parse(request.body);
  const timer = createTimer("telegram", "process message", {
    text: input.text.substring(0, 50)
  });

  const messages: Array<{ role: "user" | "bot"; text: string; timestamp: Date }> = [];

  // Add user message
  messages.push({
    role: "user",
    text: input.text,
    timestamp: new Date()
  });

  try {
    logInfo("telegram", "Processing message", { text: input.text });

    // Step 1: Classify the intent (same as real Telegram flow)
    const intent = await classifyMessageIntent(input.text);

    logInfo("telegram", "Intent classified", {
      intent: intent.intent,
      confidence: intent.confidence,
      reasoning: intent.reasoning
    });

    // Add loading message
    messages.push({
      role: "bot",
      text: intent.intent === "CREATE_OPPORTUNITY"
        ? "🔄 Processing your opportunity...\nExtracting details with AI..."
        : "🔍 Looking up your opportunities...",
      timestamp: new Date()
    });

    // Step 2: Handle based on intent
    let botResponse: string;
    let success = true;
    let opportunityData = null;
    let queryResponseData = null;

    if (intent.intent === "CREATE_OPPORTUNITY") {
      try {
        const opportunity = await createOpportunityFromText(input.text);
        const webAppBaseUrl = process.env.WEB_APP_BASE_URL || "http://localhost:3000";
        botResponse = formatOpportunityCreatedMessage(opportunity, webAppBaseUrl);
        opportunityData = opportunity;
      } catch (error) {
        logError("telegram", "Failed to create opportunity", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
        botResponse = formatErrorMessage(error instanceof Error ? error : "An unknown error occurred");
        success = false;
      }
    } else {
      try {
        // Get owner email for queries
        const ownerEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
        if (!ownerEmail) {
          throw new Error("Cannot query opportunities: ALLOWED_EMAIL not configured");
        }

        const webAppBaseUrl = process.env.WEB_APP_BASE_URL || "http://localhost:3000";
        const queryResponse = await answerOpportunityQuery({
          query: input.text,
          ownerEmail,
          webAppBaseUrl
        });

        botResponse = formatQueryResponseForTelegram(queryResponse, webAppBaseUrl);
        queryResponseData = queryResponse;
      } catch (error) {
        logError("telegram", "Failed to answer query", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
        botResponse = formatErrorMessage(error instanceof Error ? error : "An unknown error occurred");
        success = false;
      }
    }

    // Add final bot response (replaces loading message)
    messages[messages.length - 1] = {
      role: "bot",
      text: botResponse,
      timestamp: new Date()
    };

    timer.end({ intent: intent.intent, success });

    // Return the conversation and metadata
    response.status(200).json({
      success,
      intent: {
        type: intent.intent,
        confidence: intent.confidence,
        reasoning: intent.reasoning
      },
      messages,
      data: opportunityData || queryResponseData
    });
  } catch (error) {
    timer.fail(error, {});

    // Add error message
    const errorText = formatErrorMessage(error instanceof Error ? error : "An unknown error occurred");
    messages.push({
      role: "bot",
      text: errorText,
      timestamp: new Date()
    });

    response.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      messages
    });
  }
}
