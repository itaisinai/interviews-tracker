import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Modal } from "@interviews-tracker/design-system";
import { api } from "../../lib/api";
import { GmailEmailSelector } from "./gmail-email-selector";

type SelectGmailEmailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunitySlug: string;
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
  opportunitySlug,
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
    queryKey: ["gmail-search", opportunitySlug],
    queryFn: () => api.gmailSearch(opportunitySlug),
    enabled: isOpen && !!opportunitySlug,
  });

  // Fetch Gmail message states for debug section
  const { data: messageStates } = useQuery({
    queryKey: ["gmail-message-states", opportunitySlug],
    queryFn: () => api.gmailMessageStates(opportunitySlug),
    enabled: isOpen && !!opportunitySlug,
  });

  const unpickEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailUnpickEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunitySlug] });
      queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunitySlug] });
    },
  });

  const restoreEmail = useMutation({
    mutationFn: (messageId: string) => api.gmailRestoreEmail(opportunitySlug, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunitySlug] });
      queryClient.invalidateQueries({ queryKey: ["gmail-search", opportunitySlug] });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["gmail-message-states", opportunitySlug] });
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
