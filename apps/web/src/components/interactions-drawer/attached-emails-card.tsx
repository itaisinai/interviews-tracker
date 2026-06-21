import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { Modal, MaterialIcon, LoadingButton } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import type { Interaction } from "../../lib/types";

type AttachedEmail = {
  id: string;
  interactionId: string;
  gmailMessageId: string;
  subject: string | null;
  from: string | null;
  receivedDate: string | null;
  extractedData: unknown;
  attachedAt: string;
};

type AttachedEmailsCardProps = {
  interactionId: string;
  opportunityId: string;
  onEmailsAttached?: (aiSuggestion?: any) => void;
};

function formatEmailDate(value: string | null, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, options);
}

function formatTableDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInteractionLabel(interaction: Pick<Interaction, "type" | "stage" | "date">) {
  return interaction.stage || interaction.type || formatEmailDate(interaction.date);
}

export function AttachedEmailsCard({
  interactionId,
  opportunityId,
  onEmailsAttached,
}: AttachedEmailsCardProps) {
  const queryClient = useQueryClient();
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["interaction-emails", interactionId],
    queryFn: () => api.listInteractionEmails(interactionId),
    enabled: !!interactionId,
  });

  const handleReparse = async () => {
    if (emails.length === 0) return;

    setIsReparsing(true);
    try {
      const result = await api.reparseInteractionEmails(interactionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interaction-emails", interactionId] }),
        queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
        queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
        queryClient.invalidateQueries({ queryKey: ["interactions"] }),
      ]);
      onEmailsAttached?.((result as any).aiSuggestion);
    } catch (error) {
      console.error("Failed to reparse emails:", error);
      alert("Failed to reparse emails. Please try again.");
    } finally {
      setIsReparsing(false);
    }
  };

  const visibleEmails = emails.slice(0, 3);
  const hiddenEmailCount = Math.max(emails.length - visibleEmails.length, 0);

  return (
    <>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="mail" className="text-[20px] text-neutral-700" />
            <h3 className="text-base font-semibold text-neutral-950">Attached Emails</h3>
          </div>
          <div className="flex items-center gap-3">
            {emails.length > 0 ? (
              <button
                onClick={handleReparse}
                disabled={isReparsing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                title="Re-parse all attached emails"
              >
                <MaterialIcon name={isReparsing ? "progress_activity" : "refresh"} className={`text-[15px] ${isReparsing ? "animate-spin" : ""}`} />
                Re-parse
              </button>
            ) : null}
            <button
              onClick={() => setShowMappingModal(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <MaterialIcon name="add" className="text-[16px]" />
              Attach
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-neutral-100 py-8 text-sm text-neutral-500">Loading emails...</div>
        ) : emails.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 py-8 text-center">
            <p className="mb-3 text-sm text-neutral-500">No emails attached</p>
            <button onClick={() => setShowMappingModal(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Attach an email
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 p-3">
            <div className="space-y-3">
              {visibleEmails.map((email) => (
                <div key={email.id} className="flex items-start gap-3">
                  <MaterialIcon name="check_circle" className="mt-0.5 text-[18px] text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{email.subject || "No subject"}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{formatEmailDate(email.receivedDate, { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
              ))}
            </div>
            {hiddenEmailCount > 0 ? (
              <button onClick={() => setShowMappingModal(true)} className="mt-3 rounded-lg bg-neutral-100 px-5 py-2 text-sm text-neutral-600 hover:bg-neutral-200">
                +{hiddenEmailCount} more email{hiddenEmailCount === 1 ? "" : "s"}
              </button>
            ) : null}
          </div>
        )}

        <button
          onClick={() => setShowMappingModal(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          <MaterialIcon name="hub" className="text-[18px]" />
          Manage Mapping
        </button>
      </div>

      <EmailMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        interactionId={interactionId}
        opportunityId={opportunityId}
        attachedEmails={emails}
        onChanged={onEmailsAttached}
      />
    </>
  );
}

type MappingRow = {
  gmailMessageId: string;
  subject: string;
  from: string;
  date: string | null;
  snippet?: string;
  attachedEmail?: AttachedEmail & { linkedInteraction?: Interaction };
};

type EmailMappingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  interactionId: string;
  opportunityId: string;
  attachedEmails: AttachedEmail[];
  onChanged?: (aiSuggestion?: any) => void;
};

function EmailMappingModal({ isOpen, onClose, interactionId, opportunityId, attachedEmails, onChanged }: EmailMappingModalProps) {
  const queryClient = useQueryClient();
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [targetInteractionId, setTargetInteractionId] = useState(interactionId);

  const { data: opportunity } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: () => api.opportunity(opportunityId),
    enabled: isOpen && !!opportunityId,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["gmail-search", opportunityId],
    queryFn: () => api.gmailSearch(opportunityId),
    enabled: isOpen && !!opportunityId,
  });

  const allInteractions = opportunity?.interactions ?? [];
  const interactionEmailQueries = useQueries({
    queries: allInteractions.map((interaction) => ({
      queryKey: ["interaction-emails", interaction.id],
      queryFn: () => api.listInteractionEmails(interaction.id),
      enabled: isOpen && Boolean(interaction.id),
    })),
  });

  const allAttachedEmails = useMemo(() => {
    const emailsByInteraction = interactionEmailQueries.flatMap((query, index) =>
      (query.data ?? []).map((email) => ({
        ...email,
        linkedInteraction: allInteractions[index],
      })),
    );

    if (emailsByInteraction.length > 0) return emailsByInteraction;

    return attachedEmails.map((email) => ({
      ...email,
      linkedInteraction: allInteractions.find((interaction) => interaction.id === email.interactionId),
    }));
  }, [allInteractions, attachedEmails, interactionEmailQueries]);

  const attachedByGmailId = useMemo(() => new Map(allAttachedEmails.map((email) => [email.gmailMessageId, email])), [allAttachedEmails]);

  const rows = useMemo<MappingRow[]>(() => {
    const candidates = searchResults?.candidates ?? [];
    const candidateRows = candidates.map((candidate) => ({
      gmailMessageId: candidate.id,
      subject: candidate.subject || "No subject",
      from: candidate.from || "Unknown sender",
      date: candidate.date,
      snippet: candidate.snippet,
      attachedEmail: attachedByGmailId.get(candidate.id),
    }));

    const candidateIds = new Set(candidateRows.map((row) => row.gmailMessageId));
    const attachedOnlyRows = allAttachedEmails
      .filter((email) => !candidateIds.has(email.gmailMessageId))
      .map((email) => ({
        gmailMessageId: email.gmailMessageId,
        subject: email.subject || "No subject",
        from: email.from || "Unknown sender",
        date: email.receivedDate,
        attachedEmail: email,
      }));

    return [...candidateRows, ...attachedOnlyRows].sort((left, right) => new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime());
  }, [allAttachedEmails, attachedByGmailId, searchResults?.candidates]);

  const refreshAfterMappingChange = async () => {
    await Promise.all([
      ...allInteractions.map((interaction) => queryClient.invalidateQueries({ queryKey: ["interaction-emails", interaction.id] })),
      queryClient.invalidateQueries({ queryKey: ["interaction-emails", interactionId] }),
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] }),
      queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
      queryClient.invalidateQueries({ queryKey: ["interactions"] }),
    ]);
  };

  const attachMutation = useMutation({
    mutationFn: (gmailMessageIds: string[]) => api.attachMultipleEmailsToInteraction(targetInteractionId, gmailMessageIds),
    onSuccess: async () => {
      setSelectedEmailIds(new Set());
      await refreshAfterMappingChange();
      onChanged?.();
    },
  });

  const detachMutation = useMutation({
    mutationFn: (emailId: string) => api.removeEmailFromInteraction(rows.find((row) => row.attachedEmail?.id === emailId)?.attachedEmail?.interactionId ?? interactionId, emailId),
    onSuccess: refreshAfterMappingChange,
  });

  const reparseMutation = useMutation({
    mutationFn: () => api.reparseInteractionEmails(interactionId),
    onSuccess: async (result) => {
      await refreshAfterMappingChange();
      onChanged?.((result as any).aiSuggestion);
    },
  });

  const toggleSelected = (gmailMessageId: string) => {
    setSelectedEmailIds((current) => {
      const next = new Set(current);
      if (next.has(gmailMessageId)) {
        next.delete(gmailMessageId);
      } else {
        next.add(gmailMessageId);
      }
      return next;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Email Attachments & Mapping" size="lg">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
              <tr>
                <th className="w-10 px-4 py-3" aria-label="Attachment state" />
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Linked to</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {isSearching ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">Loading emails...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-500">No parsed emails found for this opportunity.</td>
                </tr>
              ) : rows.map((row) => {
                const isAttached = Boolean(row.attachedEmail);
                return (
                  <tr key={row.gmailMessageId} className="hover:bg-neutral-50/70">
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => !isAttached && toggleSelected(row.gmailMessageId)}
                        className="mt-1"
                        aria-label={isAttached ? "Attached to this interaction" : "Select email to attach"}
                      >
                        {isAttached ? (
                          <MaterialIcon name="check_circle" className="text-[18px] text-emerald-600" />
                        ) : selectedEmailIds.has(row.gmailMessageId) ? (
                          <MaterialIcon name="radio_button_checked" className="text-[18px] text-blue-600" />
                        ) : (
                          <MaterialIcon name="radio_button_unchecked" className="text-[18px] text-neutral-400" />
                        )}
                      </button>
                    </td>
                    <td className="max-w-[20rem] px-3 py-3 align-top">
                      <p className="truncate font-medium text-neutral-900">{row.subject}</p>
                      <p className="truncate text-xs text-neutral-500">{row.from}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {isAttached ? (
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                          {row.attachedEmail?.linkedInteraction ? getInteractionLabel(row.attachedEmail.linkedInteraction) : "Attached"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-500">Not attached</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-neutral-600">{formatTableDate(row.date)}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        {!isAttached ? (
                          <button onClick={() => attachMutation.mutate([row.gmailMessageId])} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                            Attach
                          </button>
                        ) : null}
                        <button
                          onClick={() => row.attachedEmail && detachMutation.mutate(row.attachedEmail.id)}
                          disabled={!isAttached || detachMutation.isPending}
                          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-100 disabled:text-neutral-300"
                        >
                          Detach
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-600">Attach selected to:</span>
            <select
              value={targetInteractionId}
              onChange={(event) => setTargetInteractionId(event.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800"
            >
              {allInteractions.map((interaction) => (
                <option key={interaction.id} value={interaction.id}>{getInteractionLabel(interaction)}</option>
              ))}
            </select>
            <LoadingButton
              loading={attachMutation.isPending}
              loadingLabel="Attaching..."
              disabled={selectedEmailIds.size === 0}
              onClick={() => attachMutation.mutate(Array.from(selectedEmailIds))}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Attach
            </LoadingButton>
          </div>
          <button
            onClick={() => reparseMutation.mutate()}
            disabled={attachedEmails.length === 0 || reparseMutation.isPending}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-neutral-300"
          >
            <MaterialIcon name={reparseMutation.isPending ? "progress_activity" : "refresh"} className={`text-[18px] ${reparseMutation.isPending ? "animate-spin" : ""}`} />
            Re-parse selected emails
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600">
          <span className="inline-flex items-center gap-1"><MaterialIcon name="check_circle" className="text-[16px] text-emerald-600" /> Attached to this interaction</span>
          <span className="inline-flex items-center gap-1"><MaterialIcon name="radio_button_unchecked" className="text-[16px] text-neutral-400" /> Not attached</span>
          <span className="inline-flex items-center gap-1"><MaterialIcon name="arrow_right_alt" className="text-[16px] text-blue-500" /> Linked to interaction</span>
        </div>
      </div>
    </Modal>
  );
}
