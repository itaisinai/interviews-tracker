import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { InteractionDraft } from "../../lib/types";
import { MaterialIcon, LoadingButton, DiffReviewRow } from "@interviews-tracker/design-system";
import { formatDateTime } from "../../lib/format";

type TrackedGmailEmail = {
  id: string;
  subject: string;
  date: string;
};

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

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["gmail-search", opportunityId],
    queryFn: () => api.gmailSearch(opportunityId),
    enabled: step === "searching",
  });
  const messageStatesQuery = useQuery({
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

  const createInteraction = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error("No draft available");
      return api.createInteraction(opportunityId, draft);
    },
    onSuccess: onSaved,
  });
  const refetchCandidatesAfterUndo = async () => {
    setSelectedMessageId(null);
    setDraft(null);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunityId],
      }),
      queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunityId] }),
    ]);
    setStep("searching");
  };
  const undoPickedEmail = useMutation({
    mutationFn: (email: TrackedGmailEmail) =>
      api.gmailUnpickEmail(opportunityId, email.id),
    onSuccess: refetchCandidatesAfterUndo,
  });
  const undoDismissedEmail = useMutation({
    mutationFn: (email: TrackedGmailEmail) =>
      api.gmailRestoreEmail(opportunityId, email.id),
    onSuccess: refetchCandidatesAfterUndo,
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
          <p className="text-sm text-neutral-700">
            Found {searchResults.candidates.length} potential emails. Select one to import:
          </p>
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
    const pickedEmails = messageStatesQuery.data?.pickedEmails ?? [];
    const dismissedEmails = messageStatesQuery.data?.removedEmails ?? [];

    return (
      <div className="space-y-6">
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            <MaterialIcon name="inbox" className="text-[32px] text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">
            No emails found
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            We couldn't find any recent emails for {companyName}.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TrackedEmailGroup
            title="Picked emails"
            description="Already attached or imported emails are excluded from future candidate searches."
            emptyMessage="No picked emails for this opportunity."
            emails={pickedEmails}
            actionLabel="Undo"
            isLoading={messageStatesQuery.isFetching}
            pendingEmailId={undoPickedEmail.variables?.id ?? null}
            isPending={undoPickedEmail.isPending}
            onUndo={(email) => undoPickedEmail.mutate(email)}
          />
          <TrackedEmailGroup
            title="Dismissed emails"
            description="Dismissed emails are hidden from candidate searches until you undo them."
            emptyMessage="No dismissed emails for this opportunity."
            emails={dismissedEmails}
            actionLabel="Undo"
            isLoading={messageStatesQuery.isFetching}
            pendingEmailId={undoDismissedEmail.variables?.id ?? null}
            isPending={undoDismissedEmail.isPending}
            onUndo={(email) => undoDismissedEmail.mutate(email)}
          />
        </div>

        <button onClick={onBack} className="btn btn-secondary mt-6">
          <MaterialIcon name="arrow_back" />
          Back
        </button>
      </div>
    );
  }

  return null;
}

function TrackedEmailGroup({
  title,
  description,
  emptyMessage,
  emails,
  actionLabel,
  isLoading,
  pendingEmailId,
  isPending,
  onUndo,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  emails: TrackedGmailEmail[];
  actionLabel: string;
  isLoading: boolean;
  pendingEmailId: string | null;
  isPending: boolean;
  onUndo: (email: TrackedGmailEmail) => void;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
          <p className="mt-1 text-xs text-neutral-600">{description}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
          {isLoading ? "…" : emails.length}
        </span>
      </div>

      {emails.length > 0 ? (
        <div className="mt-4 space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {email.subject}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {new Date(email.date).toLocaleString()}
                </p>
              </div>
              <LoadingButton
                className="btn btn-secondary shrink-0"
                loading={isPending && pendingEmailId === email.id}
                loadingLabel="Undoing..."
                icon="undo"
                onClick={() => onUndo(email)}
              >
                {actionLabel}
              </LoadingButton>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
