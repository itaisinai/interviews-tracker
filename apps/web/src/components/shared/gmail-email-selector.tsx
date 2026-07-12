import { useState } from "react";

import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

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

type InteractionContext = {
  title: string;
  companyName: string;
  date: string;
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
  lastSyncTime?: Date;
  interactionContext?: InteractionContext;
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
  lastSyncTime,
  interactionContext,
}: GmailEmailSelectorProps) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [locallyIgnoredIds, setLocallyIgnoredIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"suggested" | "ignored">("suggested");

  // Filter out excluded emails and locally ignored emails
  const availableCandidates = candidates.filter(
    (candidate) => !filterOutIds.has(candidate.id) && !locallyIgnoredIds.has(candidate.id)
  );

  // Calculate ignored emails including locally ignored and those from messageStates
  const allIgnoredEmails = [
    ...(messageStates?.ignoredEmails || []),
    ...(Array.from(locallyIgnoredIds)
      .map((id) => {
        const candidate = candidates.find((c) => c.id === id);
        return candidate ? { id: candidate.id, subject: candidate.subject, date: candidate.date } : null;
      })
      .filter(Boolean) as TrackedGmailEmail[]),
  ];

  const ignoredCount = allIgnoredEmails.length;
  const suggestedCount = availableCandidates.length;

  // Calculate time since last sync
  const getTimeSinceSync = () => {
    if (!lastSyncTime) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  const handleToggleEmail = (emailId: string) => {
    setSelectedEmailIds((prev) => {
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

      {/* Contextual Header */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {interactionContext ? (
              <>
                <div className="text-xs font-medium text-neutral-500 mb-1">Attach emails to</div>
                <div className="text-base font-semibold text-neutral-900 mb-0.5">{interactionContext.title}</div>
                <div className="text-sm text-neutral-600">
                  {interactionContext.companyName} • {interactionContext.date}
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-semibold text-neutral-900 mb-1">Create interaction from emails</div>
                <div className="text-sm text-neutral-600">
                  A new interaction will be created from the selected emails.
                </div>
              </>
            )}
          </div>
          {onRefresh && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-neutral-500">
                <MaterialIcon name="mail" className="text-[16px]" />
                <span>Last synced {getTimeSinceSync()}</span>
              </div>
              <button
                onClick={onRefresh}
                disabled={isSubmitting || isRefreshing}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                <MaterialIcon name="refresh" className={`text-[18px] ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("suggested")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "suggested"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Suggested
          {suggestedCount > 0 && (
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === "suggested" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {suggestedCount}
            </span>
          )}
        </button>
        {ignoredCount > 0 && (
          <button
            onClick={() => setActiveTab("ignored")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "ignored"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Ignored
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === "ignored" ? "bg-orange-100 text-orange-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {ignoredCount}
            </span>
          </button>
        )}
      </div>

      {/* Tab content - Suggested */}
      {activeTab === "suggested" && (
        <>
          {/* Description and Select all */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-600">
              We found {suggestedCount} email{suggestedCount === 1 ? "" : "s"} that may belong to this interaction.
              Select the emails you want to import.
            </p>
            {suggestedCount > 0 && (
              <button
                onClick={() => {
                  const allIds = new Set(availableCandidates.map((c) => c.id));
                  setSelectedEmailIds(allIds);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
              >
                Select all
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
              {emptySubMessage && <p className="text-xs text-neutral-400 mt-1">{emptySubMessage}</p>}
            </div>
          )}

          {/* Email list - Suggested */}
          {!isLoading && availableCandidates.length > 0 && (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {availableCandidates.map((candidate) => {
                const isSelected = selectedEmailIds.has(candidate.id);
                const isRelevant = candidate.relevance.isRelevant;

                return (
                  <div
                    key={candidate.id}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white hover:bg-neutral-50"
                    } ${isSubmitting || isIgnorePending ? "opacity-50" : ""}`}
                  >
                    {/* Checkbox button */}
                    <button
                      onClick={() => handleToggleEmail(candidate.id)}
                      disabled={isSubmitting || isIgnorePending}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-neutral-300"
                        }`}
                      >
                        {isSelected && <MaterialIcon name="check" className="text-[14px] text-white" />}
                      </div>

                      {/* Email info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="font-semibold text-sm text-neutral-900 line-clamp-2">{candidate.subject}</div>
                          {isRelevant && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex-shrink-0">
                              <MaterialIcon name="auto_awesome" className="text-[12px]" />
                              AI Suggested
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-600 mb-1">{candidate.from}</div>
                        <div className="text-xs text-neutral-500 mb-2">
                          {new Date(candidate.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {candidate.snippet && (
                          <div className="text-xs text-neutral-600 line-clamp-2">{candidate.snippet}</div>
                        )}
                      </div>
                    </button>

                    {/* Mark as not relevant button */}
                    {onIgnore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Optimistically hide it from UI immediately
                          setLocallyIgnoredIds((prev) => new Set(prev).add(candidate.id));
                          // Also remove from selected if it was selected
                          setSelectedEmailIds((prev) => {
                            const next = new Set(prev);
                            next.delete(candidate.id);
                            return next;
                          });
                          // Call API in background
                          onIgnore(candidate.id);
                        }}
                        disabled={isSubmitting || isIgnorePending}
                        className="flex-shrink-0 self-start mt-1 px-3 py-1.5 rounded text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Mark as not relevant"
                      >
                        Mark as not relevant
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab content - Ignored */}
      {activeTab === "ignored" && ignoredCount > 0 && (
        <div className="space-y-3 max-h-[480px] overflow-y-auto">
          {allIgnoredEmails.map((email) => (
            <div
              key={email.id}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-neutral-900 mb-1.5 line-clamp-2">{email.subject}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(email.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {onUnignore && (
                <button
                  onClick={() => {
                    // Remove from locally ignored
                    setLocallyIgnoredIds((prev) => {
                      const next = new Set(prev);
                      next.delete(email.id);
                      return next;
                    });
                    // Call API
                    onUnignore(email.id);
                    // Switch back to suggested tab
                    setActiveTab("suggested");
                  }}
                  disabled={isUnignorePending}
                  className="flex-shrink-0 self-start px-3 py-1.5 rounded text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <div className="text-sm text-neutral-600">
          {selectedEmailIds.size > 0 ? (
            <span className="font-medium">
              {selectedEmailIds.size} email{selectedEmailIds.size === 1 ? "" : "s"} selected
            </span>
          ) : (
            <span className="text-neutral-500">No emails selected</span>
          )}
        </div>
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <LoadingButton
            loading={isSubmitting}
            loadingLabel="Importing..."
            onClick={handleSubmit}
            disabled={selectedEmailIds.size === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <MaterialIcon name="download" className="text-[18px]" />
            Import
            {selectedEmailIds.size > 0
              ? ` ${selectedEmailIds.size} Email${selectedEmailIds.size === 1 ? "" : "s"}`
              : " Emails"}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
