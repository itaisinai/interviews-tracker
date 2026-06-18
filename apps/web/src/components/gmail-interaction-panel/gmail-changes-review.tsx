import { Calendar, CheckCircle2, Clock, ExternalLink, Mail, MapPin, MessageSquare, Sparkles, User, Video } from "lucide-react";
import type { GmailEmailExtractionAnalysis, GmailInteractionDraft, GmailStructuredEmail, Interaction } from "../../lib/types";
import { LoadingButton } from "@interviews-tracker/design-system";
import type { InteractionDiffField } from "./gmail-interaction-panel-helpers";
import { formatDateTimeRange } from "../../lib/format";

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
  onCancel
}: GmailChangesReviewProps) {
  const current = attachTargetInteraction;
  const changesCount = changedInteractionFields.size;
  const confidencePercent = Math.round((analysis?.confidence ?? 0.95) * 100);

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
              : "Review the extracted details and accept to create the interaction."
            }
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
                year: "numeric"
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
                hour12: false
              });

              if (!end) return startTime;

              const endDate = new Date(end);
              const endTime = endDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
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
            formatValue={(val) => val ? "Available" : "—"}
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
            formatValue={(val) => val ? `${val.slice(0, 50)}${val.length > 50 ? "..." : ""}` : "—"}
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

      {/* Sidebar - Email Context */}
      <div className="lg:w-80 space-y-4">
        {/* Email Preview Card */}
        <div className="p-4 rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                Source Email
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug">
                {selectedEmail.subject}
              </h3>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-neutral-500">From:</span>
              <p className="text-neutral-900 font-medium mt-0.5">{selectedEmail.fromRaw}</p>
            </div>
            <div>
              <span className="text-neutral-500">Received:</span>
              <p className="text-neutral-900 font-medium mt-0.5">
                {new Date(selectedEmail.internalDate).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Confidence:</span>
              <p className="text-neutral-900 font-medium mt-0.5">
                <span className={`inline-flex items-center gap-1 ${
                  confidencePercent >= 90 ? "text-emerald-600" :
                  confidencePercent >= 70 ? "text-yellow-600" : "text-neutral-600"
                }`}>
                  {confidencePercent}%
                </span>
              </p>
            </div>
          </div>

          {selectedEmail.snippet && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-600 line-clamp-3">
                {selectedEmail.snippet}
              </p>
            </div>
          )}
        </div>

        {/* Data Source Info */}
        <div className="p-3 rounded-lg bg-neutral-50 text-xs text-neutral-600">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-neutral-900 mb-1">AI Extraction</p>
              <p>
                {analysis?.dateSource === "calendar"
                  ? "Details extracted from calendar invite"
                  : analysis?.dateSource === "text"
                  ? "Details extracted from email text"
                  : "Details extracted from email metadata"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChangeRowProps = {
  icon: React.ReactNode;
  label: string;
  before?: string | null;
  after?: string | null;
  beforeEnd?: string | null;
  afterEnd?: string | null;
  changed: boolean;
  formatValue?: (value: string, endValue?: string | null) => string;
};

function ChangeRow({ icon, label, before, after, beforeEnd, afterEnd, changed, formatValue }: ChangeRowProps) {
  const isNew = !before && after;
  const isUnchanged = !changed && !isNew;

  const displayBefore = before ? (formatValue ? formatValue(before, beforeEnd || null) : before) : "—";
  const displayAfter = after ? (formatValue ? formatValue(after, afterEnd || null) : after) : "—";

  return (
    <div className={`flex items-start gap-4 px-4 py-3 rounded-lg border transition-colors ${
      isNew ? "border-emerald-200 bg-emerald-50/50" :
      changed ? "border-blue-200 bg-blue-50/50" :
      "border-neutral-100 bg-neutral-50/30"
    }`}>
      <div className={`mt-0.5 ${
        isNew ? "text-emerald-600" :
        changed ? "text-blue-600" :
        "text-neutral-400"
      }`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {label}
          </span>
          {isNew && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium uppercase tracking-wide">
              New
            </span>
          )}
          {changed && !isNew && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium uppercase tracking-wide">
              Changed
            </span>
          )}
        </div>

        {isUnchanged || isNew ? (
          <p className="text-sm text-neutral-900 font-medium break-words">{displayAfter}</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 line-through break-words">{displayBefore}</p>
            <p className="text-sm text-neutral-900 font-medium break-words">{displayAfter}</p>
          </div>
        )}
      </div>
    </div>
  );
}
