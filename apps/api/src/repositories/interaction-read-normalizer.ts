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
  date: string | Date;
  type: string;
  status: InteractionStatus;
};

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

export function promoteOverdueInteractionsForRead<T extends InteractionStatusLike>(interactions: readonly T[], now = new Date()) {
  return interactions.map((interaction) => promoteOverdueInteractionStatusForRead(interaction, now));
}

export function promoteOpportunityInteractionsForRead<T extends { interactions: readonly InteractionStatusLike[] }>(opportunity: T, now = new Date()) {
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
    select: { jobOpportunityId: true }
  });

  const opportunityIds = [...new Set(candidates.map((item: OverdueInteractionCandidate) => item.jobOpportunityId))];

  if (opportunityIds.length === 0) {
    return [];
  }

  await prisma.interaction.updateMany({
    where: {
      status: "SCHEDULED",
      date: { lt: now },
      type: { in: [...overdueInteractionTypes] }
    },
    data: { status: "NEEDS_FOLLOW_UP" }
  });

  return opportunityIds;
}
