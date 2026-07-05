import type { GmailEmailExtractionAnalysis, GmailInteractionDraft, GmailSearchCandidate, GmailStructuredEmail, Interaction } from "../../lib/types";

export type TrackedGmailEmail = {
  id: string;
  subject: string;
  date: string;
};

export type GmailMessageStates = {
  removedEmails: TrackedGmailEmail[];
  pickedEmails: TrackedGmailEmail[];
  ignoredEmails: TrackedGmailEmail[];
};

export type InteractionDiffField =
  | "date"
  | "type"
  | "stage"
  | "status"
  | "personName"
  | "personRole"
  | "agenda"
  | "meetingLink"
  | "notes"
  | "outcome"
  | "followUp";

export const interactionFieldLabels = {
  date: "Date",
  type: "Type",
  stage: "Stage",
  status: "Status",
  personName: "Person name",
  personRole: "Person role",
  agenda: "Agenda",
  meetingLink: "Meeting link",
  notes: "Notes",
  outcome: "Outcome",
  followUp: "Follow-up"
} satisfies Record<InteractionDiffField, string>;

export const interactionDiffFields = Object.keys(interactionFieldLabels) as InteractionDiffField[];

export function normalizeComparableValue(field: InteractionDiffField, value: string | null | undefined) {
  if (field === "date") {
    const timestamp = value ? new Date(value).getTime() : Number.NaN;
    return Number.isNaN(timestamp) ? "" : String(timestamp);
  }

  return (value ?? "").trim();
}

export function getChangedInteractionFields(existingInteraction: Interaction | null | undefined, draft: GmailInteractionDraft | null) {
  if (!existingInteraction || !draft) {
    return new Set<InteractionDiffField>();
  }

  return new Set(
    interactionDiffFields.filter(
      (field) =>
        normalizeComparableValue(field, existingInteraction[field]) !==
        normalizeComparableValue(field, draft[field])
    )
  );
}

export function addPickedEmail(current: GmailMessageStates | undefined, email: TrackedGmailEmail): GmailMessageStates {
  return {
    removedEmails: current?.removedEmails ?? [],
    pickedEmails: [
      email,
      ...(current?.pickedEmails.filter((pickedEmail) => pickedEmail.id !== email.id) ?? [])
    ],
    ignoredEmails: current?.ignoredEmails ?? []
  };
}

export function toDatetimeLocalValue(value: string) {
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

export function toDateValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
}

export function toTimeValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${hours}:${minutes}`;
}

export type {
  GmailEmailExtractionAnalysis,
  GmailInteractionDraft,
  GmailSearchCandidate,
  GmailStructuredEmail,
  Interaction
} from "../../lib/types";
