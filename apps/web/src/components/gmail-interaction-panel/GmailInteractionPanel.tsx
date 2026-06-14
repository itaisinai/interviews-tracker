import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@interviews-tracker/api-client";
import { api } from "../../lib/api";
import { interactionStatusOptions, interactionTypeOptions, normalizeInteractionType } from "../../lib/enum-labels";
import { getErrorMessage } from "../../lib/error";
import type { GmailFlowState } from "../../lib/gmail";
import { gmailFlowMeta } from "../../lib/gmail";
import type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
  GmailSearchCandidate,
  GmailStructuredEmail,
  Interaction
} from "../../lib/types";
import { Badge } from "../badge";
import { InlineLoadingState, LoadingButton, ProcessStateCard } from "../loading-state";
import { MaterialIcon } from "../material-icon";

type GmailInteractionPanelProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
  attachToInteractionId?: string | null;
};

type TrackedGmailEmail = {
  id: string;
  subject: string;
  date: string;
};

type GmailMessageStates = {
  removedEmails: TrackedGmailEmail[];
  pickedEmails: TrackedGmailEmail[];
};

const interactionFieldLabels = {
  date: "Date",
  type: "Type",
  stage: "Stage",
  status: "Status",
  personName: "Person name",
  personRole: "Person role",
  agenda: "Agenda",
  meetingLink: "Meeting link",
  notes: "Notes",
  outcome: "Outcome",
  followUp: "Follow-up"
} satisfies Record<InteractionDiffField, string>;

type InteractionDiffField =
  | "date"
  | "type"
  | "stage"
  | "status"
  | "personName"
  | "personRole"
  | "agenda"
  | "meetingLink"
  | "notes"
  | "outcome"
  | "followUp";

const interactionDiffFields = Object.keys(interactionFieldLabels) as InteractionDiffField[];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeComparableValue(field: InteractionDiffField, value: string | null | undefined) {
  if (field === "date") {
    const timestamp = value ? new Date(value).getTime() : Number.NaN;
    return Number.isNaN(timestamp) ? "" : String(timestamp);
  }

  return (value ?? "").trim();
}

function getChangedInteractionFields(existingInteraction: Interaction | null | undefined, draft: GmailInteractionDraft | null) {
  if (!existingInteraction || !draft) {
    return new Set<InteractionDiffField>();
  }

  return new Set(
    interactionDiffFields.filter(
      (field) =>
        normalizeComparableValue(field, existingInteraction[field]) !==
        normalizeComparableValue(field, draft[field])
    )
  );
}

function addPickedEmail(current: GmailMessageStates | undefined, email: TrackedGmailEmail): GmailMessageStates {
  return {
    removedEmails: current?.removedEmails ?? [],
    pickedEmails: [
      email,
      ...(current?.pickedEmails.filter((pickedEmail) => pickedEmail.id !== email.id) ?? [])
    ]
  };
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function GmailInteractionPanel({ opportunityId, companyName, roleTitle, onSaved, attachToInteractionId = null }: GmailInteractionPanelProps) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["gmail-status"], queryFn: api.gmailStatus });
  const [flowState, setFlowState] = useState<GmailFlowState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Connect Gmail, search recent emails, and turn one into an interaction.");
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GmailSearchCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<GmailSearchCandidate | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GmailStructuredEmail | null>(null);
  const [analysis, setAnalysis] = useState<GmailEmailExtractionAnalysis | null>(null);
  const [draft, setDraft] = useState<GmailInteractionDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [clearingEmailId, setClearingEmailId] = useState<string | null>(null);
  const [removedEmailsExpanded, setRemovedEmailsExpanded] = useState(false);
  const [attachTargetId, setAttachTargetId] = useState<string>("");
  const [pendingPickedEmailIds, setPendingPickedEmailIds] = useState<Set<string>>(
    () => new Set()
  );
  const [lastAction, setLastAction] = useState<"connect" | "search" | "parse" | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const activeRunIdRef = useRef(0);
  const isAttachMode = Boolean(attachToInteractionId);

  const isBusy = flowState === "connecting_gmail" || flowState === "searching_emails" || flowState === "fetching_email" || flowState === "parsing_email";
  const currentMeta = gmailFlowMeta[flowState];

  function handleGmailActionError(caughtError: unknown, fallbackMessage: string) {
    const reconnectRequired = caughtError instanceof ApiError && caughtError.code === "GMAIL_RECONNECT_REQUIRED";
    setNeedsReconnect(reconnectRequired);
    setError(reconnectRequired ? "Your Gmail connection expired or was revoked. Please reconnect Gmail." : getErrorMessage(caughtError));
    setFlowState("failed");
    setMessage(reconnectRequired ? "Gmail reconnect required." : fallbackMessage);
    if (reconnectRequired) {
      void queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
    }
  }

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
      setSelectedCandidate(null);
      setSelectedEmail(null);
      setAnalysis(null);
      setDraft(null);
    }
  }, [statusQuery.data?.connected]);

  const gmailMessageStatesQuery = useQuery({
    queryKey: ["gmail-message-states", opportunityId],
    queryFn: () => api.gmailMessageStates(opportunityId),
    enabled: Boolean(statusQuery.data?.connected && opportunityId)
  });

  const opportunityQuery = useQuery({
    queryKey: ["opportunity", opportunityId, "gmail-attach"],
    queryFn: () => api.opportunity(opportunityId),
    enabled: Boolean(statusQuery.data?.connected && opportunityId),
    staleTime: 30_000
  });

  useEffect(() => {
    const interactions = opportunityQuery.data?.interactions ?? [];
    if (!interactions.length) {
      setAttachTargetId("");
      return;
    }

    setAttachTargetId((current) => {
      if (current && interactions.some((interaction) => interaction.id === current)) {
        return current;
      }

      return interactions[interactions.length - 1]?.id ?? "";
    });
  }, [opportunityQuery.data?.interactions]);

  useEffect(() => {
    if (attachToInteractionId) {
      setAttachTargetId(attachToInteractionId);
    }
  }, [attachToInteractionId]);

  const searchHint = useMemo(() => `Searching Gmail for "${companyName}" from the last 180 days.`, [companyName]);
  const attachTargetInteraction = useMemo(
    () =>
      opportunityQuery.data?.interactions.find(
        (interaction) => interaction.id === attachTargetId
      ) ?? null,
    [attachTargetId, opportunityQuery.data?.interactions]
  );
  const changedInteractionFields = useMemo(
    () => getChangedInteractionFields(attachTargetInteraction, draft),
    [attachTargetInteraction, draft]
  );
  const changedFieldLabels = useMemo(
    () =>
      interactionDiffFields
        .filter((field) => changedInteractionFields.has(field))
        .map((field) => interactionFieldLabels[field]),
    [changedInteractionFields]
  );
  const hasParsedInteractionChanges = changedInteractionFields.size > 0;

  async function connectGmail() {
    setNeedsReconnect(false);
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

      handleGmailActionError(caughtError, "Gmail connection failed.");
    }
  }

  async function searchEmails() {
    setNeedsReconnect(false);
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setLastAction("search");
    setFlowState("searching_emails");
    setMessage(searchHint);
    setSearchResults([]);
    setSelectedCandidate(null);
    setSelectedEmail(null);
    setAnalysis(null);
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

      handleGmailActionError(caughtError, "Gmail search failed.");
    }
  }

  async function parseEmail(email: GmailSearchCandidate) {
    setNeedsReconnect(false);
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setLastAction("parse");
    setSelectedCandidate(email);
    setDraft(null);
    setSelectedEmail(null);
    setAnalysis(null);
    setFlowState("fetching_email");
    setMessage(`Fetching the full body for "${email.subject}".`);
    setPendingPickedEmailIds((current) => new Set(current).add(email.id));
    queryClient.setQueryData<GmailMessageStates>(
      ["gmail-message-states", opportunityId],
      (current) =>
        addPickedEmail(current, {
          id: email.id,
          subject: email.subject,
          date: email.date
        })
    );

    try {
      await sleep(180);
      setFlowState("parsing_email");
      setMessage("Parsing the email into interaction fields.");

      const response = await api.gmailParseEmail(opportunityId, { messageId: email.id });

      if (activeRunIdRef.current !== runId) {
        return;
      }

      setSelectedEmail(response.email);
      setAnalysis(response.analysis);
      setDraft({ ...response.interaction, type: normalizeInteractionType(response.interaction.type) });
      setSearchResults((results) => results.filter((candidate) => candidate.id !== email.id));
      queryClient.setQueryData<GmailMessageStates>(
        ["gmail-message-states", opportunityId],
        (current) =>
          addPickedEmail(current, {
            id: email.id,
            subject: email.subject,
            date: email.date
          })
      );
      setFlowState("ready_for_review");
      setMessage("Ready for review.");
    } catch (caughtError) {
      if (activeRunIdRef.current !== runId) {
        return;
      }

      handleGmailActionError(caughtError, "Gmail email parsing failed.");
    }
  }

  async function clearEmail(email: GmailSearchCandidate) {
    setClearingEmailId(email.id);
    setError(null);
    setSaveError(null);

    try {
      await api.gmailHideEmail(opportunityId, email.id);
      setSearchResults((results) => results.filter((candidate) => candidate.id !== email.id));
      setPendingPickedEmailIds((current) => {
        const next = new Set(current);
        next.delete(email.id);
        return next;
      });
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) => ({
        removedEmails: [
          { id: email.id, subject: email.subject, date: email.date },
          ...(current?.removedEmails.filter((hiddenEmail) => hiddenEmail.id !== email.id) ?? [])
        ],
        pickedEmails: current?.pickedEmails ?? []
      }));
      setMessage("Email cleared from future Gmail searches.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not clear email.");
    } finally {
      setClearingEmailId(null);
    }
  }

  async function restoreEmail(email: TrackedGmailEmail) {
    setClearingEmailId(email.id);
    setError(null);

    try {
      await api.gmailRestoreEmail(opportunityId, email.id);
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) => ({
        removedEmails: current?.removedEmails.filter((hiddenEmail) => hiddenEmail.id !== email.id) ?? [],
        pickedEmails: current?.pickedEmails ?? []
      }));
      setMessage("Email restored.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not restore email.");
    } finally {
      setClearingEmailId(null);
    }
  }

  async function attachToExistingInteraction() {
    if (!draft || !selectedEmail || !attachTargetId) {
      return;
    }

    setError(null);
    setSaveError(null);
    setIsAttaching(true);

    try {
      const savedInteraction = await api.updateInteraction(attachTargetId, {
        ...draft,
        gmailMessageId: selectedEmail.id
      });

      void queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      setPendingPickedEmailIds((current) => {
        const next = new Set(current);
        next.delete(selectedEmail.id);
        return next;
      });
      setSaveMessage("Email attached to existing interaction.");
      setDraft(null);
      setSelectedEmail(null);
      setSelectedCandidate(null);
      setAnalysis(null);
      onSaved?.(savedInteraction);
    } catch (caughtError) {
      setSaveError(getErrorMessage(caughtError));
    } finally {
      setIsAttaching(false);
    }
  }

  async function unpickEmail(email: TrackedGmailEmail) {
    setClearingEmailId(email.id);
    setError(null);
    setSaveError(null);

    try {
      await api.gmailUnpickEmail(opportunityId, email.id);
      setPendingPickedEmailIds((current) => {
        const next = new Set(current);
        next.delete(email.id);
        return next;
      });
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) => ({
        removedEmails: current?.removedEmails ?? [],
        pickedEmails: current?.pickedEmails.filter((pickedEmail) => pickedEmail.id !== email.id) ?? []
      }));
      setMessage("Picked email removed from Gmail tracking.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not remove picked email.");
    } finally {
      setClearingEmailId(null);
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

    if (lastAction === "parse" && selectedCandidate) {
      await parseEmail(selectedCandidate);
    }
  }

  const saveInteraction = useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error("No parsed interaction is ready to save.");
      }

      return api.createInteraction(opportunityId, draft);
    },
    onSuccess: (savedInteraction) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["company", companyName] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (selectedEmail) {
        setPendingPickedEmailIds((current) => {
          const next = new Set(current);
          next.delete(selectedEmail.id);
          return next;
        });
      }
      setSaveMessage("Interaction created.");
      setDraft(null);
      setSelectedEmail(null);
      setSelectedCandidate(null);
      setAnalysis(null);
      onSaved?.(savedInteraction);
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

  const statusNeedsReconnect = statusQuery.data?.needsReconnect ?? false;
  const connected = statusQuery.data?.connected ?? false;
  const configured = statusQuery.data?.configured ?? false;
  const shouldReconnect = needsReconnect || statusNeedsReconnect;
  const removedEmails = gmailMessageStatesQuery.data?.removedEmails ?? [];
  const pickedEmails = gmailMessageStatesQuery.data?.pickedEmails ?? [];
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
            <>
              <span className="rounded-full bg-primary-container px-3 py-1 text-label-md text-on-primary-container">Gmail connected</span>
              <LoadingButton className="btn btn-primary" loading={flowState === "searching_emails"} loadingLabel="Searching..." icon="search" onClick={() => void searchEmails()}>
                Add interaction from Gmail
              </LoadingButton>
            </>
          ) : configured ? (
            <LoadingButton className="btn btn-primary" loading={flowState === "connecting_gmail"} loadingLabel="Connecting..." icon="link" onClick={() => void connectGmail()}>
              {shouldReconnect ? "Reconnect Gmail" : "Connect Gmail"}
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
            {needsReconnect ? (
              <LoadingButton className="btn btn-primary" loading={false} icon="link" onClick={() => void connectGmail()}>
                Reconnect Gmail
              </LoadingButton>
            ) : (
              <LoadingButton className="btn btn-secondary" loading={false} icon="refresh" onClick={() => void retryLastAction()}>
                Retry
              </LoadingButton>
            )}
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
                const isSelected = selectedCandidate?.id === email.id;
                const isParsing = isSelected && (flowState === "fetching_email" || flowState === "parsing_email");
                const actionDisabled = flowState === "connecting_gmail" || flowState === "searching_emails" || flowState === "fetching_email" || flowState === "parsing_email" || Boolean(draft);

                return (
                  <div
                    key={email.id}
                    className={`rounded-xl border p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-outline-variant bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-on-background">{email.subject}</p>
                        <p className="mt-1 text-body-md text-on-surface-variant">{email.from}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-body-md text-on-surface-variant">{new Date(email.date).toLocaleString()}</p>
                        <LoadingButton
                          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                          disabled={actionDisabled}
                          loading={clearingEmailId === email.id}
                          loadingLabel=""
                          icon="delete"
                          onClick={() => void clearEmail(email)}
                        >
                          <span className="sr-only">Clear email</span>
                        </LoadingButton>
                      </div>
                    </div>
                    <p className="mt-3 text-body-md text-on-surface-variant">{email.snippet}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-label-sm ${email.relevance.isRelevant ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"}`}>
                        {email.relevance.emailType}
                      </span>
                      <span className="rounded-full bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant">
                        Confidence {Math.round(email.relevance.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-2 text-body-sm text-on-surface-variant">{email.relevance.reason}</p>
                    {isParsing ? (
                      <div className="mt-3">
                        <InlineLoadingState label={flowState === "fetching_email" ? "Fetching" : "Parsing"} />
                      </div>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                      <LoadingButton
                        className="btn btn-primary"
                        disabled={actionDisabled}
                        loading={isParsing}
                        loadingLabel="Parsing..."
                        icon="auto_awesome"
                        onClick={() => void parseEmail(email)}
                      >
                        Parse email
                      </LoadingButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : flowState === "idle" && connected ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
              No candidate emails loaded yet. Search Gmail to start.
            </div>
          ) : null}
          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Removed emails</p>
              <div className="flex items-center gap-2">
                {gmailMessageStatesQuery.isFetching ? <InlineLoadingState label="Refreshing" /> : null}
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setRemovedEmailsExpanded((value) => !value)}
                >
                  <MaterialIcon name={removedEmailsExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
                  {removedEmailsExpanded ? "Hide" : `Show (${removedEmails.length})`}
                </button>
              </div>
            </div>
            {removedEmailsExpanded ? (
              removedEmails.length > 0 ? (
                <div className="mt-3 divide-y divide-outline-variant">
                  {removedEmails.map((email) => (
                    <div key={email.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-semibold text-on-background">{email.subject}</p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{new Date(email.date).toLocaleString()}</p>
                      </div>
                      <LoadingButton
                        className="btn btn-secondary"
                        loading={clearingEmailId === email.id}
                        loadingLabel="Restoring..."
                        icon="undo"
                        onClick={() => void restoreEmail(email)}
                      >
                        Undo
                      </LoadingButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-body-md text-on-surface-variant">No removed emails.</p>
              )
            ) : (
              <p className="mt-3 text-body-md text-on-surface-variant">Removed emails are hidden by default.</p>
            )}
          </div>
          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Picked emails</p>
              {gmailMessageStatesQuery.isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            </div>
            {pickedEmails.length > 0 ? (
              <div className="mt-3 divide-y divide-outline-variant">
                {pickedEmails.map((email) => (
                  <div key={email.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-body-md text-body-md font-semibold text-on-background">
                        {pendingPickedEmailIds.has(email.id) ? (
                          <Badge value="Pending" tone="warning" className="mr-2">
                            Pending
                          </Badge>
                        ) : null}
                        {email.subject}
                      </p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">{new Date(email.date).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-container px-3 py-1 text-label-sm text-on-primary-container">
                        Picked
                      </span>
                      <LoadingButton
                        className="btn btn-secondary"
                        loading={clearingEmailId === email.id}
                        loadingLabel="Removing..."
                        icon="delete"
                        onClick={() => void unpickEmail(email)}
                      >
                        Remove
                      </LoadingButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-body-md text-on-surface-variant">No picked emails.</p>
            )}
          </div>
        </div>
      ) : null}

      {draft && selectedEmail ? (
        <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review interaction</p>
              <h4 className="font-title-md text-title-md font-bold">{selectedEmail.subject}</h4>
              <p className="mt-1 text-body-md text-on-surface-variant">{selectedEmail.fromRaw}</p>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                {analysis?.dateSource === "calendar" ? "Date source: calendar invite" : analysis?.dateSource === "text" ? "Date source: email text" : "Date source: email header"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LoadingButton className="btn btn-secondary" disabled={saveInteraction.isPending} icon="close" onClick={() => { setDraft(null); setSelectedEmail(null); setSelectedCandidate(null); setAnalysis(null); setMessage("Ready to search Gmail again."); }}>
                Select another email
              </LoadingButton>
              {!isAttachMode ? (
                <LoadingButton className="btn btn-primary" loading={saveInteraction.isPending} loadingLabel="Saving..." icon="save" onClick={() => void saveInteraction.mutate()}>
                  Save interaction
                </LoadingButton>
              ) : (
                <LoadingButton
                  className="btn btn-primary"
                  loading={isAttaching}
                  loadingLabel={hasParsedInteractionChanges ? "Accepting..." : "Attaching..."}
                  icon="link"
                  disabled={!draft || !selectedEmail || !attachTargetId}
                  onClick={() => void attachToExistingInteraction()}
                >
                  {hasParsedInteractionChanges ? "Accept changes" : "Attach email"}
                </LoadingButton>
              )}
            </div>
          </div>

          {saveMessage ? <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">{saveMessage}</p> : null}
          {saveError ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p> : null}

          {attachTargetInteraction ? (
            <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                  Parsed changes
                </p>
                {hasParsedInteractionChanges ? (
                  <Badge value="Changed" tone="warning">
                    {changedInteractionFields.size} changed
                  </Badge>
                ) : (
                  <Badge value="No changes" tone="green">
                    No field changes
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-body-md text-on-surface-variant">
                {hasParsedInteractionChanges
                  ? "The parsed email has different details from the selected interaction. Review the changed badges below, then accept changes to update the interaction."
                  : "The parsed email matches the selected interaction details. Attaching will only link the source email."}
              </p>
              {hasParsedInteractionChanges ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {changedFieldLabels.map((label) => (
                    <Badge key={label} value={label} tone="warning">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {!isAttachMode ? (
            <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-label-md text-label-md uppercase text-on-surface-variant">Attach to existing</p>
                  <p className="mt-1 text-body-md text-on-surface-variant">Update an existing interaction with this email instead of creating a new one.</p>
                </div>
                <LoadingButton
                  className="btn btn-secondary"
                  loading={isAttaching}
                  loadingLabel={hasParsedInteractionChanges ? "Accepting..." : "Attaching..."}
                  icon="link"
                  disabled={!draft || !selectedEmail || !attachTargetId || saveInteraction.isPending}
                  onClick={() => void attachToExistingInteraction()}
                >
                  {hasParsedInteractionChanges ? "Accept changes" : "Attach email"}
                </LoadingButton>
              </div>
              {opportunityQuery.data?.interactions.length ? (
                <label className="mt-4 block space-y-1">
                  <span className="label">Existing interaction</span>
                  <select
                    className="input"
                    value={attachTargetId}
                    onChange={(event) => setAttachTargetId(event.target.value)}
                  >
                    {opportunityQuery.data.interactions.map((interaction) => (
                      <option key={interaction.id} value={interaction.id}>
                        {new Date(interaction.date).toLocaleString()} · {interaction.type}{interaction.personName ? ` · ${interaction.personName}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mt-4 text-body-md text-on-surface-variant">No existing interactions yet.</p>
              )}
            </div>
          ) : null}

          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4 text-body-md text-on-surface-variant">
            <p><span className="font-semibold text-on-background">Source email:</span> {selectedEmail.subject}</p>
            <p className="mt-1"><span className="font-semibold text-on-background">From:</span> {selectedEmail.fromRaw}</p>
            <p className="mt-1"><span className="font-semibold text-on-background">Message date:</span> {new Date(selectedEmail.internalDate).toLocaleString()}</p>
            {selectedEmail.calendar?.start ? <p className="mt-1"><span className="font-semibold text-on-background">Calendar start:</span> {new Date(selectedEmail.calendar.start).toLocaleString()}</p> : null}
            {selectedEmail.calendar?.location ? <p className="mt-1"><span className="font-semibold text-on-background">Location:</span> {selectedEmail.calendar.location}</p> : null}
            {draft?.meetingLink ? (
              <p className="mt-1">
                <span className="font-semibold text-on-background">Meeting link:</span>{" "}
                <a className="text-primary hover:underline" href={draft.meetingLink} rel="noreferrer noopener" target="_blank">
                  {draft.meetingLink}
                </a>
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field label="Date" changed={changedInteractionFields.has("date")}>
              <input
                className="input"
                type="datetime-local"
                value={toDatetimeLocalValue(draft.date)}
                onChange={(event) => setDraft({ ...draft, date: event.target.value ? new Date(event.target.value).toISOString() : draft.date })}
              />
            </Field>
            <Field label="Type" changed={changedInteractionFields.has("type")}>
              <select className="input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as GmailInteractionDraft["type"] })}>
                {interactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage" changed={changedInteractionFields.has("stage")}>
              <input className="input" value={draft.stage ?? ""} onChange={(event) => setDraft({ ...draft, stage: event.target.value || null })} />
            </Field>
            <Field label="Status" changed={changedInteractionFields.has("status")}>
              <select className="input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as GmailInteractionDraft["status"] })}>
                {interactionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Person name" changed={changedInteractionFields.has("personName")}>
              <input className="input" value={draft.personName ?? ""} onChange={(event) => setDraft({ ...draft, personName: event.target.value || null })} />
            </Field>
            <Field label="Person role" changed={changedInteractionFields.has("personRole")}>
              <input className="input" value={draft.personRole ?? ""} onChange={(event) => setDraft({ ...draft, personRole: event.target.value || null })} />
            </Field>
            <Field label="Agenda" changed={changedInteractionFields.has("agenda")}>
              <textarea className="input min-h-24" value={draft.agenda ?? ""} onChange={(event) => setDraft({ ...draft, agenda: event.target.value || null })} />
            </Field>
            <Field label="Meeting link" changed={changedInteractionFields.has("meetingLink")}>
              <input
                className="input"
                type="url"
                placeholder="https://meet.google.com/..."
                value={draft.meetingLink ?? ""}
                onChange={(event) => setDraft({ ...draft, meetingLink: event.target.value || null })}
              />
            </Field>
            <Field label="Notes" changed={changedInteractionFields.has("notes")}>
              <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} />
            </Field>
            <Field label="Outcome" changed={changedInteractionFields.has("outcome")}>
              <textarea className="input min-h-24" value={draft.outcome ?? ""} onChange={(event) => setDraft({ ...draft, outcome: event.target.value || null })} />
            </Field>
            <Field label="Follow-up" changed={changedInteractionFields.has("followUp")}>
              <textarea className="input min-h-24" value={draft.followUp ?? ""} onChange={(event) => setDraft({ ...draft, followUp: event.target.value || null })} />
            </Field>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  changed = false,
  children
}: {
  label: string;
  changed?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="label">{label}</span>
        {changed ? (
          <Badge value="Changed" tone="warning">
            Changed
          </Badge>
        ) : null}
      </span>
      {children}
    </label>
  );
}
