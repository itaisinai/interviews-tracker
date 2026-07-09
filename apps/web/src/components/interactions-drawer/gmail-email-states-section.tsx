import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";

type GmailEmailStatesSectionProps = {
  opportunitySlug: string;
};

export function GmailEmailStatesSection({ opportunitySlug }: GmailEmailStatesSectionProps) {
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [unpickingId, setUnpickingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [pickedExpanded, setPickedExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gmail-message-states", opportunitySlug],
    queryFn: () => api.gmailMessageStates(opportunitySlug),
    enabled: !!opportunitySlug,
  });

  const restoreMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.gmailRestoreEmail(opportunitySlug, messageId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      void queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
      setRestoringId(null);
    },
    onError: (error) => {
      console.error("Failed to restore email:", error);
      setRestoringId(null);
      alert("Failed to restore email");
    },
  });

  const unpickMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.gmailUnpickEmail(opportunitySlug, messageId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      void queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
      setUnpickingId(null);
    },
    onError: (error) => {
      console.error("Failed to unpick email:", error);
      setUnpickingId(null);
      alert("Failed to unpick email");
    },
  });

  const handleRestore = (messageId: string) => {
    setRestoringId(messageId);
    restoreMutation.mutate(messageId);
  };

  const handleUnpick = (messageId: string) => {
    setUnpickingId(messageId);
    unpickMutation.mutate(messageId);
  };

  if (isLoading) {
    return null;
  }

  const hasRemovedEmails = data && data.removedEmails.length > 0;
  const hasPickedEmails = data && data.pickedEmails.length > 0;

  if (!hasRemovedEmails && !hasPickedEmails) {
    return null;
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-neutral-900 mb-3 hover:text-neutral-700 transition-colors"
      >
        <span>Gmail Email States</span>
        <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[18px] text-neutral-500" />
      </button>

      {isExpanded && (
        <>
          {/* Removed/Hidden Emails */}
          {hasRemovedEmails && (
            <div className="mb-4">
              <button
                onClick={() => setHiddenExpanded(!hiddenExpanded)}
                className="flex items-center justify-between w-full text-xs font-medium text-neutral-600 mb-2 hover:text-neutral-800 transition-colors"
              >
                <span>Hidden Emails ({data.removedEmails.length})</span>
                <MaterialIcon name={hiddenExpanded ? "expand_less" : "expand_more"} className="text-[16px]" />
              </button>
              {hiddenExpanded && (
                <div className="space-y-1">
                  {data.removedEmails.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors group"
                    >
                      <MaterialIcon
                        name="visibility_off"
                        className="text-[16px] text-neutral-400 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-neutral-700 font-medium truncate">
                          {email.subject || "No subject"}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(email.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(email.id)}
                        disabled={restoringId === email.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 flex-shrink-0 flex items-center gap-1"
                        title="Restore to search results"
                      >
                        {restoringId === email.id ? (
                          <MaterialIcon name="progress_activity" className="text-[14px] animate-spin" />
                        ) : (
                          <>
                            <MaterialIcon name="restore" className="text-[14px]" />
                            Restore
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picked Emails */}
          {hasPickedEmails && (
            <div>
              <button
                onClick={() => setPickedExpanded(!pickedExpanded)}
                className="flex items-center justify-between w-full text-xs font-medium text-neutral-600 mb-2 hover:text-neutral-800 transition-colors"
              >
                <span>Picked Emails ({data.pickedEmails.length})</span>
                <MaterialIcon name={pickedExpanded ? "expand_less" : "expand_more"} className="text-[16px]" />
              </button>
              {pickedExpanded && (
                <div className="space-y-1">
                  {data.pickedEmails.map((email) => (
                    <div
                      key={email.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                    >
                      <MaterialIcon name="check_circle" className="text-[16px] text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-neutral-900 font-medium truncate">
                          {email.subject || "No subject"}
                        </div>
                        <div className="text-xs text-neutral-600">
                          {new Date(email.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnpick(email.id)}
                        disabled={unpickingId === email.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded text-xs font-medium text-neutral-600 hover:bg-neutral-100 flex-shrink-0 flex items-center gap-1"
                        title="Mark as not picked"
                      >
                        {unpickingId === email.id ? (
                          <MaterialIcon name="progress_activity" className="text-[14px] animate-spin" />
                        ) : (
                          <>
                            <MaterialIcon name="undo" className="text-[14px]" />
                            Unpick
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
