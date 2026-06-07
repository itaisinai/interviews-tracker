export type {
  PipelineType,
  Priority,
  JobStatus,
  InteractionStatus,
  TaskStatus,
  OfferStatus,
  Option,
  OptionsResponse,
  Opportunity,
  Interaction,
  Note,
  Task,
  Compensation,
  CompanySummary,
  CompanyDetail
} from "@interviews-tracker/core";

export type {
  ParsedJobDescription,
  CompanyEnrichment,
  CompanyResearchExistingData,
  CompanyResearchInput,
  CompanyResearchResult,
  CompanyResearchApplyResponse
} from "@interviews-tracker/ai";

export type {
  GmailStatus,
  GmailConnectRequest,
  GmailConnectResponse,
  GmailMessageCandidate,
  GmailEmailClassification,
  GmailSearchCandidate,
  GmailSearchResponse,
  GmailStructuredEmailCalendar as GmailEmailCalendar,
  GmailStructuredEmail,
  GmailSearchQuery,
  GmailSearchCandidateMetadata,
  GmailSearchCandidateClassification
} from "@interviews-tracker/integrations";

export type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft
} from "@interviews-tracker/ai";

export type {
  GmailParsedEmailResponse
} from "@interviews-tracker/api-client";
