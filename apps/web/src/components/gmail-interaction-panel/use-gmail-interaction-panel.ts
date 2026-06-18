import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@interviews-tracker/api-client";
import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { gmailFlowMeta, type GmailFlowState } from "../../lib/gmail";
import type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
  GmailSearchCandidate,
  GmailStructuredEmail,
  Interaction
} from "../../lib/types";
import { normalizeInteractionType } from "../../lib/enum-labels";
import {
  addPickedEmail,
  getChangedInteractionFields,
  type GmailMessageStates,
  type InteractionDiffField,
  type TrackedGmailEmail
} from "./gmail-interaction-panel-helpers";

type GmailInteractionPanelArgs = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
  attachToInteractionId?: string | null;
};

export function useGmailInteractionPanel({ opportunityId, companyName, roleTitle, onSaved, attachToInteractionId = null }: GmailInteractionPanelArgs) {
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
  const [pendingPickedEmailIds, setPendingPickedEmailIds] = useState<Set<string>>(() => new Set());
  const [lastAction, setLastAction] = useState<"connect" | "search" | "parse" | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const activeRunIdRef = useRef(0);
  const isAttachMode = Boolean(attachToInteractionId);

  const isBusy =
    flowState === "connecting_gmail" ||
    flowState === "searching_emails" ||
    flowState === "fetching_email" ||
    flowState === "parsing_email";
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

  // Auto-parse email when re-parsing an existing interaction with gmailMessageId
  useEffect(() => {
    const targetInteraction = opportunityQuery.data?.interactions.find((i) => i.id === attachToInteractionId);
    if (
      attachToInteractionId &&
      targetInteraction?.gmailMessageId &&
      !selectedEmail &&
      statusQuery.data?.connected &&
      flowState === "idle"
    ) {
      // Trigger parsing of the attached email
      void (async () => {
        setFlowState("fetching_email");
        setMessage("Loading attached email...");
        setError(null);

        try {
          const result = await api.gmailParseEmail(opportunityId, { messageId: targetInteraction.gmailMessageId! });

          setSelectedEmail(result.email);
          setAnalysis(result.analysis);
          setDraft(result.interaction);
          setFlowState("ready_for_review");
          setMessage("Email re-parsed successfully. Review the changes below.");
        } catch (error) {
          handleGmailActionError(error, "Failed to load attached email.");
        }
      })();
    }
  }, [attachToInteractionId, opportunityQuery.data?.interactions, selectedEmail, statusQuery.data?.connected, flowState, opportunityId]);

  const searchHint = useMemo(() => `Searching Gmail for "${companyName}" from the last 180 days.`, [companyName]);
  const attachTargetInteraction = useMemo(
    () => opportunityQuery.data?.interactions.find((interaction) => interaction.id === attachTargetId) ?? null,
    [attachTargetId, opportunityQuery.data?.interactions]
  );
  const changedInteractionFields = useMemo(() => getChangedInteractionFields(attachTargetInteraction, draft), [attachTargetInteraction, draft]);
  const changedFieldLabels = useMemo(
    () =>
      Array.from(changedInteractionFields).map(
        (field) =>
          ({
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
          } satisfies Record<InteractionDiffField, string>)[field]
      ),
    [changedInteractionFields]
  );
  const hasParsedInteractionChanges = changedInteractionFields.size > 0;
  const isReviewingDraft = Boolean(draft && selectedEmail);

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

      // Auto-parse the best candidate (highest confidence, relevant email)
      const bestCandidate = response.candidates.find(c => c.relevance.isRelevant) || response.candidates[0];

      if (bestCandidate) {
        // Automatically parse the best candidate
        setSelectedCandidate(bestCandidate);
        setFlowState("fetching_email");
        setMessage(`Found best match: "${bestCandidate.subject}". Extracting details...`);
        setPendingPickedEmailIds((current) => new Set(current).add(bestCandidate.id));
        queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) =>
          addPickedEmail(current, { id: bestCandidate.id, subject: bestCandidate.subject, date: bestCandidate.date })
        );

        await sleep(180);
        setFlowState("parsing_email");
        setMessage("Parsing the email into interaction fields.");

        const parseResponse = await api.gmailParseEmail(opportunityId, { messageId: bestCandidate.id });
        if (activeRunIdRef.current !== runId) {
          return;
        }

        setSelectedEmail(parseResponse.email);
        setAnalysis(parseResponse.analysis);
        setDraft(parseResponse.interaction);
        setFlowState("ready_for_review");
        setMessage("Email parsed successfully. Review the changes below.");
        void queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
      } else {
        setFlowState("idle");
        setMessage("No matching emails found in Gmail.");
      }
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
    queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) =>
      addPickedEmail(current, { id: email.id, subject: email.subject, date: email.date })
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
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunityId], (current) =>
        addPickedEmail(current, { id: email.id, subject: email.subject, date: email.date })
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
        removedEmails: [{ id: email.id, subject: email.subject, date: email.date }, ...(current?.removedEmails.filter((hiddenEmail) => hiddenEmail.id !== email.id) ?? [])],
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
      const savedInteraction = await api.updateInteraction(attachTargetId, { ...draft, gmailMessageId: selectedEmail.id });
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
      throw caughtError;
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

  const statusNeedsReconnect = statusQuery.data?.needsReconnect ?? false;
  const connected = statusQuery.data?.connected ?? false;
  const configured = statusQuery.data?.configured ?? false;
  const shouldReconnect = needsReconnect || statusNeedsReconnect;
  const removedEmails = gmailMessageStatesQuery.data?.removedEmails ?? [];
  const pickedEmails = gmailMessageStatesQuery.data?.pickedEmails ?? [];

  return {
    statusLoading: statusQuery.isLoading,
    statusFetching: statusQuery.isFetching,
    connected,
    configured,
    shouldReconnect,
    flowState,
    currentMeta,
    message,
    progress,
    error,
    needsReconnect,
    searchResults,
    selectedCandidateId: selectedCandidate?.id ?? null,
    selectedCandidate,
    isParsingCandidateId:
      selectedCandidate && (flowState === "fetching_email" || flowState === "parsing_email")
        ? selectedCandidate.id
        : null,
    actionDisabled:
      flowState === "connecting_gmail" ||
      flowState === "searching_emails" ||
      flowState === "fetching_email" ||
      flowState === "parsing_email" ||
      Boolean(draft),
    clearingEmailId,
    removedEmails,
    pickedEmails,
    removedEmailsExpanded,
    pendingPickedEmailIds,
    gmailMessageStatesFetching: gmailMessageStatesQuery.isFetching,
    draft,
    selectedEmail,
    analysis,
    attachTargetInteraction,
    attachTargetId,
    isAttachMode,
    hasParsedInteractionChanges,
    changedInteractionFields,
    changedFieldLabels,
    saveMessage,
    saveError,
    saveInteractionPending: saveInteraction.isPending,
    isAttaching,
    opportunityInteractions: opportunityQuery.data?.interactions ?? [],
    isReviewingDraft,
    connectGmail,
    searchEmails,
    retryLastAction,
    parseEmail,
    clearEmail,
    restoreEmail,
    unpickEmail,
    attachToExistingInteraction,
    onRemovedEmailsExpandedChange: setRemovedEmailsExpanded,
    onSelectAnotherEmail: () => {
      setDraft(null);
      setSelectedEmail(null);
      setSelectedCandidate(null);
      setAnalysis(null);
      setMessage("Ready to search Gmail again.");
    },
    onSaveInteraction: () => saveInteraction.mutateAsync(),
    onDraftChange: setDraft,
    onAttachTargetIdChange: setAttachTargetId
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
