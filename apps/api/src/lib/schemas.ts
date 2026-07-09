import { z } from "zod";

export {
  aiParseResponseSchema,
  companyEnrichmentSchema,
  companyResearchApplyInputSchema,
  companyResearchExistingDataSchema,
  companyResearchInputSchema,
  companyResearchResultSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
  personResearchInputSchema,
  personResearchResultSchema,
} from "@interviews-tracker/ai";
export {
  companyInputSchema,
  compensationInputSchema,
  interactionInputSchema,
  interactionStatusSchema,
  jobStatusSchema,
  noteInputSchema,
  offerStatusSchema,
  opportunityInputSchema,
  pipelineTypeSchema,
  prioritySchema,
  taskInputSchema,
  taskStatusSchema,
} from "@interviews-tracker/core";

import { gmailEmailExtractionAnalysisSchema, gmailInteractionDraftSchema } from "@interviews-tracker/ai";

export {
  gmailConnectRequestSchema,
  gmailConnectResponseSchema,
  gmailEmailCalendarSchema,
  gmailEmailClassificationSchema,
  gmailMessageCandidateSchema,
  gmailParseEmailRequestSchema,
  gmailSearchCandidateSchema,
  gmailSearchResponseSchema,
  gmailStatusSchema,
  gmailStructuredEmailSchema,
} from "@interviews-tracker/integrations";

import { gmailStructuredEmailSchema } from "@interviews-tracker/integrations";

export const gmailParseEmailResponseSchema = z.object({
  email: gmailStructuredEmailSchema,
  interaction: gmailInteractionDraftSchema,
  analysis: gmailEmailExtractionAnalysisSchema,
});
