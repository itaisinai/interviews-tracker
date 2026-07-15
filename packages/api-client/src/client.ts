import type {
  CompanyEnrichment,
  CompanyResearchApplyResponse,
  CompanyResearchInput,
  CompanyResearchResult,
  InteractionDraft,
  ParsedJobDescription,
  PersonResearchInput,
  PersonResearchResult,
} from "@interviews-tracker/ai";
import type {
  CompanyDetail,
  CompanySummary,
  Interaction,
  Opportunity,
  OptionsResponse,
} from "@interviews-tracker/core";
import type {
  GmailConnectResponse,
  GmailSearchResponse,
  GmailStatus,
  GmailStructuredEmail,
} from "@interviews-tracker/integrations";

import { getApiError } from "./error.js";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

type AccessTokenGetter = () => Promise<string>;

export type GmailParsedEmailResponse = {
  email: GmailStructuredEmail;
  interaction: InteractionDraft;
  analysis: import("@interviews-tracker/ai").GmailEmailExtractionAnalysis;
};

let accessTokenGetter: AccessTokenGetter | undefined;

export function setAccessTokenGetter(getter: AccessTokenGetter | undefined) {
  accessTokenGetter = getter;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!accessTokenGetter) {
    throw new Error("API auth token is not ready");
  }

  const token = await accessTokenGetter();

  if (!token) {
    throw new Error("API auth token is empty");
  }

  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await getApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () =>
    request<{
      counts: Record<string, number>;
      upcomingInteractions: Interaction[];
      activeProcesses: Opportunity[];
      advancedStatusOpportunities: Opportunity[];
      needingFollowUp: Opportunity[];
    }>("/dashboard"),
  options: () => request<OptionsResponse>("/options"),
  addDomain: (label: string) => request("/options/domain", { method: "POST", body: JSON.stringify({ label }) }),
  addOption: (kind: string, label: string) =>
    request(`/options/${kind}`, { method: "POST", body: JSON.stringify({ label }) }),
  opportunities: (query = "") => request<Opportunity[]>(`/opportunities${query}`),
  opportunitiesLightweight: () =>
    request<
      Array<{
        id: string;
        slug: string;
        roleTitle: string;
        status: string;
        pipelineType: string;
        referrerOrConnection: string | null;
        nextStep: string | null;
        jobUrl: string | null;
        updatedAt: string;
        company: { id: string; name: string };
        interactions: Array<{ id: string; date: string; type: string }>;
      }>
    >("/opportunities/lightweight"),
  opportunity: (slug: string) => request<Opportunity>(`/opportunities/${slug}`),
  createOpportunity: (body: unknown) =>
    request<Opportunity>("/opportunities", { method: "POST", body: JSON.stringify(body) }),
  updateOpportunity: (slug: string, body: unknown) =>
    request<Opportunity>(`/opportunities/${slug}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteOpportunity: (slug: string) => request<void>(`/opportunities/${slug}`, { method: "DELETE" }),
  deletePerson: (slug: string) => request<void>(`/people/${slug}`, { method: "DELETE" }),
  createInteraction: (opportunitySlug: string, body: unknown) =>
    request<Interaction>(`/opportunities/${opportunitySlug}/interactions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateInteraction: (slug: string, body: unknown) =>
    request<Interaction>(`/interactions/${slug}`, { method: "PUT", body: JSON.stringify(body) }),
  interactions: () => request<Interaction[]>("/interactions"),
  createGlobalInteraction: (body: unknown) =>
    request<Interaction>("/interactions", { method: "POST", body: JSON.stringify(body) }),
  deleteInteraction: (slug: string) => request<void>(`/interactions/${slug}`, { method: "DELETE" }),
  companies: () => request<CompanySummary[]>("/companies"),
  companiesLightweight: () =>
    request<
      Array<{
        id: string;
        slug: string;
        name: string;
        isWatchlisted: boolean;
        location: string | null;
        funding: string | null;
        lastResearchedAt: string | null;
        updatedAt: string;
        employees: string | null;
        stage: string | null;
        domains: string[];
        rolesCount: number;
        activeProcesses: number;
        potentialOpportunities: number;
        interactionsCount: number;
        nextInteraction: { date: string; type: string } | null;
        status: string;
      }>
    >("/companies/lightweight"),
  company: (companyName: string) => request<CompanyDetail>(`/companies/${encodeURIComponent(companyName)}`),
  updateCompany: (slugOrId: string, body: unknown) =>
    request<CompanyDetail>(`/companies/${encodeURIComponent(slugOrId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  enrichCompany: (companyName: string, text: string) =>
    request<{ enrichment: CompanyEnrichment; updatedOpportunities: number }>(
      `/companies/${encodeURIComponent(companyName)}/enrich`,
      { method: "POST", body: JSON.stringify({ text }) }
    ),
  researchCompany: (companySlugOrId: string, body: CompanyResearchInput) =>
    request<{ research: CompanyResearchResult }>(`/companies/${encodeURIComponent(companySlugOrId)}/research`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  applyCompanyResearch: (
    companySlugOrId: string,
    body: { targetOpportunitySlug?: string | null; research: CompanyResearchResult }
  ) =>
    request<CompanyResearchApplyResponse>(`/companies/${encodeURIComponent(companySlugOrId)}/research/apply`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteCompany: (companyName: string) =>
    request<void>(`/companies/${encodeURIComponent(companyName)}`, { method: "DELETE" }),
  gmailStatus: () => request<GmailStatus>("/gmail/status"),
  gmailConnect: (body: { returnTo?: string }) =>
    request<GmailConnectResponse>("/gmail/connect", { method: "POST", body: JSON.stringify(body) }),
  gmailDisconnect: () => request<void>("/gmail/connection", { method: "DELETE" }),
  gmailSearch: (opportunitySlug: string) =>
    request<GmailSearchResponse>(`/opportunities/${opportunitySlug}/gmail/search`),
  gmailFindOpportunityCandidates: (
    pageToken?: string | null,
    maxResults = 10,
    includeSupressed = false,
    daysBack = 7
  ) =>
    request<GmailSearchResponse & { nextPageToken: string | null }>(
      `/gmail/opportunity-candidates?${new URLSearchParams({
        maxResults: String(maxResults),
        ...(pageToken ? { pageToken } : {}),
        ...(includeSupressed ? { includeSupressed: "true" } : {}),
        daysBack: String(daysBack),
      }).toString()}`
    ),
  gmailParseOpportunityCandidate: (messageIdOrIds: string | string[]) =>
    request<{ email: GmailStructuredEmail; parsed: ParsedJobDescription }>("/gmail/opportunity-candidates/parse", {
      method: "POST",
      body: JSON.stringify(
        typeof messageIdOrIds === "string" ? { messageId: messageIdOrIds } : { messageIds: messageIdOrIds }
      ),
    }),
  gmailRestoreMessage: (messageId: string) =>
    request<{ success: boolean }>(`/gmail/message-state/${messageId}`, {
      method: "DELETE",
    }),
  gmailMessageStates: (opportunitySlug: string) =>
    request<{
      removedEmails: Array<{ id: string; subject: string; date: string }>;
      pickedEmails: Array<{ id: string; subject: string; date: string }>;
      ignoredEmails: Array<{ id: string; subject: string; date: string }>;
    }>(`/opportunities/${opportunitySlug}/gmail/message-states`),
  gmailParseEmail: (opportunitySlug: string, body: { messageId?: string; messageIds?: string[] }) =>
    request<GmailParsedEmailResponse>(`/opportunities/${opportunitySlug}/gmail/parse-email`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  gmailSyncAttached: (opportunitySlug: string) =>
    request<{ scannedMessages: number; updatedInteractions: number }>(
      `/opportunities/${opportunitySlug}/gmail/sync-attached`,
      { method: "POST" }
    ),
  gmailHideEmail: (opportunitySlug: string, messageId: string) =>
    request<void>(`/opportunities/${opportunitySlug}/gmail/messages/${encodeURIComponent(messageId)}/hide`, {
      method: "POST",
    }),
  gmailRestoreEmail: (opportunitySlug: string, messageId: string) =>
    request<void>(`/opportunities/${opportunitySlug}/gmail/messages/${encodeURIComponent(messageId)}/hide`, {
      method: "DELETE",
    }),
  gmailUnpickEmail: (opportunitySlug: string, messageId: string) =>
    request<void>(`/opportunities/${opportunitySlug}/gmail/messages/${encodeURIComponent(messageId)}/used`, {
      method: "DELETE",
    }),
  gmailIgnoreEmail: (opportunitySlug: string, messageId: string) =>
    request<void>(`/opportunities/${opportunitySlug}/gmail/messages/${encodeURIComponent(messageId)}/ignore`, {
      method: "POST",
    }),
  gmailUnignoreEmail: (opportunitySlug: string, messageId: string) =>
    request<void>(`/opportunities/${opportunitySlug}/gmail/messages/${encodeURIComponent(messageId)}/ignore`, {
      method: "DELETE",
    }),
  gmailListIgnoredMessages: () =>
    request<{ ignoredMessages: Array<{ id: string; subject: string; date: string; opportunityId: string | null }> }>(
      "/gmail/ignored-messages"
    ),
  gmailIgnoreGlobal: (messageId: string) =>
    request<void>(`/gmail/ignored-messages/${encodeURIComponent(messageId)}`, { method: "POST" }),
  gmailUnignoreGlobal: (messageId: string) =>
    request<void>(`/gmail/ignored-messages/${encodeURIComponent(messageId)}`, { method: "DELETE" }),
  parseOpportunityInteractionText: (opportunitySlug: string, body: { text: string }) =>
    request<{ interaction: InteractionDraft }>(`/opportunities/${opportunitySlug}/interactions/parse-text`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteOption: (kind: string, id: string) => request<void>(`/options/${kind}/${id}`, { method: "DELETE" }),
  parseJob: (text: string) =>
    request<ParsedJobDescription>("/ai/parse-job-description", { method: "POST", body: JSON.stringify({ text }) }),
  researchPerson: (body: PersonResearchInput) =>
    request<PersonResearchResult>("/people/research", { method: "POST", body: JSON.stringify(body) }),
  createPerson: (body: {
    name: string;
    email?: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    avatarUrl?: string;
    opportunitySlug?: string;
  }) =>
    request<{
      slug: string;
      name: string;
      email: string | null;
      linkedinUrl: string | null;
      title: string | null;
      company: string | null;
      avatarUrl: string | null;
      research: unknown;
    }>("/people", { method: "POST", body: JSON.stringify(body) }),
  updatePerson: (
    personSlug: string,
    body: { name?: string; email?: string; linkedinUrl?: string; title?: string; company?: string; avatarUrl?: string }
  ) =>
    request<{
      slug: string;
      name: string;
      email: string | null;
      linkedinUrl: string | null;
      title: string | null;
      company: string | null;
      avatarUrl: string | null;
      research: unknown;
    }>(`/people/${personSlug}`, { method: "PUT", body: JSON.stringify(body) }),
  savePersonResearch: (personSlug: string, research: PersonResearchResult["research"]) =>
    request<unknown>(`/people/${personSlug}/research`, { method: "POST", body: JSON.stringify({ research }) }),
  parseCurrentJob: (personSlug: string, jobDescriptionText: string) =>
    request<{ parsedJob: unknown; updatedTimeline: unknown; currentTimeline: unknown }>(
      `/people/${personSlug}/parse-current-job`,
      { method: "POST", body: JSON.stringify({ jobDescriptionText }) }
    ),
  applyJobUpdate: (personSlug: string, updatedTimeline: unknown) =>
    request<unknown>(`/people/${personSlug}/apply-job-update`, {
      method: "POST",
      body: JSON.stringify({ updatedTimeline }),
    }),
  getPerson: (personSlug: string) =>
    request<{
      slug: string;
      name: string;
      email: string | null;
      linkedinUrl: string | null;
      title: string | null;
      company: string | null;
      avatarUrl: string | null;
      research: unknown;
    }>(`/people/${personSlug}`),
  searchPeople: (query?: string) =>
    request<
      Array<{
        slug: string;
        name: string;
        email: string | null;
        linkedinUrl: string | null;
        title: string | null;
        company: string | null;
        avatarUrl: string | null;
        research: unknown;
      }>
    >(`/people${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  getOpportunityContacts: (opportunitySlug: string) =>
    request<
      Array<{
        slug: string;
        ownerEmail: string;
        name: string;
        email: string | null;
        linkedinUrl: string | null;
        title: string | null;
        company: string | null;
        avatarUrl: string | null;
        research: unknown;
      }>
    >(`/opportunities/${opportunitySlug}/contacts`),
  listInteractionEmails: (interactionSlug: string) =>
    request<
      Array<{
        id: string;
        interactionId: string;
        gmailMessageId: string;
        subject: string | null;
        from: string | null;
        receivedDate: string | null;
        extractedData: unknown;
        attachedAt: string;
      }>
    >(`/interactions/${interactionSlug}/emails`),
  attachEmailToInteraction: (interactionSlug: string, gmailMessageId: string) =>
    request<{
      email: {
        id: string;
        interactionId: string;
        gmailMessageId: string;
        subject: string | null;
        from: string | null;
        receivedDate: string | null;
        extractedData: unknown;
        attachedAt: string;
      };
      interaction: unknown;
      aiSuggestion: unknown;
      alreadyAttached?: boolean;
    }>(`/interactions/${interactionSlug}/emails`, { method: "POST", body: JSON.stringify({ gmailMessageId }) }),
  attachMultipleEmailsToInteraction: (interactionSlug: string, gmailMessageIds: string[]) =>
    request<{
      attachedEmails: Array<{
        id: string;
        interactionId: string;
        gmailMessageId: string;
        subject: string | null;
        from: string | null;
        receivedDate: string | null;
        extractedData: unknown;
        attachedAt: string;
      }>;
      interaction: unknown;
      aiSuggestion: unknown;
    }>(`/interactions/${interactionSlug}/emails`, { method: "POST", body: JSON.stringify({ gmailMessageIds }) }),
  removeEmailFromInteraction: (interactionSlug: string, emailId: string) =>
    request<void>(`/interactions/${interactionSlug}/emails/${emailId}`, { method: "DELETE" }),
  reparseInteractionEmails: (interactionSlug: string) =>
    request<unknown>(`/interactions/${interactionSlug}/reparse`, { method: "POST" }),
  listInteractionFeedback: (interactionSlug: string) =>
    request<
      Array<{
        id: string;
        interactionId: string;
        content: string;
        source: string | null;
        extractedData: unknown;
        attachedAt: string;
      }>
    >(`/interactions/${interactionSlug}/feedback`),
  addFeedbackToInteraction: (interactionSlug: string, content: string, source?: string) =>
    request<unknown>(`/interactions/${interactionSlug}/feedback`, {
      method: "POST",
      body: JSON.stringify({ content, source }),
    }),
  markPersonAsWrong: (personSlug: string, opportunitySlug: string, searchContext: string, notes?: string) =>
    request<{ success: boolean; wrongCandidateId: string }>(`/people/${personSlug}/mark-wrong`, {
      method: "POST",
      body: JSON.stringify({ opportunitySlug, searchContext, notes }),
    }),
  markResearchAsWrongCandidate: (body: {
    opportunitySlug: string;
    linkedinUrl: string;
    personName: string;
    company?: string;
    title?: string;
    avatarUrl?: string;
    searchContext?: string;
    notes?: string;
  }) =>
    request<{ success: boolean; wrongCandidateId: string }>("/people/mark-wrong-candidate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getWrongPersonCandidates: (opportunitySlug: string) =>
    request<
      Array<{
        id: string;
        opportunitySlug: string;
        searchContext: string;
        personName: string;
        linkedinUrl: string | null;
        company: string | null;
        title: string | null;
        avatarUrl: string | null;
        rejectedAt: string;
        notes: string | null;
      }>
    >(`/people/wrong-candidates/${opportunitySlug}`),
  telegramQuery: (text: string) =>
    request<{
      success: boolean;
      intent?: {
        type: string;
        confidence: number;
        reasoning: string;
      };
      messages: Array<{
        role: "user" | "bot";
        text: string;
        timestamp: string;
      }>;
      data?: unknown;
      error?: string;
    }>("/telegram/query", { method: "POST", body: JSON.stringify({ text }) }),
};
