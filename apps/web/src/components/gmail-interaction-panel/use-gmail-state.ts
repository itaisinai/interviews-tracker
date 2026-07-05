import { useState, useRef } from "react";
import type { GmailFlowState } from "../../lib/gmail";
import type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
  GmailSearchCandidate,
  GmailStructuredEmail
} from "../../lib/types";

/**
 * Core state management for Gmail interaction panel
 */
export function useGmailState() {
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
  const [ignoringEmailId, setIgnoringEmailId] = useState<string | null>(null);
  const [removedEmailsExpanded, setRemovedEmailsExpanded] = useState(false);
  const [ignoredEmailsExpanded, setIgnoredEmailsExpanded] = useState(false);
  const [attachTargetId, setAttachTargetId] = useState<string>("");
  const [pendingPickedEmailIds, setPendingPickedEmailIds] = useState<Set<string>>(() => new Set());
  const [lastAction, setLastAction] = useState<"connect" | "search" | "parse" | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const activeRunIdRef = useRef(0);

  const isBusy =
    flowState === "connecting_gmail" ||
    flowState === "searching_emails" ||
    flowState === "fetching_email" ||
    flowState === "parsing_email";

  const isReviewingDraft = Boolean(draft && selectedEmail);

  return {
    // State values
    flowState,
    progress,
    message,
    error,
    searchResults,
    selectedCandidate,
    selectedEmail,
    analysis,
    draft,
    saveMessage,
    saveError,
    isAttaching,
    clearingEmailId,
    ignoringEmailId,
    removedEmailsExpanded,
    ignoredEmailsExpanded,
    attachTargetId,
    pendingPickedEmailIds,
    lastAction,
    needsReconnect,
    activeRunIdRef,
    isBusy,
    isReviewingDraft,

    // Setters
    setFlowState,
    setProgress,
    setMessage,
    setError,
    setSearchResults,
    setSelectedCandidate,
    setSelectedEmail,
    setAnalysis,
    setDraft,
    setSaveMessage,
    setSaveError,
    setIsAttaching,
    setClearingEmailId,
    setIgnoringEmailId,
    setRemovedEmailsExpanded,
    setIgnoredEmailsExpanded,
    setAttachTargetId,
    setPendingPickedEmailIds,
    setLastAction,
    setNeedsReconnect
  };
}
