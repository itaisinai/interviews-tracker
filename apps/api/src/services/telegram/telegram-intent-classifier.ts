/**
 * Telegram message intent classification
 * Determines if a message is a query or opportunity creation request
 */

import { z } from "zod";
import { createTimer } from "../../lib/logger.js";

export const messageIntentSchema = z.object({
  intent: z.enum(["QUERY", "CREATE_OPPORTUNITY"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

export type MessageIntent = z.infer<typeof messageIntentSchema>;

const intentClassificationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "confidence", "reasoning"],
  properties: {
    intent: {
      type: "string",
      enum: ["QUERY", "CREATE_OPPORTUNITY"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    reasoning: {
      type: "string"
    }
  }
} as const;

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a job opportunity tracking bot.

Your task: Classify if a message is a QUERY about existing opportunities or a CREATE_OPPORTUNITY request.

QUERY examples:
- "What's my next interview?"
- "What's the next interaction at company Alta?"
- "Who are the participants in my Google interview?"
- "What are my active processes?"
- "What companies am I interviewing with?"
- "When is my next meeting?"
- "What are the instructions for my Facebook interview?"

CREATE_OPPORTUNITY examples:
- "Senior Software Engineer at Google, $180k-$220k, Applied through LinkedIn"
- "Backend role at Stripe, remote position"
- "Just got a message from Meta recruiter about a Frontend Engineer position"
- "New opportunity: ML Engineer at OpenAI, 5+ years experience required"

Rules:
- Questions about existing data → QUERY
- Job descriptions or new opportunities → CREATE_OPPORTUNITY
- If uncertain, prefer QUERY (we'll handle clarification later)
- Confidence should be 0.8+ for clear cases, 0.5-0.8 for borderline

Return JSON with intent, confidence (0-1), and reasoning.`;

export async function classifyMessageIntent(message: string): Promise<MessageIntent> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for intent classification");
  }

  const timer = createTimer("llm", "classify telegram message intent", {});

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: INTENT_CLASSIFICATION_PROMPT }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: message }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "classify_message_intent",
          strict: true,
          schema: intentClassificationSchema
        }
      }
    })
  });

  if (!response.ok) {
    timer.fail(new Error(`Intent classification failed: ${response.status}`), {});
    throw new Error(`Intent classification failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const outputText = payload.output_text ??
    payload.output?.flatMap(item => item.content ?? [])
      .find(item => item.type === "output_text")?.text;

  if (!outputText) {
    timer.fail(new Error("Intent classification returned no text output"), {});
    throw new Error("Intent classification returned no text output");
  }

  timer.end({});
  return messageIntentSchema.parse(JSON.parse(outputText));
}
