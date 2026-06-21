import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, MaterialIcon, LoadingButton } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import type { GmailSearchCandidate } from "../../lib/types";

type AttachEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  interactionId: string;
  opportunityId: string;
  onAttached?: () => void;
};

export function AttachEmailModal({
  isOpen,
  onClose,
  interactionId,
  opportunityId,
  onAttached
}: AttachEmailModalProps) {
  const queryClient = useQueryClient();
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [isAttaching, setIsAttaching] = useState(false);

  // Fetch Gmail search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["gmail-search", opportunityId],
    queryFn: () => api.gmailSearch(opportunityId),
    enabled: isOpen && !!opportunityId,
  });

  // Get already attached emails to filter them out
  const { data: attachedEmails = [] } = useQuery({
    queryKey: ["interaction-emails", interactionId],
    queryFn: () => api.listInteractionEmails(interactionId),
    enabled: isOpen && !!interactionId,
  });

  const attachedGmailIds = new Set(attachedEmails.map(e => e.gmailMessageId));

  // Filter out already attached emails
  const availableCandidates = (searchResults?.candidates || []).filter(
    candidate => !attachedGmailIds.has(candidate.id)
  );

  const handleToggleEmail = (emailId: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const handleAttach = async () => {
    if (selectedEmailIds.size === 0) return;

    setIsAttaching(true);
    try {
      // Attach all selected emails
      await Promise.all(
        Array.from(selectedEmailIds).map(gmailMessageId =>
          api.attachEmailToInteraction(interactionId, gmailMessageId)
        )
      );

      // Invalidate and refetch queries - wait for them to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["interaction-emails", interactionId] }),
        queryClient.invalidateQueries({ queryKey: ["interactions"] }),
        queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId] }),
        queryClient.refetchQueries({ queryKey: ["opportunity", opportunityId] })
      ]);

      // Close modal and reset
      setSelectedEmailIds(new Set());
      onClose();

      // Small delay to ensure React has re-rendered with new data
      setTimeout(() => {
        // Trigger callback to open edit form
        onAttached?.();
      }, 100);
    } catch (error) {
      console.error("Failed to attach emails:", error);
      alert("Failed to attach emails. Please try again.");
    } finally {
      setIsAttaching(false);
    }
  };

  const handleClose = () => {
    setSelectedEmailIds(new Set());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Attach Gmail Emails"
      size="lg"
    >
      <div className="space-y-4 relative">
        {/* Attaching overlay */}
        {isAttaching && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
            <MaterialIcon name="progress_activity" className="text-[48px] text-blue-600 animate-spin mb-4" />
            <p className="text-sm font-medium text-neutral-900">Attaching emails...</p>
            <p className="text-xs text-neutral-500 mt-1">Parsing and aggregating data</p>
          </div>
        )}

        {/* Info */}
        <p className="text-sm text-neutral-600">
          Select one or more emails to attach to this interaction. All attached emails will be aggregated together.
        </p>

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
            <p className="text-sm text-neutral-500">No available emails found</p>
            <p className="text-xs text-neutral-400 mt-1">
              {attachedEmails.length > 0 ? "All found emails are already attached" : "Try searching for emails in Gmail"}
            </p>
          </div>
        )}

        {/* Email list */}
        {!isLoading && availableCandidates.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableCandidates.map((candidate) => {
              const isSelected = selectedEmailIds.has(candidate.id);
              const isRelevant = candidate.relevance.isRelevant;

              return (
                <button
                  key={candidate.id}
                  onClick={() => handleToggleEmail(candidate.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  {/* Checkbox */}
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
              <span>Select emails to attach</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              loading={isAttaching}
              loadingLabel="Attaching..."
              onClick={handleAttach}
              disabled={selectedEmailIds.size === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <MaterialIcon name="attach_file" className="text-[16px]" />
              Attach {selectedEmailIds.size > 0 ? `(${selectedEmailIds.size})` : ""}
            </LoadingButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
