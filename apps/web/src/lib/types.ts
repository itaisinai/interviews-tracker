export type {
  CompanyEnrichment,
  CompanyResearchApplyResponse,
  CompanyResearchExistingData,
  CompanyResearchInput,
  CompanyResearchResult,
  InteractionDraft,
  ParsedJobDescription,
  PersonResearchInput,
  PersonResearchResult,
} from "@interviews-tracker/ai";
export type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
} from "@interviews-tracker/ai";
export type { GmailParsedEmailResponse } from "@interviews-tracker/api-client";
export type {
  CompanyDetail,
  CompanySummary,
  Interaction,
  InteractionStatus,
  InteractionType,
  JobStatus,
  OfferStatus,
  Opportunity,
  Option,
  OptionsResponse,
  PipelineType,
  Priority,
  TaskStatus,
} from "@interviews-tracker/core";
export type {
  GmailConnectRequest,
  GmailConnectResponse,
  GmailStructuredEmailCalendar as GmailEmailCalendar,
  GmailEmailClassification,
  GmailMessageCandidate,
  GmailSearchCandidate,
  GmailSearchCandidateClassification,
  GmailSearchCandidateMetadata,
  GmailSearchQuery,
  GmailSearchResponse,
  GmailStatus,
  GmailStructuredEmail,
} from "@interviews-tracker/integrations";

export type Person = {
  slug: string;
  ownerEmail: string; // Email of user who owns this contact
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
