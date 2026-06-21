import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AttachEmailModal } from "./attach-email-modal";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { useState } from "react";

type AttachedEmailsCardProps = {
  interactionId: string;
  opportunityId: string;
  onEmailsAttached?: (aiSuggestion?: any) => void;
};

export function AttachedEmailsCard({
  interactionId,
  opportunityId,
  onEmailsAttached,
}: AttachedEmailsCardProps) {
  const queryClient = useQueryClient();
  const [showAttachModal, setShowAttachModal] = useState(false);
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
      // API returns interaction with aiSuggestion (NOT saved to DB yet)
      const result = await api.reparseInteractionEmails(interactionId);

      // Store result in cache for background sync
      queryClient.setQueryData(["opportunity", opportunityId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          interactions: old.interactions.map((int: any) =>
            int.id === interactionId ? result : int,
          ),
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
        <div className="flex items-center justify-center py-4 text-neutral-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MaterialIcon
              name="mail"
              className="text-[18px] text-neutral-600"
            />
            <h3 className="text-sm font-semibold text-neutral-900">
              Attached Emails
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <button
                onClick={handleReparse}
                disabled={isReparsing}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 disabled:opacity-50"
                title="Re-parse all emails"
              >
                <MaterialIcon
                  name={isReparsing ? "progress_activity" : "refresh"}
                  className={`text-[14px] ${isReparsing ? "animate-spin" : ""}`}
                />
                Re-parse
              </button>
            )}
            <button
              onClick={() => setShowAttachModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <MaterialIcon name="add" className="text-[14px]" />
              Attach
            </button>
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
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-start gap-2 py-2 px-2 rounded hover:bg-neutral-50 transition-colors"
              >
                <MaterialIcon
                  name="mail"
                  className="text-[16px] text-neutral-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-900 font-medium truncate">
                    {email.subject || "No subject"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {email.from || "Unknown sender"}
                    {email.receivedDate && (
                      <>
                        {" • "}
                        {new Date(email.receivedDate).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AttachEmailModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        interactionId={interactionId}
        opportunityId={opportunityId}
        onAttached={onEmailsAttached}
      />
    </>
  );
}
