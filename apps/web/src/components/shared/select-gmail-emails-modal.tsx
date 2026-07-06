import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Modal } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { GmailEmailSelector } from "./gmail-email-selector";

type SelectGmailEmailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  onEmailsSelected: (selectedIds: string[]) => void | Promise<void>;
  title?: string;
  submitLabel?: string;
  submitIcon?: string;
  filterOutIds?: Set<string>;
  emptyMessage?: string;
  emptySubMessage?: string;
};

export function SelectGmailEmailsModal({
  isOpen,
  onClose,
  opportunityId,
  onEmailsSelected,
  title = "Select Gmail Emails",
  submitLabel = "Continue",
  submitIcon = "arrow_forward",
  filterOutIds = new Set(),
  emptyMessage = "No available emails found",
  emptySubMessage = "Try searching for emails in Gmail",
}: SelectGmailEmailsModalProps) {
  const queryClient = useQueryClient();

  // Fetch Gmail search results
  const { data: searchResults, isLoading, refetch: refetchSearch, isRefetching } = useQuery({
    queryKey: ["gmail-search", opportunityId],
    queryFn: () => api.gmailSearch(opportunityId),
    enabled: isOpen && !!opportunityId,
  });

  // Fetch Gmail message states for debug section
  const { data: messageStates } = useQuery({
    queryKey: ["gmail-message-states", opportunityId],
    queryFn: () => api.gmailMessageStates(opportunityId),
    enabled: isOpen && !!opportunityId,
  });

  const unpickEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailUnpickEmail(opportunityId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunityId] });
    },
  });

  const restoreEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailRestoreEmail(opportunityId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunityId] });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunityId] });
    refetchSearch();
  };

  // Transform messageStates to the format expected by GmailEmailSelector
  const transformedMessageStates = messageStates ? {
    pickedEmails: messageStates.pickedEmails.map(e => ({
      id: e.id,
      subject: e.subject,
      date: e.date
    })),
    removedEmails: messageStates.removedEmails.map(e => ({
      id: e.id,
      subject: e.subject,
      date: e.date
    }))
  } : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <GmailEmailSelector
        candidates={searchResults?.candidates || []}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        emptySubMessage={emptySubMessage}
        onSubmit={onEmailsSelected}
        onCancel={onClose}
        submitLabel={submitLabel}
        submitIcon={submitIcon}
        isSubmitting={false}
        allowMultiSelect={true}
        filterOutIds={filterOutIds}
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
