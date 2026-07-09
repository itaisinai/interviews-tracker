import { Calendar, CheckCircle2, Clock, MapPin, MessageSquare, Sparkles, User, Video } from "lucide-react";

import { LoadingButton } from "@interviews-tracker/design-system";

import { formatDateTimeRange } from "../../lib/format";
import type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
  GmailStructuredEmail,
  Interaction,
} from "../../lib/types";

import { ChangeRow } from "./gmail-change-row";
import type { InteractionDiffField } from "./gmail-interaction-panel-helpers";
import { GmailReviewSidebar } from "./gmail-review-sidebar";

type GmailChangesReviewProps = {
  draft: GmailInteractionDraft;
  selectedEmail: GmailStructuredEmail;
  analysis: GmailEmailExtractionAnalysis | null;
  attachTargetInteraction: Interaction | null;
  changedInteractionFields: Set<InteractionDiffField>;
  isAttachMode: boolean;
  hasParsedInteractionChanges: boolean;
  isAttaching: boolean;
  saveInteractionPending: boolean;
  onAcceptChanges: () => void;
  onEditManually: () => void;
  onCancel: () => void;
};

export function GmailChangesReview({
  draft,
  selectedEmail,
  analysis,
  attachTargetInteraction,
  changedInteractionFields,
  isAttachMode,
  hasParsedInteractionChanges,
  isAttaching,
  saveInteractionPending,
  onAcceptChanges,
  onEditManually,
  onCancel,
}: GmailChangesReviewProps) {
  const current = attachTargetInteraction;
  const changesCount = changedInteractionFields.size;
  const confidencePercent = analysis ? (analysis.hasCalendar ? 95 : analysis.dateSource === "text" ? 85 : 75) : 95;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Main Content - Changes Diff */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-neutral-900">
              {isAttachMode ? "Review Changes" : "Review Interaction"}
            </h2>
            {changesCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                {changesCount} {changesCount === 1 ? "change" : "changes"}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-600">
            {isAttachMode
              ? hasParsedInteractionChanges
                ? "We detected changes from the email. Review and accept to update the interaction."
                : "The email matches the existing interaction. Accept to attach the email reference."
              : "Review the extracted details and accept to create the interaction."}
          </p>
        </div>

        {/* Changes Grid */}
        <div className="space-y-2">
          <ChangeRow
            icon={<Calendar className="w-4 h-4" />}
            label="Date"
            before={current?.date}
            after={draft.date}
            changed={changedInteractionFields.has("date")}
            formatValue={(val) => {
              const date = new Date(val);
              return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
            }}
          />

          <ChangeRow
            icon={<Clock className="w-4 h-4" />}
            label="Time"
            before={current?.date}
            after={draft.date}
            beforeEnd={current?.endDate}
            afterEnd={draft.endDate}
            changed={changedInteractionFields.has("date")}
            formatValue={(start, end) => {
              const startDate = new Date(start);
              const startTime = startDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              if (!end) return startTime;

              const endDate = new Date(end);
              const endTime = endDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;

              let duration = "";
              if (totalMinutes < 60) {
                duration = `${totalMinutes}m`;
              } else if (minutes === 0) {
                duration = `${hours}h`;
              } else {
                duration = `${hours}h ${minutes}m`;
              }

              return `${startTime} - ${endTime} (${duration})`;
            }}
          />

          <ChangeRow
            icon={<Sparkles className="w-4 h-4" />}
            label="Stage"
            before={current?.stage}
            after={draft.stage}
            changed={changedInteractionFields.has("stage")}
          />

          <ChangeRow
            icon={<User className="w-4 h-4" />}
            label="Person"
            before={current?.personName}
            after={draft.personName}
            changed={changedInteractionFields.has("personName")}
          />

          <ChangeRow
            icon={<User className="w-4 h-4" />}
            label="Role"
            before={current?.personRole}
            after={draft.personRole}
            changed={changedInteractionFields.has("personRole")}
          />

          <ChangeRow
            icon={<Video className="w-4 h-4" />}
            label="Meeting Link"
            before={current?.meetingLink}
            after={draft.meetingLink}
            changed={changedInteractionFields.has("meetingLink")}
            formatValue={(val) => (val ? "Available" : "—")}
          />

          {selectedEmail.calendar?.location && (
            <ChangeRow
              icon={<MapPin className="w-4 h-4" />}
              label="Location"
              before={null}
              after={selectedEmail.calendar.location}
              changed={true}
            />
          )}

          <ChangeRow
            icon={<MessageSquare className="w-4 h-4" />}
            label="Notes"
            before={current?.notes}
            after={draft.notes}
            changed={changedInteractionFields.has("notes")}
            formatValue={(val) => (val ? `${val.slice(0, 50)}${val.length > 50 ? "..." : ""}` : "—")}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
          <LoadingButton
            onClick={onAcceptChanges}
            loading={isAttaching || saveInteractionPending}
            loadingLabel="Saving..."
            className="flex-1 lg:flex-none px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Accept {isAttachMode && hasParsedInteractionChanges ? "changes" : "all"}
          </LoadingButton>

          <button
            onClick={onEditManually}
            disabled={isAttaching || saveInteractionPending}
            className="px-6 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Edit manually
          </button>

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
