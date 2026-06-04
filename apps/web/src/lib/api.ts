import type { CompanyDetail, CompanyEnrichment, CompanySummary, Compensation, Interaction, Opportunity, OptionsResponse, ParsedJobDescription, Task } from "./types";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

type AccessTokenGetter = () => Promise<string>;

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

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers
  });
  if (!response.ok) {
    throw new Error(await response.text());
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
    tasksDueThisWeek: Task[];
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
  createOpportunityNote: (id: string, body: unknown) => request(`/opportunities/${id}/notes`, { method: "POST", body: JSON.stringify(body) }),
  createOpportunityTask: (id: string, body: unknown) => request<Task>(`/opportunities/${id}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  interactions: () => request<Interaction[]>("/interactions"),
  createGlobalInteraction: (body: unknown) => request<Interaction>("/interactions", { method: "POST", body: JSON.stringify(body) }),
  deleteInteraction: (id: string) => request<void>(`/interactions/${id}`, { method: "DELETE" }),
  companies: () => request<CompanySummary[]>("/companies"),
  company: (companyName: string) => request<CompanyDetail>(`/companies/${encodeURIComponent(companyName)}`),
  enrichCompany: (companyName: string, text: string) => request<{ enrichment: CompanyEnrichment; updatedOpportunities: number }>(`/companies/${encodeURIComponent(companyName)}/enrich`, { method: "POST", body: JSON.stringify({ text }) }),
  deleteCompany: (companyName: string) => request<void>(`/companies/${encodeURIComponent(companyName)}`, { method: "DELETE" }),
  tasks: () => request<Task[]>("/tasks"),
  createTask: (body: unknown) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),
  compensation: () => request<Compensation[]>("/compensation"),
  upsertCompensation: (body: unknown) => request<Compensation>("/compensation", { method: "POST", body: JSON.stringify(body) }),
  deleteCompensation: (id: string) => request<void>(`/compensation/${id}`, { method: "DELETE" }),
  deleteOption: (kind: string, id: string) => request<void>(`/options/${kind}/${id}`, { method: "DELETE" }),
  parseJob: (text: string) => request<ParsedJobDescription>("/ai/parse-job-description", { method: "POST", body: JSON.stringify({ text }) })
};
