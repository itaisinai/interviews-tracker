import { type Dispatch, type SetStateAction } from "react";
import type { Interaction, InteractionDraft, Person } from "../../lib/types";
import { InteractionDraftFields } from "./interaction-draft-fields";
import { LoadingButton } from "@interviews-tracker/design-system";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { InteractionSummaryCompact } from "./interaction-summary-compact";
import { ParticipantsCard } from "./participants-card";
import { AttachedEmailsCard } from "./attached-emails-card";
import { QuickInfoCard } from "./quick-info-card";
import { NotesCard } from "./notes-card";
import { GmailEmailStatesSection } from "./gmail-email-states-section";

type InteractionSummaryRefactoredProps = {
  interaction: Interaction;
  headerBadge: {
    label: string;
    tone: "blue" | "green" | "red" | "muted" | "warning";
  } | null;
  isEditing: boolean;
  draft: InteractionDraft | null;
  onToggleEditing: () => void;
  onCancelEditing: () => void;
  onDraftChange: Dispatch<SetStateAction<InteractionDraft | null>>;
  onSave: () => void;
  isSaving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  opportunityCompanyName?: string;
};

export function InteractionSummaryRefactored({
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
}: InteractionSummaryRefactoredProps) {
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

  const personRecords = personNames.map((name) =>
    (contacts as Person[]).find((c) => c.name === name),
  );

  return (
    <div className="space-y-4">
      {/* Compact Summary */}
      <InteractionSummaryCompact
        interaction={interaction}
        statusBadge={headerBadge}
        onEdit={onToggleEditing}
        onDelete={() => {
          if (window.confirm("Delete this interaction?")) {
            onDelete();
          }
        }}
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
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save changes
            </LoadingButton>
            <button
              onClick={onCancelEditing}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors"
            >
              Cancel
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
        />
        <AttachedEmailsCard
          interactionId={interaction.id}
          opportunityId={interaction.jobOpportunityId}
          onEmailsAttached={onToggleEditing}
        />
      </div>

      {/* Gmail Email States */}
      <GmailEmailStatesSection opportunityId={interaction.jobOpportunityId} />

      {/* Quick Info */}
      <QuickInfoCard interaction={interaction} />

      {/* Notes */}
      <NotesCard notes={interaction.notes ?? null} />

      {/* Outcome */}
      {!isEditing && interaction.outcome && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Outcome</h3>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{interaction.outcome}</p>
        </div>
      )}

      {/* Follow-up */}
      {!isEditing && interaction.followUp && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Follow-up</h3>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{interaction.followUp}</p>
        </div>
      )}
    </div>
  );
}
