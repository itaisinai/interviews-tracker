import { useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api";
import { normalizeInteractionType } from "../../lib/enum-labels";
import { getErrorMessage } from "../../lib/error";
import type { GmailSearchCandidate } from "../../lib/types";

import { addPickedEmail, type GmailMessageStates } from "./gmail-interaction-panel-helpers";

type GmailSearchHandlers = {
  opportunitySlug: string;
  searchHint: string;
  setNeedsReconnect: (value: boolean) => void;
  setError: (value: string | null) => void;
  setFlowState: (value: any) => void;
  setMessage: (value: string) => void;
  setSaveError: (value: string | null) => void;
  setSaveMessage: (value: string | null) => void;
  setLastAction: (value: "connect" | "search" | "parse" | null) => void;
  setSearchResults: (
    value: GmailSearchCandidate[] | ((prev: GmailSearchCandidate[]) => GmailSearchCandidate[])
  ) => void;
  setSelectedCandidate: (value: GmailSearchCandidate | null) => void;
  setSelectedEmail: (value: any) => void;
  setAnalysis: (value: any) => void;
  setDraft: (value: any) => void;
  setPendingPickedEmailIds: (value: React.SetStateAction<Set<string>>) => void;
  setClearingEmailId: (value: string | null) => void;
  activeRunIdRef: React.MutableRefObject<number>;
  handleGmailActionError: (error: unknown, fallbackMessage: string) => void;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Gmail search and parse email logic
 */
export function useGmailSearch(handlers: GmailSearchHandlers) {
  const queryClient = useQueryClient();
  const {
    opportunitySlug,
    searchHint,
    setNeedsReconnect,
    setError,
    setFlowState,
    setMessage,
    setSaveError,
    setSaveMessage,
    setLastAction,
    setSearchResults,
    setSelectedCandidate,
    setSelectedEmail,
    setAnalysis,
    setDraft,
    setPendingPickedEmailIds,
    setClearingEmailId,
    activeRunIdRef,
    handleGmailActionError,
  } = handlers;

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
      const response = await api.gmailSearch(opportunitySlug);
      if (activeRunIdRef.current !== runId) {
        return;
      }

      setSearchResults(response.candidates);

      // Auto-parse the best candidate (highest confidence, relevant email)
      const bestCandidate = response.candidates.find((c) => c.relevance.isRelevant) || response.candidates[0];

      if (bestCandidate) {
        // Automatically parse the best candidate
        setSelectedCandidate(bestCandidate);
        setFlowState("fetching_email");
        setMessage(`Found best match: "${bestCandidate.subject}". Extracting details...`);
        setPendingPickedEmailIds((current) => new Set(current).add(bestCandidate.id));
        queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunitySlug], (current) =>
          addPickedEmail(current, { id: bestCandidate.id, subject: bestCandidate.subject, date: bestCandidate.date })
        );

        await sleep(180);
        setFlowState("parsing_email");
        setMessage("Parsing the email into interaction fields.");

        const parseResponse = await api.gmailParseEmail(opportunitySlug, { messageId: bestCandidate.id });
        if (activeRunIdRef.current !== runId) {
          return;
        }

        setSelectedEmail(parseResponse.email);
        setAnalysis(parseResponse.analysis);
        setDraft(parseResponse.interaction);
        setFlowState("ready_for_review");
        setMessage("Email parsed successfully. Review the changes below.");
        void queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunitySlug] });
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
    queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunitySlug], (current) =>
      addPickedEmail(current, { id: email.id, subject: email.subject, date: email.date })
    );

    try {
      await sleep(180);
      setFlowState("parsing_email");
      setMessage("Parsing the email into interaction fields.");

      const response = await api.gmailParseEmail(opportunitySlug, { messageId: email.id });
      if (activeRunIdRef.current !== runId) {
        return;
      }

      setSelectedEmail(response.email);
      setAnalysis(response.analysis);
      setDraft({ ...response.interaction, type: normalizeInteractionType(response.interaction.type) });
      setSearchResults((results) => results.filter((candidate) => candidate.id !== email.id));
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunitySlug], (current) =>
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
      await api.gmailHideEmail(opportunitySlug, email.id);
      setSearchResults((results) => results.filter((candidate) => candidate.id !== email.id));
      setPendingPickedEmailIds((current) => {
        const next = new Set(current);
        next.delete(email.id);
        return next;
      });
      queryClient.setQueryData<GmailMessageStates>(["gmail-message-states", opportunitySlug], (current) => ({
        removedEmails: [
          { id: email.id, subject: email.subject, date: email.date },
          ...(current?.removedEmails.filter((hiddenEmail) => hiddenEmail.id !== email.id) ?? []),
        ],
        pickedEmails: current?.pickedEmails ?? [],
        ignoredEmails: current?.ignoredEmails ?? [],
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

  return {
    searchEmails,
    parseEmail,
    clearEmail,
  };
}
