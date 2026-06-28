/**
 * Telegram query answering with AI
 * Answers questions about opportunities using real data
 */

import { z } from "zod";
import { createTimer } from "../../lib/logger.js";

export const queryResponseSchema = z.object({
  answer: z.string(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  relevantOpportunities: z.array(z.object({
    id: z.string(),
    companyName: z.string(),
    roleTitle: z.string(),
    slug: z.string().nullable()
  })).optional()
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;

const queryResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "needsClarification", "clarificationQuestion", "relevantOpportunities"],
  properties: {
    answer: {
      type: "string"
    },
    needsClarification: {
      type: "boolean"
    },
    clarificationQuestion: {
      type: ["string", "null"]
    },
    relevantOpportunities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "companyName", "roleTitle", "slug"],
        properties: {
          id: { type: "string" },
          companyName: { type: "string" },
          roleTitle: { type: "string" },
          slug: { type: ["string", "null"] }
        }
      }
    }
  }
} as const;

const QUERY_ANSWERING_PROMPT = `You are a helpful assistant for a job opportunity tracking system.

Your task: Answer questions about the user's job opportunities based on REAL DATA provided.

Guidelines:
- Use ONLY the data provided in the opportunities JSON
- If data is missing or ambiguous, set needsClarification=true and ask a specific question
- If no opportunities match, set needsClarification=true and ask what they meant
- Keep answers concise and actionable (2-5 sentences)
- Include relevant opportunity IDs in relevantOpportunities array
- For "next interaction" questions, look for upcoming SCHEDULED interactions or most recent ones
- For "active processes" questions, filter by pipelineType=ACTIVE_PROCESS
- For participant questions, look in interaction.personName field

Answer format:
- Short, helpful response
- If multiple companies match, list them
- If nothing found, ask for clarification

Examples:
Query: "What's my next interview?"
Answer: "Your next interview is on Jan 15 at 2pm with Google (Senior Engineer role) - a Technical Interview with Sarah Chen. Good luck!"

Query: "What are my active processes?"
Answer: "You have 3 active processes: 1) Google - Senior Engineer (Technical Interview on Jan 15), 2) Meta - Frontend Lead (waiting for response), 3) Stripe - Backend Engineer (final round scheduled for Jan 20)."

Query: "What's the next interaction at Alta?"
Answer (if found): "Your next interaction at Alta is on Jan 18 - Phone Screen with John Doe, Recruiter."
Answer (if not found): needsClarification=true, "I couldn't find any company called 'Alta' in your opportunities. Did you mean a different company name?"`;

export async function answerOpportunityQuery(input: {
  query: string;
  opportunitiesData: string;
  webAppBaseUrl: string;
}): Promise<QueryResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for query answering");
  }

  const timer = createTimer("llm", "answer opportunity query", {});

  const userPrompt = `User query: ${input.query}

Available opportunities data:
${input.opportunitiesData}

Answer the query based on this data.`;

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
          content: QUERY_ANSWERING_PROMPT
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "answer_opportunity_query",
          strict: true,
          schema: queryResponseJsonSchema
        }
      }
    })
  });

  if (!response.ok) {
    timer.fail(new Error(`Query answering failed: ${response.status}`), {});
    throw new Error(`Query answering failed: ${response.status} ${await response.text()}`);
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
    timer.fail(new Error("Query answering returned no text output"), {});
    throw new Error("Query answering returned no text output");
  }

  timer.end({});
  return queryResponseSchema.parse(JSON.parse(outputText));
}
