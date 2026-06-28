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

QUERY examples (questions about EXISTING data):
- "What's my next interview?"
- "What are my next interactions?"
- "What's the next interaction at company Alta?"
- "Who are the participants in my Google interview?"
- "What are my active processes?"
- "What companies am I interviewing with?"
- "When is my next meeting?"
- "What are the instructions for my Facebook interview?"
- "Show me opportunities at Meta"
- "Do I have any interviews this week?"
- "What's the status of my Stripe process?"
- "Tell me about my upcoming meetings"

CREATE_OPPORTUNITY examples (NEW job postings/opportunities):
- "Senior Software Engineer at Google, $180k-$220k, Applied through LinkedIn"
- "Backend role at Stripe, remote position"
- "Just got a message from Meta recruiter about a Frontend Engineer position"
- "New opportunity: ML Engineer at OpenAI, 5+ years experience required"
- "Startup seeking Full Stack Developer, Series A, React + Node.js"
- "Got contacted for Staff Engineer role at Uber, they want to schedule intro call"

Key distinction rules:
1. If message asks a question (who, what, when, where, which, how, show, tell, do I have) → QUERY
2. If message describes a job posting with company + role + details → CREATE_OPPORTUNITY
3. If message mentions "next", "upcoming", "status", "participants" → Almost always QUERY
4. If message says "new opportunity", "got contacted", "applying to", "recruiter reached out" → CREATE_OPPORTUNITY
5. Questions can mention companies/roles but are still QUERY if asking about existing data

Confidence guidelines:
- 0.9-1.0: Clear question words OR clear job posting format
- 0.7-0.9: Probable based on keywords and structure
- 0.5-0.7: Borderline or ambiguous
- Below 0.5: Confused or unclear input

If uncertain between QUERY and CREATE_OPPORTUNITY:
- Does it have question words or ask for information? → QUERY
- Does it provide new job details? → CREATE_OPPORTUNITY
- Default to QUERY when unclear (safer to answer a question than create wrong opportunity)

Return JSON with intent, confidence (0-1), and reasoning.`;

export async function classifyMessageIntent(message: string): Promise<MessageIntent> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for intent classification");
  }

  const timer = createTimer("llm", "classify telegram message intent", {});

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: INTENT_CLASSIFICATION_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
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
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const outputText = payload.choices?.[0]?.message?.content;

  if (!outputText) {
    timer.fail(new Error("Intent classification returned no text output"), {});
    throw new Error("Intent classification returned no text output");
  }

  timer.end({});
  return messageIntentSchema.parse(JSON.parse(outputText));
}
