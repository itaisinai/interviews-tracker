import { describe, it, expect } from "vitest";
import { messageIntentSchema, queryResponseSchema } from "./telegram-query-service.js";

describe("telegram-query-service schemas", () => {
  describe("messageIntentSchema", () => {
    it("should validate a valid QUERY intent", () => {
      const intent = {
        intent: "QUERY" as const,
        confidence: 0.9,
        reasoning: "Message asks about existing opportunities"
      };

      const result = messageIntentSchema.parse(intent);
      expect(result.intent).toBe("QUERY");
      expect(result.confidence).toBe(0.9);
    });

    it("should validate a valid CREATE_OPPORTUNITY intent", () => {
      const intent = {
        intent: "CREATE_OPPORTUNITY" as const,
        confidence: 0.95,
        reasoning: "Message contains job description"
      };

      const result = messageIntentSchema.parse(intent);
      expect(result.intent).toBe("CREATE_OPPORTUNITY");
      expect(result.confidence).toBe(0.95);
    });

    it("should reject invalid confidence values", () => {
      const intent = {
        intent: "QUERY" as const,
        confidence: 1.5, // > 1
        reasoning: "test"
      };

      expect(() => messageIntentSchema.parse(intent)).toThrow();
    });
  });

  describe("queryResponseSchema", () => {
    it("should validate a query response with opportunities", () => {
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
      expect(result.answer).toBe("Your next interview is tomorrow at 2pm with Google.");
      expect(result.needsClarification).toBe(false);
      expect(result.relevantOpportunities).toHaveLength(1);
    });

    it("should validate a clarification response", () => {
      const response = {
        answer: "I couldn't find any company called 'Alta'.",
        needsClarification: true,
        clarificationQuestion: "Did you mean a different company name?",
        relevantOpportunities: []
      };

      const result = queryResponseSchema.parse(response);
      expect(result.needsClarification).toBe(true);
      expect(result.clarificationQuestion).toBe("Did you mean a different company name?");
    });
  });
});
