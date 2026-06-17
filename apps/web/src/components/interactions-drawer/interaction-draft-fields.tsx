import type { Dispatch, ReactNode, SetStateAction } from "react";
import { interactionStatusOptions, interactionTypeOptions } from "../../lib/enum-labels";
import type { InteractionDraft } from "../../lib/types";

type InteractionDraftFieldsProps = {
  draft: InteractionDraft;
  setDraft: Dispatch<SetStateAction<InteractionDraft | null>>;
};

export function InteractionDraftFields({ draft, setDraft }: InteractionDraftFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Field label="Date" help="When this interaction starts and ends.">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <input
            className="input min-w-0"
            type="datetime-local"
            aria-label="Start date and time"
            value={toDatetimeLocalValue(draft.date)}
            onChange={(event) => setDraft({ ...draft, date: event.target.value ? new Date(event.target.value).toISOString() : draft.date })}
          />
          <span className="text-body-md text-on-surface-variant">-</span>
          <input
            className="input min-w-0"
            type="datetime-local"
            aria-label="End date and time"
            value={toDatetimeLocalValue(draft.endDate ?? "")}
            min={toDatetimeLocalValue(draft.date)}
            onChange={(event) => setDraft({ ...draft, endDate: event.target.value ? new Date(event.target.value).toISOString() : null })}
          />
        </div>
      </Field>
      <Field label="Type" help="What happened?">
        <select className="input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as InteractionDraft["type"] })}>
          {interactionTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stage" help="Hiring stage, if relevant.">
        <input className="input" value={draft.stage ?? ""} onChange={(event) => setDraft({ ...draft, stage: event.target.value || null })} />
      </Field>
      <Field label="Status" help="Scheduling or state of this interaction.">
        <select className="input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as InteractionDraft["status"] })}>
          {interactionStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Person name" help="Who this interaction is with.">
        <input className="input" value={draft.personName ?? ""} onChange={(event) => setDraft({ ...draft, personName: event.target.value || null })} />
      </Field>
      <Field label="Person role" help="Their role or title, if known.">
        <input className="input" value={draft.personRole ?? ""} onChange={(event) => setDraft({ ...draft, personRole: event.target.value || null })} />
      </Field>
      <Field label="Agenda" help="What was discussed or planned.">
        <textarea className="input min-h-24" value={draft.agenda ?? ""} onChange={(event) => setDraft({ ...draft, agenda: event.target.value || null })} />
      </Field>
      <Field label="Meeting link" help="Google Meet or Zoom link, if available.">
        <input
          className="input"
          type="url"
          placeholder="https://meet.google.com/..."
          value={draft.meetingLink ?? ""}
          onChange={(event) => setDraft({ ...draft, meetingLink: event.target.value || null })}
        />
      </Field>
      <Field label="Notes" help="Extra context or raw details worth keeping.">
        <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} />
      </Field>
      <Field label="Outcome" help="What came out of this interaction.">
        <textarea className="input min-h-24" value={draft.outcome ?? ""} onChange={(event) => setDraft({ ...draft, outcome: event.target.value || null })} />
      </Field>
      <Field label="Follow-up" help="What should happen next.">
        <textarea className="input min-h-24" value={draft.followUp ?? ""} onChange={(event) => setDraft({ ...draft, followUp: event.target.value || null })} />
      </Field>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="label">{label}</span>
      {help ? <span className="block text-xs text-on-surface-variant">{help}</span> : null}
      {children}
    </label>
  );
}

function toDatetimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
