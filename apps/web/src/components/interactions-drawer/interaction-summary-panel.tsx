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
import {
  formatDateTime,
  formatDurationBetween,
  formatDateTimeRange,
} from "../../lib/format";

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
  opportunityCompanyName?: string; // For person research validation
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
  opportunityCompanyName,
}: InteractionSummaryPanelProps) {
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [personDetailModalOpen, setPersonDetailModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const typeLabel =
    displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ??
    interaction.type;
  const durationLabel = formatDurationBetween(
    interaction.date,
    interaction.endDate,
  );

  // Split multiple names (e.g., "John Doe and Jane Smith" or "John Doe, Jane Smith")
  const personNames = interaction.personName
    ? interaction.personName
        .split(/\s+and\s+|,\s*/)
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  // Fetch contacts for this opportunity to find the person
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
      {/* Header with Primary Action */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1 min-w-0">
          {/* Title with Icon */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
              <MaterialIcon name="calendar_month" className="text-[20px]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {interaction.stage || typeLabel}
            </h1>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-base text-neutral-700 mb-3 ml-[52px]">
            <span className="font-medium">
              {new Date(interaction.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-neutral-400">·</span>
            <span>
              {new Date(interaction.date).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
              {interaction.endDate && (
                <>
                  {" – "}
                  {new Date(interaction.endDate).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </>
              )}
            </span>
            {durationLabel && (
              <>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-600">{durationLabel}</span>
              </>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 ml-[52px] flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">
              {typeLabel}
            </span>
            {headerBadge && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                {headerBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Primary and Secondary Actions */}
        <div className="flex items-start gap-2">
          {interaction.meetingLink && (
            <a
              href={interaction.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <MaterialIcon name="videocam" className="text-[16px]" />
              Join meeting
            </a>
          )}

          {/* Secondary Actions */}
          <div className="flex items-center gap-1">
            {interaction.gmailMessageId && (
              <button
                onClick={onAttachEmail}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
                title="Re-parse email"
              >
                <MaterialIcon name="refresh" className="text-[16px]" />
              </button>
            )}
            <button
              onClick={onToggleEditing}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
              title="Edit"
            >
              {isEditing ? (
                <LucidePencilOff className="w-4 h-4" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
            </button>
            <LoadingButton
              className="p-2 rounded-lg hover:bg-red-50 text-neutral-600 hover:text-red-600 transition-colors border-0 bg-transparent shadow-none"
              loading={isDeleting}
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Participants - Compact */}
      {personNames.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">
            Participants
          </h3>
          <div className="space-y-2">
            {personNames.map((name, index) => {
              const personRecord = personRecords[index];

              // Find current title at this company from LinkedIn work history
              const currentTitle = (personRecord?.research as any)?.workHistory?.find(
                (work: any) =>
                  work.company === interaction.jobOpportunity?.companyName &&
                  work.isCurrent,
              )?.title;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const personToShow: Person = personRecord || {
                      id: "",
                      name: name,
                      email: null,
                      linkedinUrl: null,
                      title: interaction.personRole || null,
                      company: interaction.jobOpportunity?.companyName || null,
                      avatarUrl: null,
                      research: null,
                    };
                    setSelectedPerson(personToShow);
                    setPersonDetailModalOpen(true);
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left group"
                >
                  <UserRound className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 group-hover:text-emerald-600">
                      {name}
                    </div>
                    {currentTitle && (
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {currentTitle} @{" "}
                        {interaction.jobOpportunity?.companyName}
                      </div>
                    )}
                  </div>
                  {!personRecord && (
                    <button
                      type="button"
                      className="ml-auto p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-emerald-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        const personToShow: Person = {
                          id: "",
                          name: name,
                          email: null,
                          linkedinUrl: null,
                          title: interaction.personRole || null,
                          company:
                            interaction.jobOpportunity?.companyName || null,
                          avatarUrl: null,
                          research: null,
                        };
                        setSelectedPerson(personToShow);
                        setResearchModalOpen(true);
                      }}
                      aria-label={`Research ${name}`}
                      title={`Research ${name}`}
                    >
                      <MaterialIcon
                        name="travel_explore"
                        className="text-[14px]"
                      />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedPerson && (
        <>
          <PersonResearchFlow
            person={{
              name: selectedPerson.name,
              title: selectedPerson.title || interaction.personRole,
              company: opportunityCompanyName || interaction.jobOpportunity?.companyName,
            }}
            isOpen={researchModalOpen}
            onClose={() => {
              setResearchModalOpen(false);
              setSelectedPerson(null);
            }}
            opportunityId={interaction.jobOpportunityId}
            opportunityCompanyName={opportunityCompanyName || interaction.jobOpportunity?.companyName}
          />
          <PersonDetailModal
            person={selectedPerson}
            isOpen={personDetailModalOpen}
            onClose={() => {
              setPersonDetailModalOpen(false);
              setSelectedPerson(null);
            }}
            onResearch={(name, title) => {
              setPersonDetailModalOpen(false);
              // Don't clear selectedPerson here - keep it for research modal
              setResearchModalOpen(true);
            }}
          />
        </>
      )}

      {/* Related - Compact Links */}
      {(interaction.meetingLink ||
        interaction.gmailMessageId ||
        interaction.agenda) && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-900 mb-3">Related</h3>
          <div className="space-y-1">
            {interaction.gmailMessageId && (
              <button
                onClick={onAttachEmail}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors text-left group"
              >
                <MaterialIcon
                  name="mail"
                  className="text-[16px] text-neutral-400 group-hover:text-blue-600"
                />
                <span className="text-sm text-neutral-700 group-hover:text-blue-600">
                  Updated invitation
                </span>
                <MaterialIcon
                  name="arrow_forward"
                  className="text-[14px] text-neutral-400 group-hover:text-blue-600 ml-auto"
                />
              </button>
            )}
            {interaction.meetingLink && (
              <a
                href={interaction.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
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
            )}
            {interaction.agenda && (
              <div className="flex items-center gap-3 p-3">
                <MaterialIcon
                  name="description"
                  className="text-[16px] text-neutral-400"
                />
                <span className="text-sm text-neutral-700">
                  Calendar invite
                </span>
              </div>
            )}
          </div>
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

      {/* Interview Preparation Section */}
      {!isEditing && (
        <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">Interview Preparation <span className="ml-2 align-middle text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Beta</span></h3>
          <p className="text-sm text-neutral-600 mb-4">
            AI-powered preparation based on this opportunity and participants.
          </p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <MiniPrepCard icon="business" title="Company context" />
            <MiniPrepCard icon="work" title="Role details" />
            <MiniPrepCard icon="groups" title="Interviewers" />
            <MiniPrepCard icon="stars" title="Talking points" />
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            onClick={() => {
              // Scroll to preparation section on opportunity page
              document.getElementById('interview-preparation-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <MaterialIcon name="stars" className="text-[16px]" />
            Open preparation
          </button>
        </div>
      )}

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
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-neutral-500">Stage</span>
                <span className="text-sm text-neutral-900">{interaction.stage}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-neutral-500">Status</span>
              <span className="text-sm text-neutral-900">{headerBadge?.label || interaction.status}</span>
            </div>
            {durationLabel && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-neutral-500">Duration</span>
                <span className="text-sm text-neutral-900">{durationLabel}</span>
              </div>
            )}
            {interaction.personName && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-neutral-500">Organizer</span>
                <span className="text-sm text-neutral-900">{interaction.personName.split(/\s+and\s+|,\s*/)[0]}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      {!isEditing && (
        <div className="mt-8 pt-6 border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={onToggleEditing}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Edit interaction
          </button>
          <LoadingButton
            loading={isDeleting}
            loadingLabel="Deleting..."
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 transition-colors bg-transparent border-0 shadow-none"
          >
            <Trash2 className="w-4 h-4 mr-1 inline" />
            Delete
          </LoadingButton>
        </div>
      )}
    </section>
  );
}

function MiniPrepCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
        <MaterialIcon name={icon} className="text-[15px]" />
      </span>
      <span className="truncate text-xs font-medium text-neutral-800">{title}</span>
    </div>
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
