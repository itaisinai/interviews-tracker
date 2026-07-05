import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import type { GmailSearchCandidate } from "../../lib/types";
import type { GmailMessageStates, TrackedGmailEmail } from "./gmail-interaction-panel-helpers";

type EmailActionsHandlers = {
  opportunityId: string;
  setError: (value: string | null) => void;
  setSaveError: (value: string | null) => void;
  setMessage: (value: string) => void;
  setFlowState: (value: any) => void;
  setClearingEmailId: (value: string | null) => void;
  setIgnoringEmailId: (value: string | null) => void;
  setPendingPickedEmailIds: (value: React.SetStateAction<Set<string>>) => void;
};

/**
 * Email management actions (restore, unpick)
 */
export function useGmailEmailActions(handlers: EmailActionsHandlers) {
  const queryClient = useQueryClient();
  const {
    opportunityId,
    setError,
    setSaveError,
    setMessage,
    setFlowState,
    setClearingEmailId,
    setIgnoringEmailId,
    setPendingPickedEmailIds
  } = handlers;

  async function restoreEmail(email: TrackedGmailEmail) {
    setClearingEmailId(email.id);
    setError(null);

    try {
      await api.gmailRestoreEmail(opportunityId, email.id);
      queryClient.setQueryData<GmailMessageStates>(
        ["gmail-message-states", opportunityId],
        (current) => ({
          removedEmails:
            current?.removedEmails.filter((hiddenEmail) => hiddenEmail.id !== email.id) ?? [],
          pickedEmails: current?.pickedEmails ?? [],
          ignoredEmails: current?.ignoredEmails ?? []
        })
      );
      setMessage("Email restored.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not restore email.");
    } finally {
      setClearingEmailId(null);
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
      queryClient.setQueryData<GmailMessageStates>(
        ["gmail-message-states", opportunityId],
        (current) => ({
          removedEmails: current?.removedEmails ?? [],
          pickedEmails:
            current?.pickedEmails.filter((pickedEmail) => pickedEmail.id !== email.id) ?? [],
          ignoredEmails: current?.ignoredEmails ?? []
        })
      );
      setMessage("Picked email removed from Gmail tracking.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not remove picked email.");
    } finally {
      setClearingEmailId(null);
    }
  }

  async function ignoreEmail(email: GmailSearchCandidate | TrackedGmailEmail) {
    setIgnoringEmailId(email.id);
    setError(null);

    try {
      await api.gmailIgnoreEmail(opportunityId, email.id);
      queryClient.setQueryData<GmailMessageStates>(
        ["gmail-message-states", opportunityId],
        (current) => ({
          removedEmails: current?.removedEmails ?? [],
          pickedEmails: current?.pickedEmails ?? [],
          ignoredEmails: [
            { id: email.id, subject: email.subject, date: email.date },
            ...(current?.ignoredEmails ?? [])
          ]
        })
      );
      setMessage("Email ignored globally.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not ignore email.");
    } finally {
      setIgnoringEmailId(null);
    }
  }

  async function unignoreEmail(email: TrackedGmailEmail) {
    setIgnoringEmailId(email.id);
    setError(null);

    try {
      await api.gmailUnignoreEmail(opportunityId, email.id);
      queryClient.setQueryData<GmailMessageStates>(
        ["gmail-message-states", opportunityId],
        (current) => ({
          removedEmails: current?.removedEmails ?? [],
          pickedEmails: current?.pickedEmails ?? [],
          ignoredEmails:
            current?.ignoredEmails.filter((ignoredEmail) => ignoredEmail.id !== email.id) ?? []
        })
      );
      setMessage("Email unignored.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setFlowState("failed");
      setMessage("Could not unignore email.");
    } finally {
      setIgnoringEmailId(null);
    }
  }

  return {
    restoreEmail,
    unpickEmail,
    ignoreEmail,
    unignoreEmail
  };
}
