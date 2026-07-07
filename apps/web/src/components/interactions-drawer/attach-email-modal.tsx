import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GmailEmailSelector } from "../shared/gmail-email-selector";
import { Modal } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { useState } from "react";

type AttachEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  interactionId: string;
  opportunitySlug: string;
  onAttached?: (aiSuggestion?: any) => void;
};

export function AttachEmailModal({
  isOpen,
  onClose,
  interactionId,
  opportunitySlug,
  onAttached,
}: AttachEmailModalProps) {
  const interactionSlug = interactionId;
  const queryClient = useQueryClient();
  const [isAttaching, setIsAttaching] = useState(false);

  // Fetch Gmail search results
  const {
    data: searchResults,
    isLoading,
    refetch: refetchSearch,
    isRefetching,
  } = useQuery({
    queryKey: ["gmail-search", opportunitySlug],
    queryFn: () => api.gmailSearch(opportunitySlug),
    enabled: isOpen && !!opportunitySlug,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["gmail-message-states", opportunitySlug],
    });
    refetchSearch();
  };

  // Get already attached emails to filter them out
  const { data: attachedEmails = [] } = useQuery({
    queryKey: ["interaction-emails", interactionId],
    queryFn: () => api.listInteractionEmails(interactionSlug),
    enabled: isOpen && !!interactionId,
  });

  // Fetch Gmail message states for debug section
  const { data: messageStates } = useQuery({
    queryKey: ["gmail-message-states", opportunitySlug],
    queryFn: () => api.gmailMessageStates(opportunitySlug),
    enabled: isOpen && !!opportunitySlug,
  });

  const unpickEmail = useMutation({
    mutationFn: (messageId: string) =>
      api.gmailUnpickEmail(opportunitySlug, messageId),
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
    mutationFn: (messageId: string) =>
      api.gmailRestoreEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-message-states", opportunitySlug],
      });
      queryClient.invalidateQueries({
        queryKey: ["gmail-search", opportunitySlug],
      });
    },
  });

  const attachedGmailIds = new Set(attachedEmails.map((e) => e.gmailMessageId));

  const handleAttach = async (selectedEmailIds: string[]) => {
    if (selectedEmailIds.length === 0) return;

    setIsAttaching(true);
    try {
      // Attach all selected emails in a single batch request to avoid race conditions
      const result = await api.attachMultipleEmailsToInteraction(
        interactionId,
        selectedEmailIds,
      );

      // Invalidate and refetch queries - wait for them to complete
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["interaction-emails", interactionId],
        }),
        queryClient.invalidateQueries({ queryKey: ["interactions"] }),
        queryClient.invalidateQueries({
          queryKey: ["opportunities", opportunitySlug],
        }),
        queryClient.refetchQueries({
          queryKey: ["opportunity", opportunitySlug],
        }),
      ]);

      // Close modal
      onClose();

      // Small delay to ensure React has re-rendered with new data
      setTimeout(() => {
        // Trigger callback with AI suggestion to open edit form
        onAttached?.(result.aiSuggestion);
      }, 100);
    } catch (error) {
      console.error("Failed to attach emails:", error);
      alert("Failed to attach emails. Please try again.");
    } finally {
      setIsAttaching(false);
    }
  };

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
      }
    : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach Gmail Emails"
      size="lg"
    >
      <GmailEmailSelector
        candidates={searchResults?.candidates || []}
        isLoading={isLoading}
        emptyMessage="No available emails found"
        emptySubMessage={
          attachedEmails.length > 0
            ? "All found emails are already attached"
            : "Try searching for emails in Gmail"
        }
        onSubmit={handleAttach}
        onCancel={onClose}
        submitLabel="Attach"
        submitIcon="attach_file"
        isSubmitting={isAttaching}
        allowMultiSelect={true}
        filterOutIds={attachedGmailIds}
        messageStates={transformedMessageStates}
        onUnpick={(messageId) => unpickEmail.mutate(messageId)}
        onRestore={(messageId) => restoreEmail.mutate(messageId)}
        isUnpickPending={unpickEmail.isPending}
        isRestorePending={restoreEmail.isPending}
        showDebugSection={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
      />
    </Modal>
  );
}
