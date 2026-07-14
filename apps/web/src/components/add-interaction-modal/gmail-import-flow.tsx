import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, DiffReviewRow, MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { InteractionDraft } from "../../lib/types";
import { GmailEmailSelector } from "../shared/gmail-email-selector";

export type GmailImportFlowProps = {
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  onSaved: () => void;
  onBack: () => void;
};

type FlowStep = "searching" | "select-candidate" | "review-changes" | "no-results" | "error";

export function GmailImportFlow({ opportunitySlug, companyName, roleTitle, onSaved, onBack }: GmailImportFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FlowStep>("searching");
  const [draft, setDraft] = useState<InteractionDraft | null>(null);
  const [allGmailMessageIds, setAllGmailMessageIds] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const {
    data: searchResults,
    isLoading: isSearching,
    isError: searchFailed,
    error: searchError,
    refetch: refetchSearch,
    isRefetching,
  } = useQuery({
    queryKey: ["gmail-search", opportunitySlug],
    queryFn: () => api.gmailSearch(opportunitySlug),
    enabled: step === "searching",
    retry: false,
  });

  const { data: messageStates } = useQuery({
    queryKey: ["gmail-message-states", opportunitySlug],
    queryFn: () => api.gmailMessageStates(opportunitySlug),
  });

  const parseEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailParseEmail(opportunitySlug, { messageId }),
    onSuccess: (result) => {
      setDraft(result.interaction);
      setStep("review-changes");
    },
  });

  const unpickEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailUnpickEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
    },
  });

  const restoreEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailRestoreEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
    },
  });

  const ignoreEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailIgnoreEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
    },
  });

  const unignoreEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailUnignoreEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["gmail-message-states", opportunitySlug],
    });
    refetchSearch();
    setLastSyncTime(new Date());
  };

  const createInteraction = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No draft available");

      // Create the interaction
      const interaction = await api.createInteraction(opportunitySlug, draft);

      // Attach all Gmail messages to the InteractionEmail table
      if (allGmailMessageIds.length > 0) {
        await Promise.all(
          allGmailMessageIds.map((messageId) => api.attachEmailToInteraction(interaction.slug, messageId))
        );
      }

      return interaction;
    },
    onSuccess: onSaved,
  });

  useEffect(() => {
    if (searchFailed) {
      setStep("error");
    }
  }, [searchFailed]);

  useEffect(() => {
    if (!searchResults) return;

    if (searchResults.candidates.length === 0) {
      setStep("no-results");
      return;
    }

    if (searchResults.candidates.length > 0) {
      const highConfidenceEmail = searchResults.candidates[0];

      if (searchResults.candidates.length === 1) {
        // Store the message ID so it gets attached after creation
        setAllGmailMessageIds([highConfidenceEmail.id]);
        parseEmail.mutate(highConfidenceEmail.id);
      } else {
        setStep("select-candidate");
      }
    }
  }, [searchResults]);

  if (step === "error") {
    return (
      <div className="space-y-4 py-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <MaterialIcon name="error" className="text-[24px]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Gmail search failed</h3>
          <p className="mt-2 text-sm text-neutral-600">
            {searchError instanceof Error
              ? searchError.message
              : "Unable to search Gmail. Check your connection and try again."}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={onBack} variant="secondary">
            <MaterialIcon name="arrow_back" />
            Back
          </Button>
          <Button
            onClick={() => {
              setStep("searching");
              void refetchSearch();
            }}
            variant="primary"
          >
            <MaterialIcon name="refresh" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isSearching || step === "searching") {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600"></div>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">Searching Gmail...</h3>
        <p className="mt-2 text-sm text-neutral-600">Looking for emails related to {companyName}</p>
      </div>
    );
  }

  const handleSubmitSelected = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    setIsParsing(true);

    try {
      // Send all message IDs at once - backend will merge them into a single interaction
      const result = await api.gmailParseEmail(opportunitySlug, {
        messageIds,
      });

      // Set the single merged draft
      setDraft(result.interaction);
      // Store all message IDs to attach them after creation
      setAllGmailMessageIds((result as any).allGmailMessageIds || messageIds);
      setStep("review-changes");
    } catch (error) {
      console.error("Failed to parse emails:", error);
      alert("Failed to parse emails. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  if (step === "select-candidate" && searchResults?.candidates) {
    // Transform messageStates to the format expected by GmailEmailSelector
    const transformedMessageStates = messageStates
      ? {
          pickedEmails: messageStates.pickedEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
          removedEmails: messageStates.removedEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
          ignoredEmails: messageStates.ignoredEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
        }
      : undefined;

    return (
      <GmailEmailSelector
        candidates={searchResults.candidates}
        isLoading={false}
        emptyMessage="No emails found"
        emptySubMessage="Try searching for emails in Gmail"
        onSubmit={handleSubmitSelected}
        onCancel={onBack}
        submitLabel="Import Selected"
        submitIcon="download"
        isSubmitting={isParsing}
        allowMultiSelect={true}
        messageStates={transformedMessageStates}
        onUnpick={(messageId) => unpickEmail.mutate(messageId)}
        onRestore={(messageId) => restoreEmail.mutate(messageId)}
        onIgnore={(messageId) => ignoreEmail.mutate(messageId)}
        onUnignore={(messageId) => unignoreEmail.mutate(messageId)}
        isUnpickPending={unpickEmail.isPending}
        isRestorePending={restoreEmail.isPending}
        isIgnorePending={ignoreEmail.isPending}
        isUnignorePending={unignoreEmail.isPending}
        showDebugSection={false}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
        lastSyncTime={lastSyncTime}
      />
    );
  }

  if (step === "review-changes" && draft) {
    const emailCount = allGmailMessageIds.length;
    const wasMultipleEmails = emailCount > 1;

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <MaterialIcon name="check_circle" className="text-[18px]" />
            Interaction extracted from {wasMultipleEmails ? `${emailCount} emails` : "email"}
          </div>
          <p className="text-sm text-emerald-900">
            {wasMultipleEmails
              ? `Combined data from ${emailCount} related emails into one interaction.`
              : "Review the changes below and accept to create the interaction."}
          </p>
        </div>

        {/* Clean form-like view for new interactions */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">Date</p>
              <p className="text-body-md text-on-surface">{formatDateTime(draft.date)}</p>
            </div>

            {draft.endDate && (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">
                  End Date
                </p>
                <p className="text-body-md text-on-surface">{formatDateTime(draft.endDate)}</p>
              </div>
            )}

            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">Type</p>
              <p className="text-body-md text-on-surface">{draft.type}</p>
            </div>

            {draft.stage && (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">Stage</p>
                <p className="text-body-md text-on-surface">{draft.stage}</p>
              </div>
            )}
          </div>

          {draft.personName && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">
                Participants
              </p>
              <p className="text-body-md text-on-surface">{draft.personName}</p>
            </div>
          )}

          {draft.meetingLink && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">
                Meeting Link
              </p>
              <a
                href={draft.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-body-md text-primary hover:underline"
              >
                {draft.meetingLink}
              </a>
            </div>
          )}

          {draft.agenda && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <p className="mb-2 text-label-sm font-medium uppercase tracking-wider text-on-surface-variant">Agenda</p>
              <p className="whitespace-pre-wrap text-body-md text-on-surface">{draft.agenda}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-neutral-200 pt-6">
          <Button
            loading={createInteraction.isPending}
            loadingLabel="Saving..."
            onClick={() => createInteraction.mutate()}
            className="btn btn-primary flex-1"
          >
            <MaterialIcon name="check" />
            Accept Changes
          </Button>
          <Button
            onClick={() => setStep("select-candidate")}
            variant="secondary"
            disabled={createInteraction.isPending}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === "no-results" || searchResults?.candidates.length === 0) {
    // When there are no new candidates, pass empty array but still show tabs with picked/ignored
    // This will let users manage their picked/ignored emails through the tab interface
    const transformedMessageStates = messageStates
      ? {
          pickedEmails: messageStates.pickedEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
          removedEmails: messageStates.removedEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
          ignoredEmails: messageStates.ignoredEmails.map((e) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
          })),
        }
      : undefined;

    return (
      <GmailEmailSelector
        candidates={[]} // Empty candidates array
        isLoading={false}
        emptyMessage="No new emails found"
        emptySubMessage={`All emails for this opportunity have been processed.`}
        onSubmit={handleSubmitSelected}
        onCancel={onBack}
        submitLabel="Import Selected"
        submitIcon="download"
        isSubmitting={isParsing}
        allowMultiSelect={true}
        messageStates={transformedMessageStates}
        onUnpick={(messageId) => unpickEmail.mutate(messageId)}
        onRestore={(messageId) => restoreEmail.mutate(messageId)}
        onIgnore={(messageId) => ignoreEmail.mutate(messageId)}
        onUnignore={(messageId) => unignoreEmail.mutate(messageId)}
        isUnpickPending={unpickEmail.isPending}
        isRestorePending={restoreEmail.isPending}
        isIgnorePending={ignoreEmail.isPending}
        isUnignorePending={unignoreEmail.isPending}
        showDebugSection={false}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
        lastSyncTime={lastSyncTime}
      />
    );
  }

  return null;
}
