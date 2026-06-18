import type { ReactNode } from "react";
import type { GmailEmailExtractionAnalysis, GmailInteractionDraft, GmailStructuredEmail, Interaction } from "../../lib/types";
import { interactionStatusOptions, interactionTypeOptions } from "../../lib/enum-labels";
import { Badge } from "../badge";
import { LoadingButton } from "@interviews-tracker/design-system";
import { toDatetimeLocalValue, toDateValue, toTimeValue, type InteractionDiffField } from "./gmail-interaction-panel-helpers";

type GmailReviewPanelProps = {
  draft: GmailInteractionDraft;
  selectedEmail: GmailStructuredEmail;
  analysis: GmailEmailExtractionAnalysis | null;
  attachTargetInteraction: Interaction | null;
  attachTargetId: string;
  isAttachMode: boolean;
  hasParsedInteractionChanges: boolean;
  changedInteractionFields: Set<InteractionDiffField>;
  changedFieldLabels: string[];
  saveMessage: string | null;
  saveError: string | null;
  saveInteractionPending: boolean;
  isAttaching: boolean;
  opportunityInteractions: Interaction[];
  onSelectAnotherEmail: () => void;
  onSaveInteraction: () => void;
  onAttachToExistingInteraction: () => void;
  onAttachTargetIdChange: (value: string) => void;
  onDraftChange: (next: GmailInteractionDraft) => void;
};

export function GmailReviewPanel({
  draft,
  selectedEmail,
  analysis,
  attachTargetInteraction,
  attachTargetId,
  isAttachMode,
  hasParsedInteractionChanges,
  changedInteractionFields,
  changedFieldLabels,
  saveMessage,
  saveError,
  saveInteractionPending,
  isAttaching,
  opportunityInteractions,
  onSelectAnotherEmail,
  onSaveInteraction,
  onAttachToExistingInteraction,
  onAttachTargetIdChange,
  onDraftChange
}: GmailReviewPanelProps) {
  return (
    <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review interaction</p>
          <h4 className="font-title-md text-title-md font-bold">{selectedEmail.subject}</h4>
          <p className="mt-1 text-body-md text-on-surface-variant">{selectedEmail.fromRaw}</p>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            {analysis?.dateSource === "calendar" ? "Date source: calendar invite" : analysis?.dateSource === "text" ? "Date source: email text" : "Date source: email header"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LoadingButton className="btn btn-secondary" disabled={saveInteractionPending} icon="close" onClick={onSelectAnotherEmail}>
            Select another email
          </LoadingButton>
          {!isAttachMode ? (
            <LoadingButton className="btn btn-primary" loading={saveInteractionPending} loadingLabel="Saving..." icon="save" onClick={onSaveInteraction}>
              Save interaction
            </LoadingButton>
          ) : (
            <LoadingButton
              className="btn btn-primary"
              loading={isAttaching}
              loadingLabel={hasParsedInteractionChanges ? "Accepting..." : "Attaching..."}
              icon="link"
              disabled={!draft || !selectedEmail || !attachTargetId}
              onClick={onAttachToExistingInteraction}
            >
              {hasParsedInteractionChanges ? "Accept changes" : "Attach email"}
            </LoadingButton>
          )}
        </div>
      </div>

      {saveMessage ? <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">{saveMessage}</p> : null}
      {saveError ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p> : null}

      {attachTargetInteraction ? (
        <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">Parsed changes</p>
            {hasParsedInteractionChanges ? (
              <Badge value="Changed" tone="warning">
                {changedInteractionFields.size} changed
              </Badge>
            ) : (
              <Badge value="No changes" tone="green">
                No field changes
              </Badge>
            )}
          </div>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {hasParsedInteractionChanges
              ? "The parsed email has different details from the selected interaction. Review the changed badges below, then accept changes to update the interaction."
              : "The parsed email matches the selected interaction details. Attaching will only link the source email."}
          </p>
          {hasParsedInteractionChanges ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {changedFieldLabels.map((label) => (
                <Badge key={label} value={label} tone="warning">
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {!isAttachMode ? (
        <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Attach to existing</p>
              <p className="mt-1 text-body-md text-on-surface-variant">Update an existing interaction with this email instead of creating a new one.</p>
            </div>
            <LoadingButton
              className="btn btn-secondary"
              loading={isAttaching}
              loadingLabel={hasParsedInteractionChanges ? "Accepting..." : "Attaching..."}
              icon="link"
              disabled={!draft || !selectedEmail || !attachTargetId || saveInteractionPending}
              onClick={onAttachToExistingInteraction}
            >
              {hasParsedInteractionChanges ? "Accept changes" : "Attach email"}
            </LoadingButton>
          </div>
          {opportunityInteractions.length ? (
            <label className="mt-4 block space-y-1">
              <span className="label">Existing interaction</span>
              <select className="input" value={attachTargetId} onChange={(event) => onAttachTargetIdChange(event.target.value)}>
                {opportunityInteractions.map((interaction) => (
                  <option key={interaction.id} value={interaction.id}>
                    {new Date(interaction.date).toLocaleString()} · {interaction.type}
                    {interaction.personName ? ` · ${interaction.personName}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-4 text-body-md text-on-surface-variant">No existing interactions yet.</p>
          )}
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4 text-body-md text-on-surface-variant">
        <p><span className="font-semibold text-on-background">Source email:</span> {selectedEmail.subject}</p>
        <p className="mt-1"><span className="font-semibold text-on-background">From:</span> {selectedEmail.fromRaw}</p>
        <p className="mt-1"><span className="font-semibold text-on-background">Message date:</span> {new Date(selectedEmail.internalDate).toLocaleString()}</p>
        {selectedEmail.calendar?.start ? <p className="mt-1"><span className="font-semibold text-on-background">Calendar start:</span> {new Date(selectedEmail.calendar.start).toLocaleString()}</p> : null}
        {selectedEmail.calendar?.end ? <p className="mt-1"><span className="font-semibold text-on-background">Calendar end:</span> {new Date(selectedEmail.calendar.end).toLocaleString()}</p> : null}
        {selectedEmail.calendar?.location ? <p className="mt-1"><span className="font-semibold text-on-background">Location:</span> {selectedEmail.calendar.location}</p> : null}
        {draft.meetingLink ? (
          <p className="mt-1">
            <span className="font-semibold text-on-background">Meeting link:</span>{" "}
            <a className="text-primary hover:underline" href={draft.meetingLink} rel="noreferrer noopener" target="_blank">
              {draft.meetingLink}
            </a>
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        <Field label="Date" changed={changedInteractionFields.has("date")}>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="date"
              aria-label="Date"
              value={toDateValue(draft.date)}
              onChange={(event) => {
                if (!event.target.value) return;
                const startDate = new Date(draft.date);
                const [year, month, day] = event.target.value.split('-').map(Number);
                startDate.setFullYear(year, month - 1, day);

                const updates: Partial<typeof draft> = { date: startDate.toISOString() };

                // Update endDate to same day if it exists
                if (draft.endDate) {
                  const endDate = new Date(draft.endDate);
                  endDate.setFullYear(year, month - 1, day);
                  updates.endDate = endDate.toISOString();
                }

                onDraftChange({ ...draft, ...updates });
              }}
            />
            <input
              className="input w-24"
              type="time"
              aria-label="Start time"
              value={toTimeValue(draft.date)}
              onChange={(event) => {
                if (!event.target.value) return;
                const date = new Date(draft.date);
                const [hours, minutes] = event.target.value.split(':').map(Number);
                date.setHours(hours, minutes);
                onDraftChange({ ...draft, date: date.toISOString() });
              }}
            />
            <span className="text-body-md text-on-surface-variant">-</span>
            <input
              className="input w-24"
              type="time"
              aria-label="End time"
              value={draft.endDate ? toTimeValue(draft.endDate) : ""}
              onChange={(event) => {
                if (!event.target.value) {
                  onDraftChange({ ...draft, endDate: null });
                  return;
                }

                const date = new Date(draft.date);
                const [hours, minutes] = event.target.value.split(':').map(Number);
                date.setHours(hours, minutes);
                onDraftChange({ ...draft, endDate: date.toISOString() });
              }}
            />
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Field label="Type" changed={changedInteractionFields.has("type")}>
          <select className="input" value={draft.type} onChange={(event) => onDraftChange({ ...draft, type: event.target.value as GmailInteractionDraft["type"] })}>
            {interactionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage" changed={changedInteractionFields.has("stage")}>
          <input className="input" value={draft.stage ?? ""} onChange={(event) => onDraftChange({ ...draft, stage: event.target.value || null })} />
        </Field>
        <Field label="Status" changed={changedInteractionFields.has("status")}>
          <select className="input" value={draft.status} onChange={(event) => onDraftChange({ ...draft, status: event.target.value as GmailInteractionDraft["status"] })}>
            {interactionStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Person name" changed={changedInteractionFields.has("personName")}>
          <input className="input" value={draft.personName ?? ""} onChange={(event) => onDraftChange({ ...draft, personName: event.target.value || null })} />
        </Field>
        <Field label="Person role" changed={changedInteractionFields.has("personRole")}>
          <input className="input" value={draft.personRole ?? ""} onChange={(event) => onDraftChange({ ...draft, personRole: event.target.value || null })} />
        </Field>
        <Field label="Agenda" changed={changedInteractionFields.has("agenda")}>
          <textarea className="input min-h-24" value={draft.agenda ?? ""} onChange={(event) => onDraftChange({ ...draft, agenda: event.target.value || null })} />
        </Field>
        <Field label="Meeting link" changed={changedInteractionFields.has("meetingLink")}>
          <input className="input" type="url" placeholder="https://meet.google.com/..." value={draft.meetingLink ?? ""} onChange={(event) => onDraftChange({ ...draft, meetingLink: event.target.value || null })} />
        </Field>
        <Field label="Notes" changed={changedInteractionFields.has("notes")}>
          <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => onDraftChange({ ...draft, notes: event.target.value || null })} />
        </Field>
        <Field label="Outcome" changed={changedInteractionFields.has("outcome")}>
          <textarea className="input min-h-24" value={draft.outcome ?? ""} onChange={(event) => onDraftChange({ ...draft, outcome: event.target.value || null })} />
        </Field>
        <Field label="Follow-up" changed={changedInteractionFields.has("followUp")}>
          <textarea className="input min-h-24" value={draft.followUp ?? ""} onChange={(event) => onDraftChange({ ...draft, followUp: event.target.value || null })} />
        </Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  changed = false,
  children
}: {
  label: string;
  changed?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="label">{label}</span>
        {changed ? (
          <Badge value="Changed" tone="warning">
            Changed
          </Badge>
        ) : null}
      </span>
      {children}
    </label>
  );
}
