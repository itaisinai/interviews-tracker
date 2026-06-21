import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import type { Interaction, GmailInteractionDraft, GmailStructuredEmail } from "../../lib/types";

type GmailSaveHandlers = {
  opportunityId: string;
  companyName: string;
  draft: GmailInteractionDraft | null;
  selectedEmail: GmailStructuredEmail | null;
  attachTargetId: string;
  onSaved?: (interaction?: Interaction) => void;
  setError: (value: string | null) => void;
  setSaveMessage: (value: string) => void;
  setSaveError: (value: string | null) => void;
  setIsAttaching: (value: boolean) => void;
  setDraft: (value: any) => void;
  setSelectedEmail: (value: any) => void;
  setSelectedCandidate: (value: any) => void;
  setAnalysis: (value: any) => void;
  setPendingPickedEmailIds: (value: React.SetStateAction<Set<string>>) => void;
};

/**
 * Save and attach interaction logic
 */
export function useGmailSave(handlers: GmailSaveHandlers) {
  const queryClient = useQueryClient();
  const {
    opportunityId,
    companyName,
    draft,
    selectedEmail,
    attachTargetId,
    onSaved,
    setError,
    setSaveMessage,
    setSaveError,
    setIsAttaching,
    setDraft,
    setSelectedEmail,
    setSelectedCandidate,
    setAnalysis,
    setPendingPickedEmailIds
  } = handlers;

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

  async function attachToExistingInteraction() {
    if (!draft || !selectedEmail || !attachTargetId) {
      return;
    }

    setError(null);
    setSaveError(null);
    setIsAttaching(true);

    try {
      // Attach the email - backend will parse, aggregate, and update the interaction
      await api.attachEmailToInteraction(attachTargetId, selectedEmail.id);

      void queryClient.invalidateQueries({ queryKey: ["interaction-emails", attachTargetId] });
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
      setSaveMessage("Email attached and interaction updated.");
      setDraft(null);
      setSelectedEmail(null);
      setSelectedCandidate(null);
      setAnalysis(null);

      // Fetch the updated interaction to pass to callback
      const updatedInteraction = await api.opportunity(opportunityId).then(
        opp => opp.interactions.find(i => i.id === attachTargetId)
      );
      onSaved?.(updatedInteraction);
    } catch (caughtError) {
      setSaveError(getErrorMessage(caughtError));
      throw caughtError;
    } finally {
      setIsAttaching(false);
    }
  }

  return {
    saveInteraction,
    attachToExistingInteraction
  };
}
