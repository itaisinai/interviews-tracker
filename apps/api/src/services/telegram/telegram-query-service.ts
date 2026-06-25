import { z } from "zod";
import { createTimer } from "../../lib/logger.js";

/**
 * Message intent classification
 */
export const messageIntentSchema = z.object({
  intent: z.enum(["QUERY", "CREATE_OPPORTUNITY"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

export type MessageIntent = z.infer<typeof messageIntentSchema>;

/**
 * Query response structure
 */
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

/**
 * Classifies a telegram message to determine if it's a query or a new opportunity
 */
export async function classifyMessageIntent(message: string): Promise<MessageIntent> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for intent classification");
  }

  const timer = createTimer("llm", "classify telegram message intent", {});

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

  const systemPrompt = `You are an intent classifier for a job opportunity tracking bot.

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
          content: [{ type: "input_text", text: systemPrompt }]
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

/**
 * Answers a query about opportunities using AI + real data
 */
export async function answerOpportunityQuery(input: {
  query: string;
  opportunitiesData: string; // JSON stringified opportunity data filtered by user
  webAppBaseUrl: string;
}): Promise<QueryResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for query answering");
  }

  const timer = createTimer("llm", "answer opportunity query", {});

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

  const systemPrompt = `You are a helpful assistant for a job opportunity tracking system.

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

  const userPrompt = `User query: ${input.query}

Available opportunities data:
${input.opportunitiesData}

Answer the query based on this data.`;

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
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
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
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const outputText = payload.output_text ??
    payload.output?.flatMap(item => item.content ?? [])
      .find(item => item.type === "output_text")?.text;

  if (!outputText) {
    timer.fail(new Error("Query answering returned no text output"), {});
    throw new Error("Query answering returned no text output");
  }

  timer.end({});
  return queryResponseSchema.parse(JSON.parse(outputText));
}
