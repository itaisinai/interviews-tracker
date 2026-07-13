import type { api } from "../../lib/api";
import type { ParserRunState } from "../../lib/parser-run";

export type ParsedJobDescription = Awaited<ReturnType<typeof api.parseJob>>;

export type SourceMode = "raw-text" | "search-gmail";

export type GmailCandidatesResult = Awaited<ReturnType<typeof api.gmailFindOpportunityCandidates>>;

export interface OpportunityFormState {
  sourceMode: SourceMode;
  text: string;
  parseResult: ParsedJobDescription | null;
  runState: ParserRunState;
  runError: string | null;
  statusMessage: string;
  progress: number;
  gmailCandidates: GmailCandidatesResult | null;
  gmailPageToken: string | null;
  expandedCompanies: Set<string>;
  selectedEmails: Set<string>;
}
