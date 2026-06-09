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

function interactionContextText(interaction: Pick<Interaction, "type" | "outcome" | "followUp"> & { stage?: string | null }) {
  return [interaction.type, interaction.stage, interaction.outcome, interaction.followUp].filter(Boolean).join(" ").toLowerCase();
}

function isTerminalInteraction(interaction: Pick<Interaction, "type" | "status" | "outcome" | "followUp">) {
  const normalizedType = normalizeInteractionType(interaction.type);
  if (normalizedType === "Rejection" || normalizedType === "Offer") {
    return true;
  }

  if (interaction.status === "REJECTED") {
    return true;
  }

  const text = interactionContextText(interaction);
  return hasAny(text, [
    /reject/,
    /declin/,
    /not.*moving forward/,
    /moving on/,
    /not a fit/,
    /no longer/,
    /withdrawn?/,
    /not relevant/,
    /לא מתקדמים/,
    /דחייה/,
    /נדחה/,
    /offer/,
    /הצעה/
  ]);
}

function hasLaterTerminalInteraction(
  interaction: Pick<Interaction, "id" | "date" | "type" | "status" | "outcome" | "followUp">,
  interactions: readonly Pick<Interaction, "id" | "date" | "type" | "status" | "outcome" | "followUp">[]
) {
  const orderedInteractions = [...interactions].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });

  const currentIndex = orderedInteractions.findIndex((item) => item.id === interaction.id);
  if (currentIndex === -1) {
    return false;
  }

  return orderedInteractions.slice(currentIndex + 1).some((item) => isTerminalInteraction(item));
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

export function promoteOverdueInteractionsForRead<T extends Pick<Interaction, "id" | "date" | "type" | "status" | "stage" | "outcome" | "followUp">>(interactions: readonly T[], now = new Date()) {
  const orderedInteractions = [...interactions].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });

  return orderedInteractions.map((interaction) => {
    if (hasLaterTerminalInteraction(interaction, orderedInteractions)) {
      return interaction;
    }

    return promoteOverdueInteractionStatusForRead(interaction, now);
  });
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

export function getInteractionTimelineBadgeMeta(
  interaction: Pick<Interaction, "id" | "date" | "status" | "type" | "stage" | "outcome" | "followUp">,
  interactions: readonly Pick<Interaction, "id" | "date" | "status" | "type" | "stage" | "outcome" | "followUp">[],
) {
  const normalizedType = normalizeInteractionType(interaction.type);

  if (normalizedType === "Rejection" || normalizedType === "Offer") {
    return null;
  }

  if (hasLaterTerminalInteraction(interaction, interactions)) {
    return null;
  }

  const promoted = promoteOverdueInteractionStatusForRead(interaction);
  return getInteractionBadgeMeta(promoted);
}
