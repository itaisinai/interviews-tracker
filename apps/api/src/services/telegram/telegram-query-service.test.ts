import test from "node:test";
import assert from "node:assert/strict";
import { messageIntentSchema } from "./telegram-intent-classifier.js";
import { queryResponseSchema } from "./telegram-query-answerer.js";

test("messageIntentSchema validates QUERY intent", () => {
  const intent = {
    intent: "QUERY" as const,
    confidence: 0.9,
    reasoning: "Message asks about existing opportunities"
  };

  const result = messageIntentSchema.parse(intent);
  assert.strictEqual(result.intent, "QUERY");
  assert.strictEqual(result.confidence, 0.9);
});

test("messageIntentSchema validates CREATE_OPPORTUNITY intent", () => {
  const intent = {
    intent: "CREATE_OPPORTUNITY" as const,
    confidence: 0.95,
    reasoning: "Message contains job description"
  };

  const result = messageIntentSchema.parse(intent);
  assert.strictEqual(result.intent, "CREATE_OPPORTUNITY");
  assert.strictEqual(result.confidence, 0.95);
});

test("messageIntentSchema rejects invalid confidence values", () => {
  const intent = {
    intent: "QUERY" as const,
    confidence: 1.5, // > 1
    reasoning: "test"
  };

  assert.throws(() => messageIntentSchema.parse(intent));
});

test("queryResponseSchema validates query response with opportunities", () => {
  const response = {
    answer: "Your next interview is tomorrow at 2pm with Google.",
    needsClarification: false,
    clarificationQuestion: null,
    relevantOpportunities: [
      {
        id: "123",
        companyName: "Google",
        roleTitle: "Senior Engineer",
        slug: "google-senior-engineer"
      }
    ]
  };

  const result = queryResponseSchema.parse(response);
  assert.strictEqual(result.answer, "Your next interview is tomorrow at 2pm with Google.");
  assert.strictEqual(result.needsClarification, false);
  assert.strictEqual(result.relevantOpportunities?.length, 1);
  assert.strictEqual(result.relevantOpportunities?.[0]?.slug, "google-senior-engineer");
});

test("queryResponseSchema validates query response with null slug", () => {
  const response = {
    answer: "Your next interview is tomorrow.",
    needsClarification: false,
    clarificationQuestion: null,
    relevantOpportunities: [
      {
        id: "123",
        companyName: "Google",
        roleTitle: "Senior Engineer",
        slug: null
      }
    ]
  };

  const result = queryResponseSchema.parse(response);
  assert.strictEqual(result.relevantOpportunities?.[0]?.slug, null);
});

test("queryResponseSchema validates clarification response", () => {
  const response = {
    answer: "I couldn't find any company called 'Alta'.",
    needsClarification: true,
    clarificationQuestion: "Did you mean a different company name?",
    relevantOpportunities: []
  };

  const result = queryResponseSchema.parse(response);
  assert.strictEqual(result.needsClarification, true);
  assert.strictEqual(result.clarificationQuestion, "Did you mean a different company name?");
});
