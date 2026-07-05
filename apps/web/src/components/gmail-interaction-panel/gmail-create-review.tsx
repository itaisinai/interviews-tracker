import { CheckCircle2 } from "lucide-react";
import type { GmailEmailExtractionAnalysis, GmailInteractionDraft, GmailStructuredEmail } from "../../lib/types";
import { GmailReviewSidebar } from "./gmail-review-sidebar";
import { LoadingButton } from "@interviews-tracker/design-system";
import { useState } from "react";
import { toDateValue, toTimeValue } from "./gmail-interaction-panel-helpers";
import { interactionStatusOptions, interactionTypeOptions } from "../../lib/enum-labels";

type GmailCreateReviewProps = {
  draft: GmailInteractionDraft;
  selectedEmail: GmailStructuredEmail;
  analysis: GmailEmailExtractionAnalysis | null;
  isAttaching: boolean;
  saveInteractionPending: boolean;
  onAcceptChanges: (updatedDraft: GmailInteractionDraft) => void;
  onEditManually: () => void;
  onCancel: () => void;
};

export function GmailCreateReview({
  draft,
  selectedEmail,
  analysis,
  isAttaching,
  saveInteractionPending,
  onAcceptChanges,
  onEditManually,
  onCancel
}: GmailCreateReviewProps) {
  const [localDraft, setLocalDraft] = useState<GmailInteractionDraft>(draft);

  const confidencePercent = analysis
    ? analysis.hasCalendar
      ? 95
      : analysis.dateSource === "text"
        ? 85
        : 75
    : 95;

  const handleAccept = () => {
    onAcceptChanges(localDraft);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Main Content - Editable Fields */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-neutral-900">Review Interaction</h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
              From Gmail
            </span>
          </div>
          <p className="text-sm text-neutral-600">
            Review and edit the extracted details, then accept to create the interaction.
          </p>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4 bg-white rounded-lg border border-neutral-200 p-6">
          {/* Date & Time */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Date & Time</label>
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                type="date"
                value={toDateValue(localDraft.date)}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const startDate = new Date(localDraft.date);
                  const [year, month, day] = event.target.value.split('-').map(Number);
                  startDate.setFullYear(year, month - 1, day);

                  const updates: Partial<typeof localDraft> = { date: startDate.toISOString() };

                  if (localDraft.endDate) {
                    const endDate = new Date(localDraft.endDate);
                    endDate.setFullYear(year, month - 1, day);
                    updates.endDate = endDate.toISOString();
                  }

                  setLocalDraft({ ...localDraft, ...updates });
                }}
              />
              <input
                className="input w-24"
                type="time"
                value={toTimeValue(localDraft.date)}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const date = new Date(localDraft.date);
                  const [hours, minutes] = event.target.value.split(':').map(Number);
                  date.setHours(hours, minutes);
                  setLocalDraft({ ...localDraft, date: date.toISOString() });
                }}
              />
              <span className="text-sm text-neutral-600">-</span>
              <input
                className="input w-24"
                type="time"
                value={localDraft.endDate ? toTimeValue(localDraft.endDate) : ""}
                placeholder="End time"
                onChange={(event) => {
                  if (!event.target.value) {
                    setLocalDraft({ ...localDraft, endDate: null });
                    return;
                  }

                  const date = new Date(localDraft.date);
                  const [hours, minutes] = event.target.value.split(':').map(Number);
                  date.setHours(hours, minutes);
                  setLocalDraft({ ...localDraft, endDate: date.toISOString() });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Type</label>
              <select
                className="input"
                value={localDraft.type}
                onChange={(event) =>
                  setLocalDraft({ ...localDraft, type: event.target.value as GmailInteractionDraft["type"] })
                }
              >
                {interactionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Status</label>
              <select
                className="input"
                value={localDraft.status}
                onChange={(event) =>
                  setLocalDraft({ ...localDraft, status: event.target.value as GmailInteractionDraft["status"] })
                }
              >
                {interactionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Stage</label>
              <input
                className="input"
                value={localDraft.stage ?? ""}
                placeholder="e.g., Technical Round"
                onChange={(event) => setLocalDraft({ ...localDraft, stage: event.target.value || null })}
              />
            </div>

            {/* Person Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Person Name</label>
              <input
                className="input"
                value={localDraft.personName ?? ""}
                placeholder="Interviewer name"
                onChange={(event) => setLocalDraft({ ...localDraft, personName: event.target.value || null })}
              />
            </div>

            {/* Person Role */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Person Role</label>
              <input
                className="input"
                value={localDraft.personRole ?? ""}
                placeholder="e.g., Engineering Manager"
                onChange={(event) => setLocalDraft({ ...localDraft, personRole: event.target.value || null })}
              />
            </div>

            {/* Meeting Link */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">Meeting Link</label>
              <input
                className="input"
                type="url"
                value={localDraft.meetingLink ?? ""}
                placeholder="https://meet.google.com/..."
                onChange={(event) => setLocalDraft({ ...localDraft, meetingLink: event.target.value || null })}
              />
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Agenda</label>
            <textarea
              className="input min-h-20"
              value={localDraft.agenda ?? ""}
              placeholder="What will be discussed..."
              onChange={(event) => setLocalDraft({ ...localDraft, agenda: event.target.value || null })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Notes</label>
            <textarea
              className="input min-h-20"
              value={localDraft.notes ?? ""}
              placeholder="Additional notes..."
              onChange={(event) => setLocalDraft({ ...localDraft, notes: event.target.value || null })}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Outcome</label>
            <textarea
              className="input min-h-20"
              value={localDraft.outcome ?? ""}
              placeholder="What was the result..."
              onChange={(event) => setLocalDraft({ ...localDraft, outcome: event.target.value || null })}
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">Follow-up</label>
            <textarea
              className="input min-h-20"
              value={localDraft.followUp ?? ""}
              placeholder="Next steps..."
              onChange={(event) => setLocalDraft({ ...localDraft, followUp: event.target.value || null })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
          <LoadingButton
            onClick={handleAccept}
            loading={isAttaching || saveInteractionPending}
            loadingLabel="Saving..."
            className="flex-1 lg:flex-none px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Create Interaction
          </LoadingButton>

          <button
            onClick={onCancel}
            disabled={isAttaching || saveInteractionPending}
            className="px-4 py-2.5 text-neutral-600 font-medium text-sm hover:text-neutral-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <GmailReviewSidebar selectedEmail={selectedEmail} analysis={analysis} confidencePercent={confidencePercent} />
    </div>
  );
}
