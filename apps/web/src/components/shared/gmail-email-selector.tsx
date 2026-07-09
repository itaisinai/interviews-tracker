import { useState } from "react";
import { MaterialIcon, LoadingButton } from "@interviews-tracker/design-system";
import type { GmailSearchCandidate } from "../../lib/types";

type TrackedGmailEmail = {
  id: string;
  subject: string;
  date: string;
};

type GmailMessageStates = {
  pickedEmails: TrackedGmailEmail[];
  removedEmails: TrackedGmailEmail[];
  ignoredEmails: TrackedGmailEmail[];
};

type GmailEmailSelectorProps = {
  candidates: GmailSearchCandidate[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  onSubmit: (selectedIds: string[]) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  submitIcon?: string;
  isSubmitting?: boolean;
  allowMultiSelect?: boolean;
  filterOutIds?: Set<string>;
  messageStates?: GmailMessageStates;
  onUnpick?: (messageId: string) => void;
  onRestore?: (messageId: string) => void;
  onIgnore?: (messageId: string) => void;
  onUnignore?: (messageId: string) => void;
  isUnpickPending?: boolean;
  isRestorePending?: boolean;
  isIgnorePending?: boolean;
  isUnignorePending?: boolean;
  showDebugSection?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function GmailEmailSelector({
  candidates,
  isLoading = false,
  emptyMessage = "No available emails found",
  emptySubMessage = "Try searching for emails in Gmail",
  onSubmit,
  onCancel,
  submitLabel = "Continue",
  submitIcon = "arrow_forward",
  isSubmitting = false,
  allowMultiSelect = true,
  filterOutIds = new Set(),
  messageStates,
  onUnpick,
  onRestore,
  onIgnore,
  onUnignore,
  isUnpickPending = false,
  isRestorePending = false,
  isIgnorePending = false,
  isUnignorePending = false,
  showDebugSection = false,
  onRefresh,
  isRefreshing = false,
}: GmailEmailSelectorProps) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [locallyIgnoredIds, setLocallyIgnoredIds] = useState<Set<string>>(new Set());

  // Filter out excluded emails and locally ignored emails
  const availableCandidates = candidates.filter(
    candidate => !filterOutIds.has(candidate.id) && !locallyIgnoredIds.has(candidate.id)
  );

  const handleToggleEmail = (emailId: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        if (!allowMultiSelect) {
          // Single select mode: clear previous selection
          next.clear();
        }
        next.add(emailId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedEmailIds.size === 0) return;
    await onSubmit(Array.from(selectedEmailIds));
  };

  return (
    <div className="space-y-4 relative">
      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
          <MaterialIcon name="progress_activity" className="text-[48px] text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-medium text-neutral-900">Processing...</p>
          <p className="text-xs text-neutral-500 mt-1">
            {selectedEmailIds.size} email{selectedEmailIds.size === 1 ? "" : "s"} selected
          </p>
        </div>
      )}

      {/* Info and Refresh */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-600">
          Select one or more emails {allowMultiSelect ? "" : "(single selection)"}.
          {selectedEmailIds.size > 0 && ` ${selectedEmailIds.size} selected.`}
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isSubmitting || isRefreshing}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            <MaterialIcon name="refresh" className={`text-[16px] ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <MaterialIcon name="progress_activity" className="text-[24px] text-neutral-400 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && availableCandidates.length === 0 && (
        <div className="text-center py-12">
          <MaterialIcon name="mail_outline" className="text-[48px] text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-500">{emptyMessage}</p>
          {emptySubMessage && (
            <p className="text-xs text-neutral-400 mt-1">{emptySubMessage}</p>
          )}
        </div>
      )}

      {/* Email list */}
      {!isLoading && availableCandidates.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableCandidates.map((candidate) => {
            const isSelected = selectedEmailIds.has(candidate.id);
            const isRelevant = candidate.relevance.isRelevant;

            return (
              <div
                key={candidate.id}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-neutral-200 hover:bg-neutral-50"
                } ${isSubmitting || isIgnorePending ? "opacity-50" : ""}`}
              >
                {/* Checkbox button */}
                <button
                  onClick={() => handleToggleEmail(candidate.id)}
                  disabled={isSubmitting || isIgnorePending}
                  className="flex items-start gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-neutral-300"
                  }`}>
                    {isSelected && (
                      <MaterialIcon name="check" className="text-[14px] text-white" />
                    )}
                  </div>

                  {/* Email info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm text-neutral-900 truncate">
                        {candidate.subject}
                      </div>
                      {isRelevant && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium flex-shrink-0">
                          <MaterialIcon name="check_circle" className="text-[12px]" />
                          Relevant
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mb-1">
                      From: {candidate.from}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {new Date(candidate.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                    {candidate.snippet && (
                      <div className="text-xs text-neutral-500 mt-2 line-clamp-2">
                        {candidate.snippet}
                      </div>
                    )}
                  </div>
                </button>

                {/* Ignore button */}
                {onIgnore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Optimistically hide it from UI immediately
                      setLocallyIgnoredIds(prev => new Set(prev).add(candidate.id));
                      // Also remove from selected if it was selected
                      setSelectedEmailIds(prev => {
                        const next = new Set(prev);
                        next.delete(candidate.id);
                        return next;
                      });
                      // Call API in background
                      onIgnore(candidate.id);
                    }}
                    disabled={isSubmitting || isIgnorePending}
                    className="flex-shrink-0 self-center px-2 py-1 rounded text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Mark as not relevant"
                  >
                    Not Relevant
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <div className="text-sm text-neutral-600">
          {selectedEmailIds.size > 0 ? (
            <span className="font-medium">{selectedEmailIds.size} email{selectedEmailIds.size === 1 ? "" : "s"} selected</span>
          ) : (
            <span>Select emails to continue</span>
          )}
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <LoadingButton
            loading={isSubmitting}
            loadingLabel="Processing..."
            onClick={handleSubmit}
            disabled={selectedEmailIds.size === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <MaterialIcon name={submitIcon} className="text-[16px]" />
            {submitLabel} {selectedEmailIds.size > 0 ? `(${selectedEmailIds.size})` : ""}
          </LoadingButton>
        </div>
      </div>

      {/* Debug Section */}
      {showDebugSection && messageStates && (messageStates.pickedEmails.length > 0 || messageStates.removedEmails.length > 0 || messageStates.ignoredEmails.length > 0) && (
        <div className="border-t border-neutral-200 pt-4 mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-2">
              <MaterialIcon name="expand_more" className="text-[18px] group-open:rotate-180 transition-transform" />
              Debug: Picked/Cleared/Ignored emails ({messageStates.pickedEmails.length + messageStates.removedEmails.length + messageStates.ignoredEmails.length})
            </summary>
            <div className="mt-3 space-y-3">
              {messageStates.pickedEmails.length > 0 && (
                <EmailStateList
                  emails={messageStates.pickedEmails}
                  title="Picked"
                  tone="picked"
                  pending={isUnpickPending}
                  actionLabel="Undo"
                  onAction={onUnpick}
                />
              )}
              {messageStates.removedEmails.length > 0 && (
                <EmailStateList
                  emails={messageStates.removedEmails}
                  title="Cleared"
                  tone="removed"
                  pending={isRestorePending}
                  actionLabel="Restore"
                  onAction={onRestore}
                />
              )}
              {messageStates.ignoredEmails.length > 0 && (
                <EmailStateList
                  emails={messageStates.ignoredEmails}
                  title="Ignored"
                  tone="ignored"
                  pending={isUnignorePending}
                  actionLabel="Undo"
                  onAction={onUnignore}
                />
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

type EmailStateListProps = {
  emails: TrackedGmailEmail[];
  title: string;
  tone: "picked" | "removed" | "ignored";
  pending: boolean;
  actionLabel: string;
  onAction?: (messageId: string) => void;
};

function EmailStateList({ emails, title, tone, pending, actionLabel, onAction }: EmailStateListProps) {
  if (emails.length === 0) {
    return null;
  }

  const picked = tone === "picked";
  const ignored = tone === "ignored";
  const headingClass = picked ? "text-emerald-600" : ignored ? "text-orange-600" : "text-neutral-500";
  const dateClass = picked ? "text-emerald-600" : ignored ? "text-orange-600" : "text-neutral-500";
  const cardClass = `flex items-start justify-between gap-2 rounded border ${picked ? "border-emerald-200 bg-emerald-50" : ignored ? "border-orange-200 bg-orange-50" : "border-neutral-200 bg-neutral-50"} p-2`;
  const buttonClass = `flex-shrink-0 rounded px-2 py-1 text-xs font-medium ${picked ? "text-emerald-700 hover:bg-emerald-100" : ignored ? "text-orange-700 hover:bg-orange-100" : "text-neutral-700 hover:bg-neutral-100"} disabled:opacity-50`;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <div className={`mb-2 text-xs font-semibold uppercase ${headingClass}`}>
        {title} ({emails.length})
      </div>
      <div className="space-y-2">
        {emails.map((email) => (
          <div key={email.id} className={cardClass}>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-medium truncate">{email.subject}</div>
              <div className={dateClass}>{formatDate(email.date)}</div>
            </div>
            {onAction && (
              <button
                onClick={() => onAction(email.id)}
                disabled={pending}
                className={buttonClass}
              >
                {pending ? "..." : actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
