import { useState, type Dispatch, type SetStateAction } from "react";
import type { Interaction, InteractionDraft } from "../../lib/types";
import {
  Link2,
  LucidePencilOff,
  Pencil,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { PersonResearchFlow } from "../person-research/person-research-flow";
import {
  displayLabelForEnumValue,
  normalizeInteractionType,
} from "../../lib/enum-labels";

import { Badge } from "../badge";
import { InteractionDraftFields } from "./interaction-draft-fields";
import { LoadingButton } from "@interviews-tracker/design-system";
import type { ReactNode } from "react";
import { formatDateTime } from "../../lib/format";

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
  onAttachEmail: () => void;
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
  onAttachEmail,
}: InteractionSummaryPanelProps) {
  const [researchModalOpen, setResearchModalOpen] = useState(false);

  const typeLabel =
    displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ??
    interaction.type;

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={typeLabel} />
            {headerBadge ? (
              <Badge value={interaction.status} tone={headerBadge.tone}>
                {headerBadge.label}
              </Badge>
            ) : null}
            {interaction.stage ? (
              <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">
                {interaction.stage}
              </span>
            ) : null}
          </div>
          <p className="mt-3 font-headline-md text-headline-md font-bold">
            {formatDateTime(interaction.date, referenceDate)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-body-md text-on-surface-variant">
            <UserRound className="h-4 w-4" />
            <span>
              {interaction.personName ?? "No person"}
              {interaction.personRole ? ` · ${interaction.personRole}` : ""}
            </span>
            {interaction.personName ? (
              <button
                type="button"
                className="ml-1 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
                onClick={() => setResearchModalOpen(true)}
                aria-label="Research this person"
                title="Research this person"
              >
                <MaterialIcon name="travel_explore" className="text-[18px]" />
              </button>
            ) : null}
          </div>

          {interaction.personName ? (
            <PersonResearchFlow
              person={{
                name: interaction.personName,
                title: interaction.personRole,
                company: interaction.jobOpportunity?.companyName
              }}
              isOpen={researchModalOpen}
              onClose={() => setResearchModalOpen(false)}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-secondary" onClick={onToggleEditing}>
            {isEditing ? (
              <LucidePencilOff className="h-4 w-4" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </button>
          <LoadingButton
            className="btn btn-secondary text-error hover:bg-error-container"
            loading={isDeleting}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </LoadingButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {interaction.outcome ? (
          <DetailRow
            label="Outcome"
            value={
              <span className="text-body-md text-on-background">
                {interaction.outcome}
              </span>
            }
          />
        ) : null}
        {interaction.meetingLink ? (
          <DetailRow
            label="Meeting link"
            value={
              <a
                className="break-all text-body-md text-primary hover:underline"
                href={interaction.meetingLink}
                rel="noreferrer noopener"
                target="_blank"
              >
                {interaction.meetingLink}
              </a>
            }
          />
        ) : null}
        <DetailRow
          label="Attached email"
          value={
            interaction.gmailMessageId ? (
              <span className="text-body-md text-on-background">Attached</span>
            ) : (
              <button className="btn btn-secondary" onClick={onAttachEmail}>
                <Link2 className="h-4 w-4" />
                Attach email
              </button>
            )
          }
        />
      </div>

      {isEditing && draft ? (
        <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
          <InteractionDraftFields draft={draft} setDraft={onDraftChange} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LoadingButton
              className="btn btn-primary"
              loading={isSaving}
              loadingLabel="Saving..."
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
              Save interaction
            </LoadingButton>
            <button className="btn btn-secondary" onClick={onCancelEditing}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low/40 px-4 py-3">
      <p className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">{value}</div>
    </div>
  );
}
