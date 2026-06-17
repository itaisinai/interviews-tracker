export type {
  PipelineType,
  Priority,
  JobStatus,
  InteractionStatus,
  InteractionType,
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
  CompanyResearchApplyResponse,
  InteractionDraft,
  PersonResearchInput,
  PersonResearchResult
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

export type Person = {
  id: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  research?: {
    about?: string;
    experience?: unknown;
    education?: unknown;
    skills?: unknown;
    sources?: unknown;
  } | null;
};
