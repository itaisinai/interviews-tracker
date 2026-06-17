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
  endDate?: string | Date | null;
  type: string;
  status: InteractionStatus;
  stage?: string | null;
  outcome?: string | null;
  followUp?: string | null;
};

function normalizeDateValue(value: string | Date) {
  return new Date(value).getTime();
}

function hasLaterInteraction<T extends InteractionStatusLike & { id: string }>(interaction: T, interactions: readonly T[]) {
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

  return ordered.slice(currentIndex + 1).length > 0;
}

export function promoteOverdueInteractionStatusForRead<T extends InteractionStatusLike>(interaction: T, now = new Date()) {
  if (
    interaction.status !== "SCHEDULED" ||
    !overdueInteractionTypes.includes(interaction.type as (typeof overdueInteractionTypes)[number])
  ) {
    return interaction;
  }

  // Use endDate if present, otherwise use date
  const effectiveEndTime = interaction.endDate ? new Date(interaction.endDate).getTime() : new Date(interaction.date).getTime();

  if (effectiveEndTime >= now.getTime()) {
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
    if (hasLaterInteraction(interaction, ordered)) {
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

export async function normalizeOverdueScheduledInteractionsForRead(ownerEmail: string, now = new Date()) {
  const candidates = await prisma.interaction.findMany({
    where: {
      ownerEmail,
      status: "SCHEDULED",
      type: { in: [...overdueInteractionTypes] },
      OR: [
        { endDate: null, date: { lt: now } },
        { endDate: { not: null, lt: now } }
      ]
    },
    select: {
      id: true,
      jobOpportunityId: true,
      date: true,
      endDate: true,
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

  const opportunityInteractions = await prisma.interaction.findMany({
    where: {
      ownerEmail,
      jobOpportunityId: { in: opportunityIds }
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

  const interactionsByOpportunity = new Map<string, typeof opportunityInteractions>();

  for (const interaction of opportunityInteractions) {
    const list = interactionsByOpportunity.get(interaction.jobOpportunityId) ?? [];
    list.push(interaction);
    interactionsByOpportunity.set(interaction.jobOpportunityId, list);
  }

  const interactionIdsToPromote = new Set<string>();
  const candidateIds = new Set(candidates.map((item) => item.id));

  for (const interactionList of interactionsByOpportunity.values()) {
    const ordered = [...interactionList].sort((left, right) => normalizeDateValue(left.date) - normalizeDateValue(right.date) || left.id.localeCompare(right.id));
    ordered.forEach((interaction, index) => {
      const isCandidate = candidateIds.has(interaction.id);
      const laterInteractionExists = ordered.slice(index + 1).length > 0;
      if (isCandidate && !laterInteractionExists) {
        interactionIdsToPromote.add(interaction.id);
      }
    });
  }

  if (interactionIdsToPromote.size > 0) {
    await prisma.interaction.updateMany({
      where: {
        ownerEmail,
        id: { in: [...interactionIdsToPromote] }
      },
      data: { status: "NEEDS_FOLLOW_UP" }
    });
  }

  return opportunityIds;
}
