import { normalizeInteractionType } from "./enum-labels";
import type { Interaction } from "./types";

export type InteractionBadgeTone = "blue" | "green" | "red" | "muted" | "warning";
export type OpportunityProcessBadgeTone = InteractionBadgeTone | "violet";

const overdueInteractionTypes = [
  "Interview",
  "Phone Interview",
  "Phone Call",
  "Technical Interview",
  "HR Screen",
  "Recruiter Screen",
  "Onsite",
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
  /לא מתקדמים/,
];

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function interactionContextText(
  interaction: Pick<Interaction, "type" | "outcome" | "followUp"> & { stage?: string | null }
) {
  return [interaction.type, interaction.stage, interaction.outcome, interaction.followUp]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
    /הצעה/,
  ]);
}

function hasLaterInteraction(
  interaction: Pick<Interaction, "slug" | "date" | "type" | "status" | "outcome" | "followUp">,
  interactions: readonly Pick<Interaction, "slug" | "date" | "type" | "status" | "outcome" | "followUp">[]
) {
  const orderedInteractions = [...interactions].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.slug.localeCompare(right.slug);
  });

  const currentIndex = orderedInteractions.findIndex((item) => item.slug === interaction.slug);
  if (currentIndex === -1) {
    return false;
  }

  return orderedInteractions.slice(currentIndex + 1).length > 0;
}

export function promoteOverdueInteractionStatusForRead<
  T extends Pick<Interaction, "date" | "type" | "status" | "endDate">,
>(interaction: T, now = new Date()) {
  const normalizedType = normalizeInteractionType(interaction.type);
  if (
    interaction.status !== "SCHEDULED" ||
    !overdueInteractionTypes.includes(normalizedType as (typeof overdueInteractionTypes)[number])
  ) {
    return interaction;
  }

  // Use endDate if present, otherwise use date
  const effectiveEndTime = interaction.endDate
    ? new Date(interaction.endDate).getTime()
    : new Date(interaction.date).getTime();

  if (effectiveEndTime >= now.getTime()) {
    return interaction;
  }

  return {
    ...interaction,
    status: "NEEDS_FOLLOW_UP" as const,
  };
}

export function promoteOverdueInteractionsForRead<
  T extends Pick<Interaction, "slug" | "date" | "endDate" | "type" | "status" | "stage" | "outcome" | "followUp">,
>(interactions: readonly T[], now = new Date()) {
  const orderedInteractions = [...interactions].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.slug.localeCompare(right.slug);
  });

  return orderedInteractions.map((interaction) => {
    if (hasLaterInteraction(interaction, orderedInteractions)) {
      return interaction;
    }

    return promoteOverdueInteractionStatusForRead(interaction, now);
  });
}

export function getInteractionBadgeMeta(
  interaction: Pick<Interaction, "date" | "endDate" | "status" | "type" | "stage" | "outcome" | "followUp">
) {
  const promoted = promoteOverdueInteractionStatusForRead(interaction);

  if (promoted.status === "SCHEDULED") {
    return { label: "scheduled", tone: "blue" as const };
  }

  if (promoted.status === "REJECTED") {
    return { label: "rejected", tone: "red" as const };
  }

  if (promoted.status === "DONE") {
    const text = interactionContextText(promoted);
    if (hasAny(text, rejectionPatterns)) {
      return { label: "rejected", tone: "red" as const };
    }

    return { label: "passed", tone: "green" as const };
  }

  if (promoted.status === "CANCELLED") {
    return { label: "cancelled", tone: "muted" as const };
  }

  return { label: "waiting for response", tone: "warning" as const };
}

export function getInteractionTimelineBadgeMeta(
  interaction: Pick<Interaction, "slug" | "date" | "status" | "type" | "stage" | "outcome" | "followUp">,
  interactions: readonly Pick<Interaction, "slug" | "date" | "status" | "type" | "stage" | "outcome" | "followUp">[]
) {
  const normalizedType = normalizeInteractionType(interaction.type);

  if (normalizedType === "Rejection" || normalizedType === "Offer") {
    return null;
  }

  if (hasLaterInteraction(interaction, interactions)) {
    return null;
  }

  const promoted = promoteOverdueInteractionStatusForRead(interaction);
  return getInteractionBadgeMeta(promoted);
}

type OpportunityProcessSource = Pick<NonNullable<Interaction["jobOpportunity"]>, "status" | "pipelineType">;

export function getOpportunityProcessBadgeMeta(
  opportunity: OpportunityProcessSource | null | undefined,
  interactions: readonly Pick<Interaction, "type" | "status" | "outcome" | "followUp">[]
) {
  const interactionText = interactions
    .flatMap((interaction) => [interaction.type, interaction.outcome, interaction.followUp])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasRejectedInteraction =
    opportunity?.status === "REJECTED" ||
    interactions.some(
      (interaction) => interaction.status === "REJECTED" || normalizeInteractionType(interaction.type) === "Rejection"
    );

  if (
    hasRejectedInteraction ||
    /reject|declin|not.*moving forward|moving on|not a fit|no longer|withdrawn?|לא מתקדמים|דחייה|נדחה/.test(
      interactionText
    )
  ) {
    return { label: "rejected", tone: "red" as const };
  }

  const hasOfferSignal =
    opportunity?.status === "OFFER" ||
    interactions.some(
      (interaction) =>
        normalizeInteractionType(interaction.type) === "Offer" ||
        /offer|contract|agreement|חתימה|הצעה/.test(
          `${interaction.type} ${interaction.outcome ?? ""} ${interaction.followUp ?? ""}`.toLowerCase()
        )
    );

  if (hasOfferSignal) {
    return { label: "contract", tone: "violet" as const };
  }

  if (opportunity?.pipelineType === "ACTIVE_PROCESS" || interactions.length > 0) {
    return { label: "in process", tone: "green" as const };
  }

  if (opportunity?.pipelineType === "POTENTIAL") {
    return { label: "potential", tone: "blue" as const };
  }

  if (opportunity?.pipelineType === "ARCHIVED") {
    return { label: "archived", tone: "muted" as const };
  }

  return null;
}
