import { z } from "zod";

export {
  pipelineTypeSchema,
  prioritySchema,
  jobStatusSchema,
  interactionStatusSchema,
  taskStatusSchema,
  offerStatusSchema,
  opportunityInputSchema,
  interactionInputSchema,
  noteInputSchema,
  taskInputSchema,
  compensationInputSchema
} from "@interviews-tracker/core";

export {
  companyResearchExistingDataSchema,
  companyResearchInputSchema,
  companyResearchResultSchema,
  companyResearchApplyInputSchema,
  aiParseResponseSchema,
  companyEnrichmentSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
  personResearchInputSchema,
  personResearchResultSchema
} from "@interviews-tracker/ai";

import {
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema
} from "@interviews-tracker/ai";

export {
  gmailMessageCandidateSchema,
  gmailEmailCalendarSchema,
  gmailStructuredEmailSchema,
  gmailEmailClassificationSchema,
  gmailSearchCandidateSchema,
  gmailStatusSchema,
  gmailConnectRequestSchema,
  gmailConnectResponseSchema,
  gmailSearchResponseSchema,
  gmailParseEmailRequestSchema
} from "@interviews-tracker/integrations";

import {
  gmailStructuredEmailSchema
} from "@interviews-tracker/integrations";

export const gmailParseEmailResponseSchema = z.object({
  email: gmailStructuredEmailSchema,
  interaction: gmailInteractionDraftSchema,
  analysis: gmailEmailExtractionAnalysisSchema
});
