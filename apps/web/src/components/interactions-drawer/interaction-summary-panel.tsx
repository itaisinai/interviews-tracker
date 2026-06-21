import { type Dispatch, type SetStateAction } from "react";
import type { Interaction, InteractionDraft, Person } from "../../lib/types";
import { Pencil, Save, Trash2 } from "lucide-react";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { displayLabelForEnumValue, normalizeInteractionType } from "../../lib/enum-labels";
import { InteractionDraftFields } from "./interaction-draft-fields";
import { LoadingButton } from "@interviews-tracker/design-system";
import { formatDurationBetween } from "../../lib/format";
import { InteractionHeader } from "./interaction-header";
import { InteractionParticipants } from "./interaction-participants";
import { AttachedEmailsSection } from "./attached-emails-section";
import { GmailEmailStatesSection } from "./gmail-email-states-section";

type InteractionSummaryPanelProps = {
  interaction: Interaction;
  headerBadge: {
    label: string;
    tone: "blue" | "green" | "red" | "muted" | "warning";
  } | null;
  referenceDate?: Date;
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

export function InteractionSummaryPanel({
  interaction,
  headerBadge,
  referenceDate = new Date(),
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
  const typeLabel =
    displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ??
    interaction.type;
  const durationLabel = formatDurationBetween(
    interaction.date,
    interaction.endDate,
  );

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
    <section className="relative">
      {/* Header */}
      <InteractionHeader
        stage={interaction.stage ?? null}
        typeLabel={typeLabel}
        date={interaction.date}
        endDate={interaction.endDate ?? null}
        durationLabel={durationLabel}
        type={interaction.type}
        statusBadge={headerBadge}
      />

      {/* Actions */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={onToggleEditing}
          disabled={isEditing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <LoadingButton
          loading={isDeleting}
          loadingLabel="Deleting..."
          onClick={onDelete}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 font-medium text-sm hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </LoadingButton>
      </div>

      {/* Participants */}
      <InteractionParticipants
        personNames={personNames}
        personRecords={personRecords}
        opportunityId={interaction.jobOpportunityId}
        opportunityCompanyName={opportunityCompanyName}
      />

      {/* Attached Emails */}
      <AttachedEmailsSection
        interactionId={interaction.id}
        opportunityId={interaction.jobOpportunityId}
        onEmailsAttached={onToggleEditing}
      />

      {/* Gmail Email States (Picked/Hidden) */}
      <GmailEmailStatesSection opportunityId={interaction.jobOpportunityId} />

      {/* Meeting Link */}
      {interaction.meetingLink && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Meeting</h3>
          <a
            href={interaction.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
          >
            <MaterialIcon
              name="link"
              className="text-[16px] text-neutral-400 group-hover:text-emerald-600"
            />
            <span className="text-sm text-neutral-700 group-hover:text-emerald-600">
              Meeting link
            </span>
            <MaterialIcon
              name="open_in_new"
              className="text-[14px] text-neutral-400 group-hover:text-emerald-600 ml-auto"
            />
          </a>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && draft ? (
        <div className="p-6 rounded-xl border border-neutral-200 bg-neutral-50/50 mb-8">
          <InteractionDraftFields draft={draft} setDraft={onDraftChange} />
          <div className="mt-6 flex gap-3">
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

      {/* Quick Info Section */}
      {!isEditing && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Quick info</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-500">Type</span>
              <span className="text-sm text-neutral-900">{typeLabel}</span>
            </div>
            {interaction.stage && (
              <div className="flex items-center justify-between py-2 border-t border-neutral-100">
                <span className="text-xs text-neutral-500">Stage</span>
                <span className="text-sm text-neutral-900">{interaction.stage}</span>
              </div>
            )}
            {interaction.personRole && (
              <div className="flex items-center justify-between py-2 border-t border-neutral-100">
                <span className="text-xs text-neutral-500">Person role</span>
                <span className="text-sm text-neutral-900">{interaction.personRole}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes & Details */}
      {!isEditing && (interaction.notes || interaction.outcome || interaction.followUp) && (
        <div className="space-y-6">
          {interaction.notes && (
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Notes</h3>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{interaction.notes}</p>
            </div>
          )}
          {interaction.outcome && (
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Outcome</h3>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{interaction.outcome}</p>
            </div>
          )}
          {interaction.followUp && (
            <div>
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Follow-up</h3>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{interaction.followUp}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
