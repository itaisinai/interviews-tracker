import { prisma } from "../lib/prisma.js";
import type { InteractionStatus } from "@interviews-tracker/core";

const overdueInteractionTypes = [
  "Interview",
  "Phone Interview",
  "Phone Call",
  "Technical Interview",
  "HR Screen",
  "Recruiter Screen",
  "Onsite"
] as const;

type OverdueInteractionCandidate = {
  jobOpportunityId: string;
};

type InteractionStatusLike = {
  jobOpportunityId?: string;
  date: string | Date;
  type: string;
  status: InteractionStatus;
  stage?: string | null;
  outcome?: string | null;
  followUp?: string | null;
};

function normalizeDateValue(value: string | Date) {
  return new Date(value).getTime();
}

function interactionContextText(interaction: Pick<InteractionStatusLike, "type" | "stage" | "outcome" | "followUp">) {
  return [interaction.type, interaction.stage, interaction.outcome, interaction.followUp].filter(Boolean).join(" ").toLowerCase();
}

function isTerminalInteraction(interaction: Pick<InteractionStatusLike, "type" | "status" | "stage" | "outcome" | "followUp">) {
  if (interaction.type === "Rejection" || interaction.type === "Offer") {
    return true;
  }

  if (interaction.status === "REJECTED") {
    return true;
  }

  const text = interactionContextText(interaction);
  return /reject|declin|not.*moving forward|moving on|not a fit|no longer|withdrawn?|not relevant|offer|הצעה|דחייה|נדחה|לא מתקדמים/.test(text);
}

 function hasLaterTerminalInteraction<T extends InteractionStatusLike & { id: string }>(interaction: T, interactions: readonly T[]) {
  const ordered = [...interactions].sort((left, right) => {
    const leftTime = normalizeDateValue(left.date);
    const rightTime = normalizeDateValue(right.date);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });

  const currentIndex = ordered.findIndex((item) => item.id === interaction.id);
  if (currentIndex === -1) {
    return false;
  }

  return ordered.slice(currentIndex + 1).some((item) => isTerminalInteraction(item));
}

export function promoteOverdueInteractionStatusForRead<T extends InteractionStatusLike>(interaction: T, now = new Date()) {
  if (
    interaction.status !== "SCHEDULED" ||
    !overdueInteractionTypes.includes(interaction.type as (typeof overdueInteractionTypes)[number]) ||
    new Date(interaction.date).getTime() >= now.getTime()
  ) {
    return interaction;
  }

  return {
    ...interaction,
    status: "NEEDS_FOLLOW_UP" as const
  };
}

export function promoteOverdueInteractionsForRead<T extends InteractionStatusLike & { id: string }>(interactions: readonly T[], now = new Date()) {
  const ordered = [...interactions].sort((left, right) => {
    const leftTime = normalizeDateValue(left.date);
    const rightTime = normalizeDateValue(right.date);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });

  return ordered.map((interaction) => {
    if (hasLaterTerminalInteraction(interaction, ordered)) {
      return interaction;
    }

    return promoteOverdueInteractionStatusForRead(interaction, now);
  });
}

export function promoteOpportunityInteractionsForRead<T extends { interactions: readonly (InteractionStatusLike & { id: string })[] }>(opportunity: T, now = new Date()) {
  return {
    ...opportunity,
    interactions: promoteOverdueInteractionsForRead(opportunity.interactions, now)
  };
}

export async function normalizeOverdueScheduledInteractionsForRead(now = new Date()) {
  const candidates = await prisma.interaction.findMany({
    where: {
      status: "SCHEDULED",
      date: { lt: now },
      type: { in: [...overdueInteractionTypes] }
    },
    select: {
      id: true,
      jobOpportunityId: true,
      date: true,
      type: true,
      status: true,
      stage: true,
      outcome: true,
      followUp: true
    }
  });

  const opportunityIds = [...new Set(candidates.map((item: OverdueInteractionCandidate) => item.jobOpportunityId))];

  if (opportunityIds.length === 0) {
    return [];
  }

  const interactionsByOpportunity = new Map<string, typeof candidates>();

  for (const candidate of candidates) {
    const list = interactionsByOpportunity.get(candidate.jobOpportunityId) ?? [];
    list.push(candidate);
    interactionsByOpportunity.set(candidate.jobOpportunityId, list);
  }

  const interactionIdsToPromote = new Set<string>();

  for (const interactionList of interactionsByOpportunity.values()) {
    const ordered = [...interactionList].sort((left, right) => normalizeDateValue(left.date) - normalizeDateValue(right.date) || left.id.localeCompare(right.id));
    ordered.forEach((interaction, index) => {
      const laterTerminalExists = ordered.slice(index + 1).some((item) => isTerminalInteraction(item));
      if (!laterTerminalExists) {
        interactionIdsToPromote.add(interaction.id);
      }
    });
  }

  await prisma.interaction.updateMany({
    where: {
      id: { in: [...interactionIdsToPromote] }
    },
    data: { status: "NEEDS_FOLLOW_UP" }
  });

  return opportunityIds;
}
