import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { gmailFlowMeta, type GmailFlowState } from "../../lib/gmail";
import type { GmailStructuredEmail } from "../../lib/types";

type EffectsHandlers = {
  flowState: GmailFlowState;
  isBusy: boolean;
  connected?: boolean;
  selectedEmail: GmailStructuredEmail | null;
  attachToInteractionId: string | null;
  opportunitySlug: string;
  interactions: Array<{ id: string; gmailMessageId?: string | null }>;
  setProgress: (value: number | ((prev: number) => number)) => void;
  setSearchResults: (value: any) => void;
  setSelectedCandidate: (value: any) => void;
  setSelectedEmail: (value: any) => void;
  setAnalysis: (value: any) => void;
  setDraft: (value: any) => void;
  setAttachTargetId: (value: string | ((prev: string) => string)) => void;
  setFlowState: (value: GmailFlowState) => void;
  setMessage: (value: string) => void;
  setError: (value: string | null) => void;
  handleGmailActionError: (error: unknown, fallbackMessage: string) => void;
};

/**
 * Side effects for Gmail interaction panel
 */
export function useGmailEffects(handlers: EffectsHandlers) {
  const queryClient = useQueryClient();

  const {
    flowState,
    isBusy,
    connected,
    selectedEmail,
    attachToInteractionId,
    opportunitySlug,
    interactions,
    setProgress,
    setSearchResults,
    setSelectedCandidate,
    setSelectedEmail,
    setAnalysis,
    setDraft,
    setAttachTargetId,
    setFlowState,
    setMessage,
    setError,
    handleGmailActionError
  } = handlers;

  // Progress bar animation
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
  }, [isBusy, setProgress]);

  // Progress sync with flow state
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
  }, [flowState, setProgress]);

  // Clear data when disconnected
  useEffect(() => {
    if (!connected) {
      setSearchResults([]);
      setSelectedCandidate(null);
      setSelectedEmail(null);
      setAnalysis(null);
      setDraft(null);
    }
  }, [connected, setSearchResults, setSelectedCandidate, setSelectedEmail, setAnalysis, setDraft]);

  // Set attach target from interactions
  useEffect(() => {
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
  }, [interactions, setAttachTargetId]);

  // Override attach target when prop changes
  useEffect(() => {
    if (attachToInteractionId) {
      setAttachTargetId(attachToInteractionId);
    }
  }, [attachToInteractionId, setAttachTargetId]);

  // Auto-parse email when re-parsing an existing interaction with gmailMessageId
  useEffect(() => {
    const targetInteraction = interactions.find((i) => i.id === attachToInteractionId);
    if (
      attachToInteractionId &&
      targetInteraction?.gmailMessageId &&
      !selectedEmail &&
      connected &&
      flowState === "idle"
    ) {
      // Trigger parsing of the attached email
      void (async () => {
        setFlowState("fetching_email");
        setMessage("Loading attached email...");
        setError(null);

        try {
          const result = await api.gmailParseEmail(opportunitySlug, {
            messageId: targetInteraction.gmailMessageId!
          });

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
  }, [
    attachToInteractionId,
    interactions,
    selectedEmail,
    connected,
    flowState,
    opportunitySlug,
    setFlowState,
    setMessage,
    setError,
    setSelectedEmail,
    setAnalysis,
    setDraft,
    handleGmailActionError
  ]);
}
