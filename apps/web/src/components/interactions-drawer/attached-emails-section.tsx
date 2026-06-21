import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { AttachEmailModal } from "./attach-email-modal";

type AttachedEmailsSectionProps = {
  interactionId: string;
  opportunityId: string;
  onEmailsAttached?: () => void;
};

export function AttachedEmailsSection({
  interactionId,
  opportunityId,
  onEmailsAttached,
}: AttachedEmailsSectionProps) {
  const queryClient = useQueryClient();
  const [removingEmailId, setRemovingEmailId] = useState<string | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["interaction-emails", interactionId],
    queryFn: () => api.listInteractionEmails(interactionId),
    enabled: !!interactionId,
  });

  const removeMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await api.removeEmailFromInteraction(interactionId, emailId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interaction-emails", interactionId] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setRemovingEmailId(null);
    },
    onError: (error) => {
      console.error("Failed to remove email:", error);
      setRemovingEmailId(null);
      alert("Failed to remove email attachment");
    },
  });

  const handleRemove = (emailId: string) => {
    if (confirm("Remove this email attachment? The interaction will be re-aggregated from remaining emails.")) {
      setRemovingEmailId(emailId);
      removeMutation.mutate(emailId);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">Attached Emails</h3>
        <div className="flex items-center justify-center py-8 text-neutral-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-neutral-900">Attached Emails</h3>
          <button
            onClick={() => setShowAttachModal(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <MaterialIcon name="add" className="text-[14px]" />
            Attach
          </button>
        </div>

        {emails.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-neutral-200 text-center">
            <p className="text-sm text-neutral-500 mb-2">No emails attached</p>
            <button
              onClick={() => setShowAttachModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Attach an email
            </button>
          </div>
        ) : (
        <div className="space-y-1">
          {emails.map((email) => (
            <div
              key={email.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
            >
              <MaterialIcon
                name="mail"
                className="text-[16px] text-neutral-400 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-900 font-medium truncate">
                  {email.subject || "No subject"}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                  {email.from || "Unknown sender"}
                  {email.receivedDate && (
                    <>
                      {" · "}
                      {new Date(email.receivedDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(email.id)}
                disabled={removingEmailId === email.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-100 flex-shrink-0"
                title="Remove attachment"
              >
                {removingEmailId === email.id ? (
                  <MaterialIcon name="progress_activity" className="text-[14px] text-neutral-400 animate-spin" />
                ) : (
                  <MaterialIcon name="close" className="text-[14px] text-neutral-400 hover:text-red-600" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Attach Email Modal */}
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
