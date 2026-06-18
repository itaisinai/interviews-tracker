import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { InteractionDraft } from "../../lib/types";
import { MaterialIcon, LoadingButton, DiffReviewRow } from "@interviews-tracker/design-system";
import { formatDateTime } from "../../lib/format";

export type GmailImportFlowProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved: () => void;
  onBack: () => void;
};

type FlowStep = "searching" | "select-candidate" | "review-changes" | "no-results";

export function GmailImportFlow({
  opportunityId,
  companyName,
  roleTitle,
  onSaved,
  onBack,
}: GmailImportFlowProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FlowStep>("searching");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InteractionDraft | null>(null);

  const { data: searchResults, isLoading: isSearching, refetch: refetchSearch } = useQuery({
    queryKey: ["gmail-search", opportunityId],
    queryFn: () => api.gmailSearch(opportunityId),
    enabled: step === "searching",
  });

  const { data: messageStates } = useQuery({
    queryKey: ["gmail-message-states", opportunityId],
    queryFn: () => api.gmailMessageStates(opportunityId),
  });

  const parseEmail = useMutation({
    mutationFn: (messageId: string) =>
      api.gmailParseEmail(opportunityId, { messageId }),
    onSuccess: (result) => {
      setDraft(result.interaction);
      setStep("review-changes");
    },
  });

  const unpickEmail = useMutation({
    mutationFn: (messageId: string) =>
      api.gmailUnpickEmail(opportunityId, messageId),
    onSuccess: () => {
      // Refresh the message states and search results
      void queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunityId] });
      void refetchSearch();
    },
  });

  const restoreEmail = useMutation({
    mutationFn: (messageId: string) =>
      api.gmailRestoreEmail(opportunityId, messageId),
    onSuccess: () => {
      // Refresh the message states and search results
      void queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
      void queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunityId] });
      void refetchSearch();
    },
  });

  const createInteraction = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("No draft available");
      return api.createInteraction(opportunityId, draft);
    },
    onSuccess: onSaved,
  });

  useEffect(() => {
    if (!searchResults) return;

    if (searchResults.candidates.length === 0) {
      setStep("no-results");
      return;
    }

    if (searchResults.candidates.length > 0) {
      const highConfidenceEmail = searchResults.candidates[0];

      if (searchResults.candidates.length === 1) {
        setSelectedMessageId(highConfidenceEmail.id);
        parseEmail.mutate(highConfidenceEmail.id);
      } else {
        setStep("select-candidate");
      }
    }
  }, [searchResults]);

  if (isSearching || step === "searching") {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600"></div>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Searching Gmail...
        </h3>
        <p className="mt-2 text-sm text-neutral-600">
          Looking for emails related to {companyName}
        </p>
      </div>
    );
  }

  if (step === "select-candidate" && searchResults?.candidates) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-700">
              Found {searchResults.candidates.length} potential emails. Select one to import:
            </p>
            <button
              onClick={() => {
                setStep("searching");
                void refetchSearch();
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <MaterialIcon name="refresh" className="text-[16px]" />
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {searchResults.candidates.map((candidate) => (
            <button
              key={candidate.id}
              onClick={() => {
                setSelectedMessageId(candidate.id);
                parseEmail.mutate(candidate.id);
              }}
              className="flex w-full items-start gap-3 rounded-lg border-2 border-neutral-200 bg-white p-4 text-left transition-all hover:border-emerald-500 hover:shadow-sm"
            >
              <MaterialIcon name="mail" className="mt-0.5 text-[20px] text-neutral-400" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-900">{candidate.subject}</div>
                <div className="mt-1 text-sm text-neutral-600">{candidate.from}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  {new Date(candidate.date).toLocaleDateString()}
                </div>
              </div>
              <MaterialIcon name="arrow_forward" className="text-[20px] text-neutral-400" />
            </button>
          ))}
        </div>

        <button onClick={onBack} className="btn btn-secondary w-full">
          <MaterialIcon name="arrow_back" />
          Back
        </button>

        {/* Debug: Show picked/cleared emails */}
        {messageStates && (messageStates.pickedEmails.length > 0 || messageStates.removedEmails.length > 0) && (
          <div className="border-t border-neutral-200 pt-4 mt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Debug: Picked/Cleared emails ({messageStates.pickedEmails.length + messageStates.removedEmails.length})
              </summary>
              <div className="mt-3 space-y-3">
                {messageStates.pickedEmails.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-emerald-600">
                      Picked ({messageStates.pickedEmails.length})
                    </div>
                    <div className="space-y-2">
                      {messageStates.pickedEmails.map((email) => (
                        <div key={email.id} className="flex items-start justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 p-2">
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-medium truncate">{email.subject}</div>
                            <div className="text-emerald-600">{email.date}</div>
                          </div>
                          <button
                            onClick={() => unpickEmail.mutate(email.id)}
                            disabled={unpickEmail.isPending}
                            className="flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {unpickEmail.isPending ? "..." : "Undo"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {messageStates.removedEmails.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                      Cleared ({messageStates.removedEmails.length})
                    </div>
                    <div className="space-y-2">
                      {messageStates.removedEmails.map((email) => (
                        <div key={email.id} className="flex items-start justify-between gap-2 rounded border border-neutral-200 bg-neutral-50 p-2">
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="font-medium truncate">{email.subject}</div>
                            <div className="text-neutral-500">{email.date}</div>
                          </div>
                          <button
                            onClick={() => restoreEmail.mutate(email.id)}
                            disabled={restoreEmail.isPending}
                            className="flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                          >
                            {restoreEmail.isPending ? "..." : "Restore"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    );
  }

  if (step === "review-changes" && draft) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <MaterialIcon name="check_circle" className="text-[18px]" />
            Interaction extracted from email
          </div>
          <p className="text-sm text-emerald-900">
            Review the changes below and accept to create the interaction.
          </p>
        </div>

        <div className="space-y-3">
          <DiffReviewRow
            label="Date"
            currentValue=""
            newValue={formatDateTime(draft.date)}
            isChanged={true}
          />

          {draft.endDate && (
            <DiffReviewRow
              label="End Date"
              currentValue=""
              newValue={formatDateTime(draft.endDate)}
              isChanged={true}
            />
          )}

          <DiffReviewRow
            label="Type"
            currentValue=""
            newValue={draft.type}
            isChanged={true}
          />

          {draft.stage && (
            <DiffReviewRow
              label="Stage"
              currentValue=""
              newValue={draft.stage}
              isChanged={true}
            />
          )}

          {draft.personName && (
            <DiffReviewRow
              label="Participants"
              currentValue=""
              newValue={draft.personName}
              isChanged={true}
            />
          )}

          {draft.meetingLink && (
            <DiffReviewRow
              label="Meeting Link"
              currentValue=""
              newValue={
                <a
                  href={draft.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  {draft.meetingLink}
                </a>
              }
              isChanged={true}
            />
          )}

          {draft.agenda && (
            <DiffReviewRow
              label="Agenda"
              currentValue=""
              newValue={<span className="line-clamp-3">{draft.agenda}</span>}
              isChanged={true}
            />
          )}
        </div>

        <div className="flex gap-3 border-t border-neutral-200 pt-6">
          <LoadingButton
            loading={createInteraction.isPending}
            loadingLabel="Saving..."
            onClick={() => createInteraction.mutate()}
            className="btn btn-primary flex-1"
          >
            <MaterialIcon name="check" />
            Accept Changes
          </LoadingButton>
          <button
            onClick={() => setStep("select-candidate")}
            className="btn btn-secondary"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === "no-results" || searchResults?.candidates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <MaterialIcon name="inbox" className="text-[32px] text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">
            No emails found
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            We couldn't find any recent emails for {companyName}.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setStep("searching");
                void refetchSearch();
              }}
              className="btn btn-secondary"
            >
              <MaterialIcon name="refresh" />
              Refresh Search
            </button>
            <button onClick={onBack} className="btn btn-secondary">
              <MaterialIcon name="arrow_back" />
              Back
            </button>
          </div>
        </div>

        {/* Debug: Show picked/cleared emails */}
        {messageStates && (messageStates.pickedEmails.length > 0 || messageStates.removedEmails.length > 0) && (
          <div className="border-t border-neutral-200 pt-6">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-neutral-600 hover:text-neutral-900">
                Debug: Show picked/cleared emails ({messageStates.pickedEmails.length + messageStates.removedEmails.length} total)
              </summary>
              <div className="mt-4 space-y-4">
                {messageStates.pickedEmails.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                      Picked Emails ({messageStates.pickedEmails.length})
                    </h4>
                    <div className="space-y-2">
                      {messageStates.pickedEmails.map((email) => (
                        <div
                          key={email.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-emerald-900 truncate">{email.subject}</div>
                            <div className="mt-1 text-emerald-700">{new Date(email.date).toLocaleDateString()}</div>
                          </div>
                          <button
                            onClick={() => unpickEmail.mutate(email.id)}
                            disabled={unpickEmail.isPending}
                            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {unpickEmail.isPending ? "..." : "Undo"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {messageStates.removedEmails.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">
                      Cleared Emails ({messageStates.removedEmails.length})
                    </h4>
                    <div className="space-y-2">
                      {messageStates.removedEmails.map((email) => (
                        <div
                          key={email.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-neutral-700 truncate">{email.subject}</div>
                            <div className="mt-1 text-neutral-500">{new Date(email.date).toLocaleDateString()}</div>
                          </div>
                          <button
                            onClick={() => restoreEmail.mutate(email.id)}
                            disabled={restoreEmail.isPending}
                            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                          >
                            {restoreEmail.isPending ? "..." : "Restore"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
    );
  }

  return null;
}
