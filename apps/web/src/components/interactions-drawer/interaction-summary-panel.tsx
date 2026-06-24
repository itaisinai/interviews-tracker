import { type Dispatch, type SetStateAction, useState } from "react";
import type { Interaction, InteractionDraft, Person } from "../../lib/types";
import { InteractionDraftFields } from "./interaction-draft-fields";
import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { InteractionSummaryCompact } from "./interaction-summary-compact";
import { ParticipantsCard } from "./participants-card";
import { AttachedEmailsCard } from "./attached-emails-card";
import { QuickInfoCard } from "./quick-info-card";
import { NotesCard } from "./notes-card";
import { GmailEmailStatesSection } from "./gmail-email-states-section";
import { AddFeedbackModal } from "./add-feedback-modal";

type InteractionSummaryPanelProps = {
  interaction: Interaction;
  headerBadge: {
    label: string;
    tone: "blue" | "green" | "red" | "muted" | "warning";
  } | null;
  isEditing: boolean;
  draft: InteractionDraft | null;
  onToggleEditing: (aiSuggestion?: any) => void;
  onCancelEditing: () => void;
  onDraftChange: Dispatch<SetStateAction<InteractionDraft | null>>;
  onSave: () => void;
  isSaving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  opportunityCompanyName?: string;
};

export function InteractionSummaryPanel({
  interaction,
  headerBadge,
  isEditing,
  draft,
  onToggleEditing,
  onCancelEditing,
  onDraftChange,
  onSave,
  isSaving,
  onDelete,
  isDeleting,
  opportunityCompanyName,
}: InteractionSummaryPanelProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Split multiple names
  const personNames = interaction.personName
    ? interaction.personName
        .split(/\s+and\s+|,\s*/)
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  // Fetch contacts for this opportunity
  const { data: contacts = [] } = useQuery({
    queryKey: ["opportunity-contacts", interaction.jobOpportunityId],
    queryFn: () => api.getOpportunityContacts(interaction.jobOpportunityId),
    enabled: !!interaction.jobOpportunityId && !!interaction.personName,
  });

  const personRecords = personNames.map((name) => {
    // If name looks like an email, match by email
    const isEmail = name.includes("@");
    if (isEmail) {
      return (contacts as Person[]).find((c) => c.email === name);
    }

    // Otherwise, try multiple name matching strategies:
    // 1. Exact match
    const exactMatch = (contacts as Person[]).find((c) => c.name === name);
    if (exactMatch) return exactMatch;

    // 2. Case-insensitive match
    const caseInsensitiveMatch = (contacts as Person[]).find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    // 3. First name match (e.g., "Rotem Zikorel" matches "Rotem")
    const firstNameMatch = (contacts as Person[]).find((c) => {
      const contactFirstName = c.name.split(' ')[0].toLowerCase();
      const nameFirstName = name.split(' ')[0].toLowerCase();
      return contactFirstName === nameFirstName;
    });
    if (firstNameMatch) return firstNameMatch;

    // 4. Full name contains contact name (e.g., "Rotem Zikorel" contains "Rotem")
    const containsMatch = (contacts as Person[]).find((c) => {
      const nameLower = name.toLowerCase();
      const contactNameLower = c.name.toLowerCase();
      return nameLower.includes(contactNameLower) || contactNameLower.includes(nameLower);
    });

    return containsMatch;
  });

  const handleAddFeedback = async (content: string, source?: string) => {
    console.log("[FEEDBACK] Submitting feedback", {
      interactionId: interaction.id,
      contentLength: content.length,
      source,
    });

    // Call API to add feedback and get AI suggestion
    const result = await api.addFeedbackToInteraction(
      interaction.id,
      content,
      source,
    );

    console.log("[FEEDBACK] Got AI suggestion from API", {
      hasAiSuggestion: !!(result as any).aiSuggestion,
      aiNotes: (result as any).aiSuggestion?.notes?.slice(0, 100),
    });

    // Pass AI suggestion to edit form (same flow as reparse). This action is
    // disabled while editing so it cannot overwrite an in-progress draft.
    onToggleEditing((result as any).aiSuggestion);
  };

  return (
    <div className="space-y-4">
      {/* Compact Summary */}
      <InteractionSummaryCompact
        interaction={interaction}
        statusBadge={headerBadge}
        onEdit={() => onToggleEditing()}
        onCancelEditing={onCancelEditing}
        onDelete={() => {
          if (window.confirm("Delete this interaction?")) {
            onDelete();
          }
        }}
        onAddFeedback={() => {
          if (!isEditing) {
            setShowFeedbackModal(true);
          }
        }}
        isAddFeedbackDisabled={isEditing}
        isEditing={isEditing}
      />

      {/* Edit Form */}
      {isEditing && draft ? (
        <div className="p-6 rounded-lg border border-neutral-200 bg-neutral-50 space-y-4">
          <InteractionDraftFields draft={draft} setDraft={onDraftChange} />
          <div className="flex gap-3">
            <LoadingButton
              loading={isSaving}
              loadingLabel="Saving..."
              onClick={onSave}
              className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center justify-center"
              title="Save changes"
            >
              <Save className="h-5 w-5" />
            </LoadingButton>
            <button
              onClick={onCancelEditing}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors inline-flex items-center justify-center"
              title="Cancel"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Two-column: Participants + Attached Emails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParticipantsCard
          personNames={personNames}
          personRecords={personRecords}
          opportunityId={interaction.jobOpportunityId}
          opportunityCompanyName={opportunityCompanyName}
          columns={1}
        />
        <AttachedEmailsCard
          interactionId={interaction.id}
          opportunityId={interaction.jobOpportunityId}
          onEmailsAttached={onToggleEditing}
        />
      </div>

      {/* Quick Info */}
      <QuickInfoCard interaction={interaction} />

      {/* Notes */}
      <NotesCard notes={interaction.notes ?? null} />

      {/* Outcome */}
      {!isEditing && interaction.outcome && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">
            Outcome
          </h3>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {interaction.outcome}
          </p>
        </div>
      )}

      {/* Follow-up */}
      {!isEditing && interaction.followUp && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">
            Follow-up
          </h3>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {interaction.followUp}
          </p>
        </div>
      )}

      {/* Add Feedback Modal */}
      <AddFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleAddFeedback}
      />

      {/* Gmail Email States */}
      <GmailEmailStatesSection opportunityId={interaction.jobOpportunityId} />
    </div>
  );
}
