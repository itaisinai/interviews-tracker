import { useState, type Dispatch, type SetStateAction } from "react";
import type { Interaction, InteractionDraft, Person } from "../../lib/types";
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
import { PersonDetailModal } from "../contacts/person-detail-modal";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  displayLabelForEnumValue,
  normalizeInteractionType,
} from "../../lib/enum-labels";

import { Badge } from "../badge";
import { InteractionDraftFields } from "./interaction-draft-fields";
import { LoadingButton } from "@interviews-tracker/design-system";
import type { ReactNode } from "react";
import { formatDateTime, formatDurationBetween, formatDateTimeRange } from "../../lib/format";

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
  const [personDetailModalOpen, setPersonDetailModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const typeLabel =
    displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ??
    interaction.type;
  const durationLabel = formatDurationBetween(interaction.date, interaction.endDate);

  // Fetch contacts for this opportunity to find the person
  const { data: contacts = [] } = useQuery({
    queryKey: ["opportunity-contacts", interaction.jobOpportunityId],
    queryFn: () => api.getOpportunityContacts(interaction.jobOpportunityId),
    enabled: !!interaction.jobOpportunityId && !!interaction.personName
  });

  const personRecord = (contacts as Person[]).find(
    (c) => c.name === interaction.personName
  );

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">
            {interaction.stage || typeLabel}
            {durationLabel ? ` (${durationLabel})` : ""}
          </h1>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 text-sm text-neutral-600 flex-wrap">
            <span className="font-medium">
              {interaction.endDate
                ? formatDateTimeRange(interaction.date, interaction.endDate, referenceDate)
                : formatDateTime(interaction.date, referenceDate)
              }
            </span>
            <span className="text-neutral-400">·</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-medium">
              {typeLabel}
            </span>
            {headerBadge ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                {headerBadge.label}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions - Icon-only ghost buttons */}
        <div className="flex items-center gap-1">
          {interaction.gmailMessageId && (
            <button
              onClick={onAttachEmail}
              className="group p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Re-parse email"
            >
              <MaterialIcon name="refresh" className="text-[16px]" />
            </button>
          )}
          <button
            onClick={onToggleEditing}
            className="group p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
            title="Edit"
          >
            {isEditing ? (
              <LucidePencilOff className="w-4 h-4" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
          </button>
          <LoadingButton
            className="group p-2 rounded-lg hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors border-0 bg-transparent shadow-none"
            loading={isDeleting}
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </LoadingButton>
        </div>
      </div>

      {/* Organizer - Compact Profile */}
      {interaction.personName ? (
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer"
            onClick={() => {
              const personToShow: Person = personRecord || {
                id: '',
                name: interaction.personName!,
                email: null,
                linkedinUrl: null,
                title: interaction.personRole || null,
                company: interaction.jobOpportunity?.companyName || null,
                avatarUrl: null,
                research: null
              };
              setSelectedPerson(personToShow);
              setPersonDetailModalOpen(true);
            }}
          >
            {interaction.personName.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                const personToShow: Person = personRecord || {
                  id: '',
                  name: interaction.personName!,
                  email: null,
                  linkedinUrl: null,
                  title: interaction.personRole || null,
                  company: interaction.jobOpportunity?.companyName || null,
                  avatarUrl: null,
                  research: null
                };
                setSelectedPerson(personToShow);
                setPersonDetailModalOpen(true);
              }}
              className="font-medium text-neutral-900 hover:text-emerald-600 transition-colors"
            >
              {interaction.personName}
            </button>
            {interaction.personRole && (
              <>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-600">{interaction.personRole}</span>
              </>
            )}
            {!personRecord && (
              <button
                type="button"
                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-emerald-600 transition-colors"
                onClick={() => setResearchModalOpen(true)}
                aria-label="Research this person"
                title="Research this person"
              >
                <MaterialIcon name="travel_explore" className="text-[14px]" />
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {interaction.personName && (
        <>
          <PersonResearchFlow
            person={{
              name: interaction.personName,
              title: interaction.personRole,
              company: interaction.jobOpportunity?.companyName
            }}
            isOpen={researchModalOpen}
            onClose={() => setResearchModalOpen(false)}
            opportunityId={interaction.jobOpportunityId}
          />
          {selectedPerson && (
            <PersonDetailModal
              person={selectedPerson}
              isOpen={personDetailModalOpen}
              onClose={() => {
                setPersonDetailModalOpen(false);
                setSelectedPerson(null);
              }}
              onResearch={(name, title) => {
                setPersonDetailModalOpen(false);
                setSelectedPerson(null);
                setResearchModalOpen(true);
              }}
            />
          )}
        </>
      )}

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Meeting Link Card */}
        {interaction.meetingLink && (
          <a
            href={interaction.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <MaterialIcon name="videocam" className="text-[16px]" />
              </div>
              <MaterialIcon name="open_in_new" className="text-[14px] text-neutral-400 group-hover:text-neutral-600 transition-colors" />
            </div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Meeting Link
            </div>
            <div className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              Join meeting
              <span className="text-neutral-400 group-hover:text-emerald-600">→</span>
            </div>
          </a>
        )}

        {/* Attached Email Card */}
        <button
          onClick={onAttachEmail}
          className="group relative p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200 text-left"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MaterialIcon name="mail" className="text-[16px]" />
            </div>
          </div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
            Attached Email
          </div>
          <div className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
            {interaction.gmailMessageId ? "View email" : "Attach email"}
            <span className="text-neutral-400 group-hover:text-blue-600">→</span>
          </div>
        </button>
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
