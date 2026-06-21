import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { gmailFlowMeta } from "../../lib/gmail";
import type { Interaction } from "../../lib/types";
import { useGmailState } from "./use-gmail-state";
import { useGmailConnection } from "./use-gmail-connection";
import { useGmailSearch } from "./use-gmail-search";
import { useGmailSave } from "./use-gmail-save";
import { useGmailEffects } from "./use-gmail-effects";
import { useGmailEmailActions } from "./use-gmail-email-actions";
import {
  getChangedInteractionFields,
  type InteractionDiffField
} from "./gmail-interaction-panel-helpers";

type GmailInteractionPanelArgs = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
  attachToInteractionId?: string | null;
};

/**
 * Main Gmail interaction panel hook - orchestrates all Gmail flow logic
 */
export function useGmailInteractionPanel({
  opportunityId,
  companyName,
  roleTitle,
  onSaved,
  attachToInteractionId = null
}: GmailInteractionPanelArgs) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["gmail-status"], queryFn: api.gmailStatus });

  // Core state management
  const state = useGmailState();

  // Queries
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

  const isAttachMode = Boolean(attachToInteractionId);
  const currentMeta = gmailFlowMeta[state.flowState];
  const searchHint = useMemo(
    () => `Searching Gmail for "${companyName}" from the last 180 days.`,
    [companyName]
  );

  // Connection logic
  const connectionHandlers = useGmailConnection({
    setNeedsReconnect: state.setNeedsReconnect,
    setError: state.setError,
    setFlowState: state.setFlowState,
    setMessage: state.setMessage,
    setSaveError: state.setSaveError,
    setSaveMessage: state.setSaveMessage,
    setLastAction: state.setLastAction,
    activeRunIdRef: state.activeRunIdRef,
    invalidateGmailStatus: () => queryClient.invalidateQueries({ queryKey: ["gmail-status"] })
  });

  // Search logic
  const searchHandlers = useGmailSearch({
    opportunityId,
    searchHint,
    setNeedsReconnect: state.setNeedsReconnect,
    setError: state.setError,
    setFlowState: state.setFlowState,
    setMessage: state.setMessage,
    setSaveError: state.setSaveError,
    setSaveMessage: state.setSaveMessage,
    setLastAction: state.setLastAction,
    setSearchResults: state.setSearchResults,
    setSelectedCandidate: state.setSelectedCandidate,
    setSelectedEmail: state.setSelectedEmail,
    setAnalysis: state.setAnalysis,
    setDraft: state.setDraft,
    setPendingPickedEmailIds: state.setPendingPickedEmailIds,
    setClearingEmailId: state.setClearingEmailId,
    activeRunIdRef: state.activeRunIdRef,
    handleGmailActionError: connectionHandlers.handleGmailActionError
  });

  // Save logic
  const saveHandlers = useGmailSave({
    opportunityId,
    companyName,
    draft: state.draft,
    selectedEmail: state.selectedEmail,
    attachTargetId: state.attachTargetId,
    onSaved,
    setError: state.setError,
    setSaveMessage: state.setSaveMessage,
    setSaveError: state.setSaveError,
    setIsAttaching: state.setIsAttaching,
    setDraft: state.setDraft,
    setSelectedEmail: state.setSelectedEmail,
    setSelectedCandidate: state.setSelectedCandidate,
    setAnalysis: state.setAnalysis,
    setPendingPickedEmailIds: state.setPendingPickedEmailIds
  });

  // Email actions
  const emailActions = useGmailEmailActions({
    opportunityId,
    setError: state.setError,
    setSaveError: state.setSaveError,
    setMessage: state.setMessage,
    setFlowState: state.setFlowState,
    setClearingEmailId: state.setClearingEmailId,
    setPendingPickedEmailIds: state.setPendingPickedEmailIds
  });

  // Side effects
  useGmailEffects({
    flowState: state.flowState,
    isBusy: state.isBusy,
    connected: statusQuery.data?.connected,
    selectedEmail: state.selectedEmail,
    attachToInteractionId,
    opportunityId,
    interactions: opportunityQuery.data?.interactions ?? [],
    setProgress: state.setProgress,
    setSearchResults: state.setSearchResults,
    setSelectedCandidate: state.setSelectedCandidate,
    setSelectedEmail: state.setSelectedEmail,
    setAnalysis: state.setAnalysis,
    setDraft: state.setDraft,
    setAttachTargetId: state.setAttachTargetId,
    setFlowState: state.setFlowState,
    setMessage: state.setMessage,
    setError: state.setError,
    handleGmailActionError: connectionHandlers.handleGmailActionError
  });

  // Computed values
  const attachTargetInteraction = useMemo(
    () =>
      opportunityQuery.data?.interactions.find(
        (interaction) => interaction.id === state.attachTargetId
      ) ?? null,
    [state.attachTargetId, opportunityQuery.data?.interactions]
  );

  const changedInteractionFields = useMemo(
    () => getChangedInteractionFields(attachTargetInteraction, state.draft),
    [attachTargetInteraction, state.draft]
  );

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

  async function retryLastAction() {
    if (state.lastAction === "connect") {
      await connectionHandlers.connectGmail();
      return;
    }

    if (state.lastAction === "search") {
      await searchHandlers.searchEmails();
      return;
    }

    if (state.lastAction === "parse" && state.selectedCandidate) {
      await searchHandlers.parseEmail(state.selectedCandidate);
    }
  }

  // Public API
  const statusNeedsReconnect = statusQuery.data?.needsReconnect ?? false;
  const connected = statusQuery.data?.connected ?? false;
  const configured = statusQuery.data?.configured ?? false;
  const shouldReconnect = state.needsReconnect || statusNeedsReconnect;
  const removedEmails = gmailMessageStatesQuery.data?.removedEmails ?? [];
  const pickedEmails = gmailMessageStatesQuery.data?.pickedEmails ?? [];

  return {
    statusLoading: statusQuery.isLoading,
    statusFetching: statusQuery.isFetching,
    connected,
    configured,
    shouldReconnect,
    flowState: state.flowState,
    currentMeta,
    message: state.message,
    progress: state.progress,
    error: state.error,
    needsReconnect: state.needsReconnect,
    searchResults: state.searchResults,
    selectedCandidateId: state.selectedCandidate?.id ?? null,
    selectedCandidate: state.selectedCandidate,
    isParsingCandidateId:
      state.selectedCandidate &&
      (state.flowState === "fetching_email" || state.flowState === "parsing_email")
        ? state.selectedCandidate.id
        : null,
    actionDisabled:
      state.flowState === "connecting_gmail" ||
      state.flowState === "searching_emails" ||
      state.flowState === "fetching_email" ||
      state.flowState === "parsing_email" ||
      Boolean(state.draft),
    clearingEmailId: state.clearingEmailId,
    removedEmails,
    pickedEmails,
    removedEmailsExpanded: state.removedEmailsExpanded,
    pendingPickedEmailIds: state.pendingPickedEmailIds,
    gmailMessageStatesFetching: gmailMessageStatesQuery.isFetching,
    draft: state.draft,
    selectedEmail: state.selectedEmail,
    analysis: state.analysis,
    attachTargetInteraction,
    attachTargetId: state.attachTargetId,
    isAttachMode,
    hasParsedInteractionChanges,
    changedInteractionFields,
    changedFieldLabels,
    saveMessage: state.saveMessage,
    saveError: state.saveError,
    saveInteractionPending: saveHandlers.saveInteraction.isPending,
    isAttaching: state.isAttaching,
    opportunityInteractions: opportunityQuery.data?.interactions ?? [],
    isReviewingDraft: state.isReviewingDraft,
    connectGmail: connectionHandlers.connectGmail,
    searchEmails: searchHandlers.searchEmails,
    retryLastAction,
    parseEmail: searchHandlers.parseEmail,
    clearEmail: searchHandlers.clearEmail,
    restoreEmail: emailActions.restoreEmail,
    unpickEmail: emailActions.unpickEmail,
    attachToExistingInteraction: saveHandlers.attachToExistingInteraction,
    onRemovedEmailsExpandedChange: state.setRemovedEmailsExpanded,
    onSelectAnotherEmail: () => {
      state.setDraft(null);
      state.setSelectedEmail(null);
      state.setSelectedCandidate(null);
      state.setAnalysis(null);
      state.setMessage("Ready to search Gmail again.");
    },
    onSaveInteraction: () => saveHandlers.saveInteraction.mutateAsync(),
    onDraftChange: state.setDraft,
    onAttachTargetIdChange: state.setAttachTargetId
  };
}
