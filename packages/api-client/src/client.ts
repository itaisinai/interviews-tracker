import type { CompanyDetail, CompanySummary, Interaction, Opportunity, OptionsResponse } from "@interviews-tracker/core";
import type { CompanyEnrichment, CompanyResearchApplyResponse, CompanyResearchInput, CompanyResearchResult, InteractionDraft, ParsedJobDescription, PersonResearchInput, PersonResearchResult } from "@interviews-tracker/ai";
import type { GmailConnectResponse, GmailSearchResponse, GmailStatus, GmailStructuredEmail } from "@interviews-tracker/integrations";
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
    headers
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
  dashboard: () => request<{
    counts: Record<string, number>;
    upcomingInteractions: Interaction[];
    activeProcesses: Opportunity[];
    highPriorityPotential: Opportunity[];
    needingFollowUp: Opportunity[];
  }>("/dashboard"),
  options: () => request<OptionsResponse>("/options"),
  addDomain: (label: string) => request("/options/domain", { method: "POST", body: JSON.stringify({ label }) }),
  addOption: (kind: string, label: string) => request(`/options/${kind}`, { method: "POST", body: JSON.stringify({ label }) }),
  opportunities: (query = "") => request<Opportunity[]>(`/opportunities${query}`),
  opportunity: (id: string) => request<Opportunity>(`/opportunities/${id}`),
  createOpportunity: (body: unknown) => request<Opportunity>("/opportunities", { method: "POST", body: JSON.stringify(body) }),
  updateOpportunity: (id: string, body: unknown) => request<Opportunity>(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteOpportunity: (id: string) => request<void>(`/opportunities/${id}`, { method: "DELETE" }),
  createInteraction: (id: string, body: unknown) => request<Interaction>(`/opportunities/${id}/interactions`, { method: "POST", body: JSON.stringify(body) }),
  updateInteraction: (id: string, body: unknown) => request<Interaction>(`/interactions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  interactions: () => request<Interaction[]>("/interactions"),
  createGlobalInteraction: (body: unknown) => request<Interaction>("/interactions", { method: "POST", body: JSON.stringify(body) }),
  deleteInteraction: (id: string) => request<void>(`/interactions/${id}`, { method: "DELETE" }),
  companies: () => request<CompanySummary[]>("/companies"),
  company: (companyName: string) => request<CompanyDetail>(`/companies/${encodeURIComponent(companyName)}`),
  enrichCompany: (companyName: string, text: string) => request<{ enrichment: CompanyEnrichment; updatedOpportunities: number }>(`/companies/${encodeURIComponent(companyName)}/enrich`, { method: "POST", body: JSON.stringify({ text }) }),
  researchCompany: (companyName: string, body: CompanyResearchInput) => request<{ research: CompanyResearchResult }>(`/companies/${encodeURIComponent(companyName)}/research`, { method: "POST", body: JSON.stringify(body) }),
  applyCompanyResearch: (companyName: string, body: { targetOpportunityId?: string | null; research: CompanyResearchResult }) => request<CompanyResearchApplyResponse>(`/companies/${encodeURIComponent(companyName)}/research/apply`, { method: "POST", body: JSON.stringify(body) }),
  deleteCompany: (companyName: string) => request<void>(`/companies/${encodeURIComponent(companyName)}`, { method: "DELETE" }),
  gmailStatus: () => request<GmailStatus>("/gmail/status"),
  gmailConnect: (body: { returnTo?: string }) => request<GmailConnectResponse>("/gmail/connect", { method: "POST", body: JSON.stringify(body) }),
  gmailDisconnect: () => request<void>("/gmail/connection", { method: "DELETE" }),
  gmailSearch: (id: string) => request<GmailSearchResponse>(`/opportunities/${id}/gmail/search`),
  gmailMessageStates: (id: string) => request<{ removedEmails: Array<{ id: string; subject: string; date: string }>; pickedEmails: Array<{ id: string; subject: string; date: string }> }>(`/opportunities/${id}/gmail/message-states`),
  gmailParseEmail: (id: string, body: { messageId: string }) => request<GmailParsedEmailResponse>(`/opportunities/${id}/gmail/parse-email`, { method: "POST", body: JSON.stringify(body) }),
  gmailSyncAttached: (id: string) => request<{ scannedMessages: number; updatedInteractions: number }>(`/opportunities/${id}/gmail/sync-attached`, { method: "POST" }),
  gmailHideEmail: (id: string, messageId: string) => request<void>(`/opportunities/${id}/gmail/messages/${encodeURIComponent(messageId)}/hide`, { method: "POST" }),
  gmailRestoreEmail: (id: string, messageId: string) => request<void>(`/opportunities/${id}/gmail/messages/${encodeURIComponent(messageId)}/hide`, { method: "DELETE" }),
  gmailUnpickEmail: (id: string, messageId: string) => request<void>(`/opportunities/${id}/gmail/messages/${encodeURIComponent(messageId)}/used`, { method: "DELETE" }),
  parseOpportunityInteractionText: (id: string, body: { text: string }) => request<{ interaction: InteractionDraft }>(`/opportunities/${id}/interactions/parse-text`, { method: "POST", body: JSON.stringify(body) }),
  deleteOption: (kind: string, id: string) => request<void>(`/options/${kind}/${id}`, { method: "DELETE" }),
  parseJob: (text: string) => request<ParsedJobDescription>("/ai/parse-job-description", { method: "POST", body: JSON.stringify({ text }) }),
  researchPerson: (body: PersonResearchInput) => request<PersonResearchResult>("/people/research", { method: "POST", body: JSON.stringify(body) }),
  createPerson: (body: { name: string; email?: string; linkedinUrl?: string; title?: string; company?: string; avatarUrl?: string; jobOpportunityId?: string }) => request<{ id: string; name: string; email: string | null; linkedinUrl: string | null; title: string | null; company: string | null; avatarUrl: string | null; research: unknown }>("/people", { method: "POST", body: JSON.stringify(body) }),
  savePersonResearch: (personId: string, research: PersonResearchResult["research"]) => request<unknown>(`/people/${personId}/research`, { method: "POST", body: JSON.stringify({ research }) }),
  getPerson: (personId: string) => request<{ id: string; name: string; email: string | null; linkedinUrl: string | null; title: string | null; company: string | null; avatarUrl: string | null; research: unknown }>(`/people/${personId}`),
  searchPeople: (query?: string) => request<Array<{ id: string; name: string; email: string | null; linkedinUrl: string | null; title: string | null; company: string | null; avatarUrl: string | null; research: unknown }>>(`/people${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  getOpportunityContacts: (opportunityId: string) => request<Array<{ id: string; name: string; email: string | null; linkedinUrl: string | null; title: string | null; company: string | null; avatarUrl: string | null; research: unknown }>>(`/opportunities/${opportunityId}/contacts`),
  listInteractionEmails: (interactionId: string) => request<Array<{ id: string; interactionId: string; gmailMessageId: string; subject: string | null; from: string | null; receivedDate: string | null; extractedData: unknown; attachedAt: string }>>(`/interactions/${interactionId}/emails`),
  attachEmailToInteraction: (interactionId: string, gmailMessageId: string) => request<{ id: string; interactionId: string; gmailMessageId: string; subject: string | null; from: string | null; receivedDate: string | null; extractedData: unknown; attachedAt: string }>(`/interactions/${interactionId}/emails`, { method: "POST", body: JSON.stringify({ gmailMessageId }) }),
  attachMultipleEmailsToInteraction: (interactionId: string, gmailMessageIds: string[]) => request<{ attachedEmails: Array<{ id: string; interactionId: string; gmailMessageId: string; subject: string | null; from: string | null; receivedDate: string | null; extractedData: unknown; attachedAt: string }> }>(`/interactions/${interactionId}/emails`, { method: "POST", body: JSON.stringify({ gmailMessageIds }) }),
  removeEmailFromInteraction: (interactionId: string, emailId: string) => request<void>(`/interactions/${interactionId}/emails/${emailId}`, { method: "DELETE" }),
  reparseInteractionEmails: (interactionId: string) => request<unknown>(`/interactions/${interactionId}/reparse`, { method: "POST" })
};
