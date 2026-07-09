/**
 * Telegram query answering with AI using function calling
 * AI chooses which tools to call to answer user questions
 */

import { z } from "zod";

import { createTimer, logInfo } from "../../lib/logger.js";

import {
  allTools as telegramQueryTools,
  getInteractionDetails,
  getNextInteractionForCompany,
  getNextInteractions,
  getOpportunitiesByStatus,
  searchOpportunities,
  type ToolCall,
} from "./tools/index.js";

export const queryResponseSchema = z.object({
  answer: z.string(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  relevantOpportunities: z
    .array(
      z.object({
        id: z.string(),
        companyName: z.string(),
        roleTitle: z.string(),
        slug: z.string().nullable(),
      })
    )
    .optional(),
});

export type QueryResponse = z.infer<typeof queryResponseSchema>;

const queryResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "needsClarification", "clarificationQuestion", "relevantOpportunities"],
  properties: {
    answer: {
      type: "string",
    },
    needsClarification: {
      type: "boolean",
    },
    clarificationQuestion: {
      type: ["string", "null"],
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
          slug: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

const QUERY_ANSWERING_SYSTEM_PROMPT = `You are a helpful assistant for a job opportunity tracking system.

Current date and time: {{CURRENT_DATETIME}}

Your task: Answer questions about the user's job opportunities by calling the appropriate functions to get real data.

Available functions:
- getNextInteractions: Get upcoming scheduled interactions
- getOpportunitiesByStatus: Get opportunities by pipeline type (ACTIVE_PROCESS, POTENTIAL, ARCHIVED)
- getInteractionDetails: Get full details of a specific interaction including participants
- searchOpportunities: Search for opportunities by company name
- getNextInteractionForCompany: Get next interaction for a specific company

Guidelines:
1. Call functions to get the data you need - don't make up information
2. Use current date/time to determine what "next" or "upcoming" means
3. If data is missing, set needsClarification=true and ask a specific question
4. Keep answers concise and helpful (2-5 sentences)
5. Include relevant opportunities in relevantOpportunities array (id, companyName, roleTitle, slug)
6. Format dates in a friendly way (e.g., "tomorrow at 2pm", "Monday June 30")
7. DO NOT include opportunity IDs or slugs in the text answer - users don't need to see technical IDs

Examples:
Query: "What's my next interview?"
Actions: Call getNextInteractions(limit=5) → Format first result
Answer: "Your next interview is tomorrow at 2pm with Google (Senior Engineer role) - a Technical Interview with Sarah Chen. Good luck!"

Query: "What are my active processes?"
Actions: Call getOpportunitiesByStatus(pipelineType="ACTIVE_PROCESS") → List all
Answer: "You have 3 active processes: Google (Senior Engineer - Technical Interview tomorrow), Meta (Frontend Lead - waiting for response), Stripe (Backend Engineer - final round on June 30)."

Query: "Who are the participants in my next interaction with Google?"
Actions: Call getNextInteractionForCompany(companyName="Google") → Get ID → Call getInteractionDetails(interactionId) → List participants
Answer: "You'll meet with Sarah Chen (Tech Lead, 5 years) and Michael Park (Senior Engineer, 3 years) for the Google Technical Interview."`;

/**
 * Execute a tool call and return the result
 */
async function executeToolCall(toolCall: ToolCall, ownerEmail: string): Promise<unknown> {
  const args = toolCall.arguments;

  logInfo("telegram", `Executing tool: ${toolCall.name}`, { args });

  switch (toolCall.name) {
    case "getNextInteractions":
      return getNextInteractions(ownerEmail, (args.limit as number | undefined) ?? 10);

    case "getOpportunitiesByStatus":
      return getOpportunitiesByStatus(
        ownerEmail,
        args.pipelineType as "ACTIVE_PROCESS" | "POTENTIAL" | "ARCHIVED" | undefined
      );

    case "getInteractionDetails":
      if (!args.interactionId || typeof args.interactionId !== "string") {
        throw new Error("interactionId is required for getInteractionDetails");
      }
      return getInteractionDetails(args.interactionId);

    case "searchOpportunities":
      if (!args.companyName || typeof args.companyName !== "string") {
        throw new Error("companyName is required for searchOpportunities");
      }
      return searchOpportunities(ownerEmail, args.companyName);

    case "getNextInteractionForCompany":
      if (!args.companyName || typeof args.companyName !== "string") {
        throw new Error("companyName is required for getNextInteractionForCompany");
      }
      return getNextInteractionForCompany(ownerEmail, args.companyName);

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}

/**
 * Answer a user query using function calling
 */
export async function answerOpportunityQuery(input: {
  query: string;
  ownerEmail: string;
  webAppBaseUrl: string;
}): Promise<QueryResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for query answering");
  }

  const timer = createTimer("llm", "answer opportunity query with function calling", {});

  const currentDateTime = new Date().toISOString();
  const systemPrompt = QUERY_ANSWERING_SYSTEM_PROMPT.replace("{{CURRENT_DATETIME}}", currentDateTime);

  const messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  }> = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `User query: ${input.query}`,
    },
  ];

  let iterationCount = 0;
  const maxIterations = 5; // Prevent infinite loops

  while (iterationCount < maxIterations) {
    iterationCount++;

    logInfo("telegram", `Query answering iteration ${iterationCount}`, {});

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages,
        tools: telegramQueryTools,
        tool_choice: iterationCount === 1 ? "auto" : "none", // First call can use tools, subsequent calls should respond
      }),
    });

    if (!response.ok) {
      timer.fail(new Error(`Query answering failed: ${response.status}`), {});
      throw new Error(`Query answering failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          role?: string;
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };

    const choice = payload.choices?.[0];
    const message = choice?.message;

    if (!message) {
      timer.fail(new Error("No message in response"), {});
      throw new Error("No message in response");
    }

    // If AI wants to call tools, execute them
    if (message.tool_calls && message.tool_calls.length > 0) {
      logInfo("telegram", `AI requested ${message.tool_calls.length} tool calls`, {});

      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      // Execute all tool calls
      for (const toolCall of message.tool_calls) {
        try {
          const toolCallParsed: ToolCall = {
            id: toolCall.id,
            name: toolCall.function.name as ToolCall["name"],
            arguments: JSON.parse(toolCall.function.arguments),
          };

          const result = await executeToolCall(toolCallParsed, input.ownerEmail);

          // Add tool result to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          logInfo("telegram", `Tool call failed: ${toolCall.function.name}`, {
            error: error instanceof Error ? error.message : "Unknown error",
          });

          // Add error result
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : "Tool execution failed",
            }),
          });
        }
      }

      // Continue loop to get final answer
      continue;
    }

    // AI provided final answer (no more tool calls)
    if (message.content) {
      // Parse the final structured response
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            ...messages,
            {
              role: "assistant",
              content: message.content,
            },
            {
              role: "user",
              content: "Format your answer as JSON according to the schema.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "answer_opportunity_query",
              strict: true,
              schema: queryResponseJsonSchema,
            },
          },
        }),
      });

      if (!finalResponse.ok) {
        timer.fail(new Error(`Final formatting failed: ${finalResponse.status}`), {});
        throw new Error(`Final formatting failed: ${finalResponse.status} ${await finalResponse.text()}`);
      }

      const finalPayload = (await finalResponse.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const finalContent = finalPayload.choices?.[0]?.message?.content;

      if (!finalContent) {
        timer.fail(new Error("No final content"), {});
        throw new Error("No final content");
      }

      timer.end({});
      return queryResponseSchema.parse(JSON.parse(finalContent));
    }

    // Should not reach here
    break;
  }

  timer.fail(new Error("Max iterations reached"), {});
  throw new Error("Query answering exceeded maximum iterations");
}
