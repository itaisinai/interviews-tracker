import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import type { GmailFlowState } from "../../lib/gmail";
import { gmailFlowMeta } from "../../lib/gmail";
import type { GmailInteractionDraft, GmailMessageCandidate } from "../../lib/types";
import { InlineLoadingState, LoadingButton, ProcessStateCard } from "../loading-state";
import { MaterialIcon } from "../material-icon";

type GmailInteractionPanelProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: () => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function GmailInteractionPanel({ opportunityId, companyName, roleTitle, onSaved }: GmailInteractionPanelProps) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["gmail-status"], queryFn: api.gmailStatus });
  const [flowState, setFlowState] = useState<GmailFlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Connect Gmail, search recent emails, and turn one into an interaction.");
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GmailMessageCandidate[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageCandidate | null>(null);
  const [draft, setDraft] = useState<GmailInteractionDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"connect" | "search" | "parse" | null>(null);
  const activeRunIdRef = useRef(0);

  const isBusy = flowState === "connecting_gmail" || flowState === "searching_emails" || flowState === "fetching_email" || flowState === "parsing_email";
  const currentMeta = gmailFlowMeta[flowState];

  useEffect(() => {
    if (!isBusy) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value < 60) return Math.min(value + 2.5, 60);
        if (value < 88) return Math.min(value + 1.25, 88);
        return value;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [isBusy]);

  useEffect(() => {
    if (flowState === "ready_for_review" || flowState === "failed") {
      setProgress(100);
      return;
    }

    if (flowState === "idle") {
      setProgress(0);
      return;
    }

    setProgress(gmailFlowMeta[flowState].progress);
  }, [flowState]);

  useEffect(() => {
    if (!statusQuery.data?.connected) {
      setSearchResults([]);
      setSelectedEmail(null);
      setDraft(null);
    }
  }, [statusQuery.data?.connected]);

  const searchHint = useMemo(() => `Searching Gmail for "${companyName}" from the last 180 days.`, [companyName]);

  async function connectGmail() {
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setLastAction("connect");
    setFlowState("connecting_gmail");
    setMessage("Opening the Google consent screen for read-only Gmail access.");

    try {
      const response = await api.gmailConnect({ returnTo: `${window.location.pathname}${window.location.search}` });
      if (activeRunIdRef.current !== runId) {
        return;
      }

      window.location.assign(response.authUrl);
    } catch (caughtError) {
      if (activeRunIdRef.current !== runId) {
        return;
      }

      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Gmail connection failed.");
    }
  }

  async function searchEmails() {
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setLastAction("search");
    setFlowState("searching_emails");
    setMessage(searchHint);
    setSearchResults([]);
    setSelectedEmail(null);
    setDraft(null);

    try {
      await sleep(150);
      const response = await api.gmailSearch(opportunityId);

      if (activeRunIdRef.current !== runId) {
        return;
      }

      setSearchResults(response.candidates);
      setFlowState("idle");
      setMessage(response.candidates.length > 0 ? `Found ${response.candidates.length} candidate email${response.candidates.length === 1 ? "" : "s"}.` : "No matching emails found in Gmail.");
    } catch (caughtError) {
      if (activeRunIdRef.current !== runId) {
        return;
      }

      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Gmail search failed.");
    }
  }

  async function parseEmail(email: GmailMessageCandidate) {
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setLastAction("parse");
    setSelectedEmail(email);
    setDraft(null);
    setFlowState("fetching_email");
    setMessage(`Fetching the full body for "${email.subject}".`);

    try {
      await sleep(180);
      setFlowState("parsing_email");
      setMessage("Parsing the email into interaction fields.");

      const response = await api.gmailParseEmail(opportunityId, { messageId: email.id });

      if (activeRunIdRef.current !== runId) {
        return;
      }

      setSelectedEmail(response.email);
      setDraft(response.interaction);
      setFlowState("ready_for_review");
      setMessage("Ready for review.");
    } catch (caughtError) {
      if (activeRunIdRef.current !== runId) {
        return;
      }

      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Gmail email parsing failed.");
    }
  }

  async function retryLastAction() {
    if (lastAction === "connect") {
      await connectGmail();
      return;
    }

    if (lastAction === "search") {
      await searchEmails();
      return;
    }

    if (lastAction === "parse" && selectedEmail) {
      await parseEmail(selectedEmail);
    }
  }

  const saveInteraction = useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error("No parsed interaction is ready to save.");
      }

      return api.createInteraction(opportunityId, draft);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["company", companyName] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSaveMessage("Interaction created.");
      setDraft(null);
      setSelectedEmail(null);
      onSaved?.();
    },
    onError: (caughtError) => {
      setSaveError(getErrorMessage(caughtError));
    }
  });

  if (statusQuery.isLoading) {
    return (
      <section className="panel border border-outline-variant p-6">
        <ProcessStateCard
          title="Gmail"
          message="Checking Gmail connection status."
          description="This verifies whether the separate Gmail OAuth connection is already available."
          tone="busy"
          progress={15}
        />
      </section>
    );
  }

  const connected = statusQuery.data?.connected ?? false;
  const configured = statusQuery.data?.configured ?? false;

  return (
    <section className="panel border border-outline-variant p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MaterialIcon name="mail" />
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Gmail interaction</p>
              <h3 className="font-title-md text-title-md font-bold">{companyName}</h3>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-body-md text-on-surface-variant">
            Search recent Gmail threads for this company, parse one email with AI, and review it before saving as an interaction.
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {roleTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {statusQuery.isFetching ? <InlineLoadingState label="Refreshing" /> : null}
          {connected ? (
            <LoadingButton className="btn btn-primary" loading={flowState === "searching_emails"} loadingLabel="Searching..." icon="search" onClick={() => void searchEmails()}>
              Add interaction from Gmail
            </LoadingButton>
          ) : configured ? (
            <LoadingButton className="btn btn-primary" loading={flowState === "connecting_gmail"} loadingLabel="Connecting..." icon="link" onClick={() => void connectGmail()}>
              Connect Gmail
            </LoadingButton>
          ) : (
            <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-body-md text-on-error-container">
              Gmail OAuth is not configured on this environment.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ProcessStateCard
          title="Gmail flow"
          message={currentMeta.label}
          description={message}
          tone={flowState === "failed" ? "danger" : currentMeta.tone}
          progress={progress}
        />
      </div>

      {error && flowState === "failed" ? (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Gmail action failed</p>
          <p className="mt-1 font-body-md text-body-md">{error}</p>
          <div className="mt-3">
            <LoadingButton className="btn btn-secondary" loading={false} icon="refresh" onClick={() => void retryLastAction()}>
              Retry
            </LoadingButton>
          </div>
        </div>
      ) : null}

      {connected ? (
        <div className="mt-6">
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-label-md text-label-md uppercase text-on-surface-variant">Candidate emails</p>
                <LoadingButton
                  className="font-label-md text-label-md text-primary hover:underline"
                  disabled={Boolean(draft)}
                  loading={flowState === "searching_emails"}
                  loadingLabel="Searching..."
                  icon="search"
                  onClick={() => void searchEmails()}
                >
                  Search again
                </LoadingButton>
              </div>
              {searchResults.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const isParsing = isSelected && (flowState === "fetching_email" || flowState === "parsing_email");

                return (
                  <button
                    key={email.id}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-outline-variant bg-white hover:bg-surface-container-low"}`}
                    disabled={flowState === "connecting_gmail" || flowState === "searching_emails" || flowState === "fetching_email" || flowState === "parsing_email" || Boolean(draft)}
                    onClick={() => void parseEmail(email)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-on-background">{email.subject}</p>
                        <p className="mt-1 text-body-md text-on-surface-variant">{email.from}</p>
                      </div>
                      <p className="shrink-0 text-body-md text-on-surface-variant">{new Date(email.date).toLocaleDateString()}</p>
                    </div>
                    <p className="mt-3 text-body-md text-on-surface-variant">{email.snippet}</p>
                    {isParsing ? (
                      <div className="mt-3">
                        <InlineLoadingState label={flowState === "fetching_email" ? "Fetching" : "Parsing"} />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : flowState === "idle" && connected ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
              No candidate emails loaded yet. Search Gmail to start.
            </div>
          ) : null}
        </div>
      ) : null}

      {draft && selectedEmail ? (
        <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review interaction</p>
              <h4 className="font-title-md text-title-md font-bold">{selectedEmail.subject}</h4>
              <p className="mt-1 text-body-md text-on-surface-variant">{selectedEmail.from}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LoadingButton className="btn btn-secondary" disabled={saveInteraction.isPending} icon="close" onClick={() => { setDraft(null); setSelectedEmail(null); setMessage("Ready to search Gmail again."); }}>
                Select another email
              </LoadingButton>
              <LoadingButton className="btn btn-primary" loading={saveInteraction.isPending} loadingLabel="Saving..." icon="save" onClick={() => void saveInteraction.mutate()}>
                Save interaction
              </LoadingButton>
            </div>
          </div>

          {saveMessage ? <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">{saveMessage}</p> : null}
          {saveError ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p> : null}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Date">
              <input
                className="input"
                type="datetime-local"
                value={draft.date.slice(0, 16)}
                onChange={(event) => setDraft({ ...draft, date: event.target.value ? new Date(event.target.value).toISOString() : draft.date })}
              />
            </Field>
            <Field label="Type">
              <input className="input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} />
            </Field>
            <Field label="Stage">
              <input className="input" value={draft.stage ?? ""} onChange={(event) => setDraft({ ...draft, stage: event.target.value || null })} />
            </Field>
            <Field label="Status">
              <select className="input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as GmailInteractionDraft["status"] })}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="DONE">DONE</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NEEDS_FOLLOW_UP">NEEDS_FOLLOW_UP</option>
              </select>
            </Field>
            <Field label="Person name">
              <input className="input" value={draft.personName ?? ""} onChange={(event) => setDraft({ ...draft, personName: event.target.value || null })} />
            </Field>
            <Field label="Person role">
              <input className="input" value={draft.personRole ?? ""} onChange={(event) => setDraft({ ...draft, personRole: event.target.value || null })} />
            </Field>
            <Field label="Agenda">
              <textarea className="input min-h-24" value={draft.agenda ?? ""} onChange={(event) => setDraft({ ...draft, agenda: event.target.value || null })} />
            </Field>
            <Field label="Notes">
              <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} />
            </Field>
            <Field label="Outcome">
              <textarea className="input min-h-24" value={draft.outcome ?? ""} onChange={(event) => setDraft({ ...draft, outcome: event.target.value || null })} />
            </Field>
            <Field label="Follow-up">
              <textarea className="input min-h-24" value={draft.followUp ?? ""} onChange={(event) => setDraft({ ...draft, followUp: event.target.value || null })} />
            </Field>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
