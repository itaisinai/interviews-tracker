import type { Interaction } from "./types";
import { normalizeInteractionType } from "./enum-labels";

export type InteractionBadgeTone = "blue" | "green" | "red" | "muted" | "warning";

const overdueInteractionTypes = [
  "Interview",
  "Phone Interview",
  "Phone Call",
  "Technical Interview",
  "HR Screen",
  "Recruiter Screen",
  "Onsite"
] as const;

const rejectionPatterns = [
  /reject/,
  /declin/,
  /not.*moving forward/,
  /moving on/,
  /not a fit/,
  /no longer/,
  /דחייה/,
  /נדחה/,
  /לא מתקדמים/
];

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function interactionContextText(interaction: Pick<Interaction, "type" | "stage" | "outcome" | "followUp">) {
  return [interaction.type, interaction.stage, interaction.outcome, interaction.followUp].filter(Boolean).join(" ").toLowerCase();
}

export function promoteOverdueInteractionStatusForRead<T extends Pick<Interaction, "date" | "type" | "status">>(interaction: T, now = new Date()) {
  const normalizedType = normalizeInteractionType(interaction.type);
  if (
    interaction.status !== "SCHEDULED" ||
    !overdueInteractionTypes.includes(normalizedType as (typeof overdueInteractionTypes)[number]) ||
    new Date(interaction.date).getTime() >= now.getTime()
  ) {
    return interaction;
  }

  return {
    ...interaction,
    status: "NEEDS_FOLLOW_UP" as const
  };
}

export function promoteOverdueInteractionsForRead<T extends Pick<Interaction, "date" | "type" | "status">>(interactions: readonly T[], now = new Date()) {
  return interactions.map((interaction) => promoteOverdueInteractionStatusForRead(interaction, now));
}

export function getInteractionBadgeMeta(interaction: Pick<Interaction, "date" | "status" | "type" | "stage" | "outcome" | "followUp">) {
  const promoted = promoteOverdueInteractionStatusForRead(interaction);

  if (promoted.status === "SCHEDULED") {
    return { label: "Scheduled", tone: "blue" as const };
  }

  if (promoted.status === "REJECTED") {
    return { label: "Rejected", tone: "red" as const };
  }

  if (promoted.status === "DONE") {
    const text = interactionContextText(promoted);
    if (hasAny(text, rejectionPatterns)) {
      return { label: "Rejected", tone: "red" as const };
    }

    return { label: "Passed", tone: "green" as const };
  }

  if (promoted.status === "CANCELLED") {
    return { label: "Cancelled", tone: "muted" as const };
  }

  return { label: "Waiting for response", tone: "warning" as const };
}
