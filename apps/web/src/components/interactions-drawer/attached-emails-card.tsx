import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import type { GmailSearchCandidate } from "../../lib/types";

import { AttachEmailModal } from "./attach-email-modal";

type AttachedEmailsCardProps = {
  interactionSlug: string;
  opportunitySlug: string;
  onEmailsAttached?: (aiSuggestion?: any) => void;
};

export function AttachedEmailsCard({ interactionSlug, opportunitySlug, onEmailsAttached }: AttachedEmailsCardProps) {
  const queryClient = useQueryClient();
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["interaction-emails", interactionSlug],
    queryFn: () => api.listInteractionEmails(interactionSlug),
    enabled: !!interactionSlug,
  });

  // Fetch Gmail search results to get full email details and relevance
  const { data: searchResults } = useQuery({
    queryKey: ["gmail-search", opportunitySlug],
    queryFn: () => api.gmailSearch(opportunitySlug),
    enabled: !!opportunitySlug,
  });

  // Map attached emails to their full Gmail data
  const enrichedEmails = emails.map((email) => {
    const gmailData = searchResults?.candidates.find((c: GmailSearchCandidate) => c.id === email.gmailMessageId);
    return {
      ...email,
      gmailData,
    };
  });

  const detachMutation = useMutation({
    mutationFn: (emailId: string) => api.removeEmailFromInteraction(interactionSlug, emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["interaction-emails", interactionSlug],
      });
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      queryClient.invalidateQueries({
        queryKey: ["opportunities", opportunitySlug],
      });
    },
  });

  const handleReparse = async () => {
    if (emails.length === 0) return;

    setIsReparsing(true);
    try {
      // API returns interaction with aiSuggestion (NOT saved to DB yet)
      const result = await api.reparseInteractionEmails(interactionSlug);

      // Store result in cache for background sync
      queryClient.setQueryData(["opportunity", opportunitySlug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          interactions: old.interactions.map((int: any) => (int.slug === interactionSlug ? result : int)),
        };
      });

      // Pass AI suggestion directly to drawer so it can use it immediately
      onEmailsAttached?.((result as any).aiSuggestion);
    } catch (error) {
      console.error("Failed to reparse emails:", error);
      alert("Failed to reparse emails. Please try again.");
    } finally {
      setIsReparsing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-center py-4 text-neutral-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon name="mail" className="text-[18px] text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Attached</h3>
          </div>
          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <Button
                onClick={handleReparse}
                disabled={isReparsing}
                variant="outlined"
                size="sm"
                leadingIcon="refresh"
                loading={isReparsing}
                title="Re-parse all emails"
              >
                Re-parse
              </Button>
            )}
            <Button onClick={() => setShowAttachModal(true)} variant="outlined" size="sm" leadingIcon="add">
              Attach
            </Button>
          </div>
        </div>

        {emails.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-500 mb-2">No emails attached</p>
            <button
              onClick={() => setShowAttachModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Attach an email
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {enrichedEmails.map((email) => {
              const gmailData = email.gmailData;
              const isRelevant = gmailData?.relevance?.isRelevant;

              return (
                <div
                  key={email.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
                >
                  {/* Email info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm text-neutral-900 truncate">
                        {email.subject || "No subject"}
                      </div>
                      {isRelevant && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium flex-shrink-0">
                          <MaterialIcon name="check_circle" className="text-[12px]" />
                          Relevant
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mb-1">From: {email.from || "Unknown sender"}</div>
                    <div className="text-xs text-neutral-400">
                      {email.receivedDate
                        ? new Date(email.receivedDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "No date"}
                    </div>
                    {gmailData?.snippet && (
                      <div className="text-xs text-neutral-500 mt-2 line-clamp-2">{gmailData.snippet}</div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => detachMutation.mutate(email.id)}
                    disabled={detachMutation.isPending}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Remove email"
                  >
                    <MaterialIcon name="close" className="text-[16px]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AttachEmailModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        interactionSlug={interactionSlug}
        opportunitySlug={opportunitySlug}
        onAttached={onEmailsAttached}
      />
    </>
  );
}
