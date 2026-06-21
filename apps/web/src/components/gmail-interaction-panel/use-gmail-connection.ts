import { ApiError } from "@interviews-tracker/api-client";
import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import type { UseQueryResult } from "@tanstack/react-query";
import type { GmailStatus } from "../../lib/types";

type GmailConnectionHandlers = {
  setNeedsReconnect: (value: boolean) => void;
  setError: (value: string | null) => void;
  setFlowState: (value: any) => void;
  setMessage: (value: string) => void;
  setSaveError: (value: string | null) => void;
  setSaveMessage: (value: string | null) => void;
  setLastAction: (value: "connect" | "search" | "parse" | null) => void;
  activeRunIdRef: React.MutableRefObject<number>;
  invalidateGmailStatus: () => void;
};

/**
 * Gmail connection and error handling logic
 */
export function useGmailConnection(handlers: GmailConnectionHandlers) {
  const {
    setNeedsReconnect,
    setError,
    setFlowState,
    setMessage,
    setSaveError,
    setSaveMessage,
    setLastAction,
    activeRunIdRef,
    invalidateGmailStatus
  } = handlers;

  function handleGmailActionError(caughtError: unknown, fallbackMessage: string) {
    const reconnectRequired = caughtError instanceof ApiError && caughtError.code === "GMAIL_RECONNECT_REQUIRED";
    setNeedsReconnect(reconnectRequired);
    setError(reconnectRequired ? "Your Gmail connection expired or was revoked. Please reconnect Gmail." : getErrorMessage(caughtError));
    setFlowState("failed");
    setMessage(reconnectRequired ? "Gmail reconnect required." : fallbackMessage);
    if (reconnectRequired) {
      invalidateGmailStatus();
    }
  }

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

  return {
    handleGmailActionError,
    connectGmail
  };
}
