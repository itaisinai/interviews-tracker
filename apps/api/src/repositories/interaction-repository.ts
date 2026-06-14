import { prisma } from "../lib/prisma.js";
import { interactionInputSchema } from "../lib/schemas.js";
import type { z } from "zod";
import {
  normalizeOverdueScheduledInteractionsForRead,
  promoteOverdueInteractionStatusForRead,
  promoteOverdueInteractionsForRead
} from "./interaction-read-normalizer.js";
import { syncOpportunityStatusRecord } from "./opportunity-repository.js";

export type InteractionInput = z.infer<typeof interactionInputSchema>;

export async function listInteractionRecords() {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead();
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id)));

  const interactions = await prisma.interaction.findMany({
    include: { jobOpportunity: true },
    orderBy: { date: "asc" }
  });

  return promoteOverdueInteractionsForRead(interactions);
}

export async function createInteractionRecord(input: InteractionInput & { jobOpportunityId: string }) {
  const { jobOpportunityId, ...rest } = input;
  const interaction = await prisma.interaction.create({
    data: {
      ...rest,
      date: new Date(rest.date),
      jobOpportunityId
    },
    include: { jobOpportunity: true }
  });

  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function updateInteractionRecord(id: string, input: InteractionInput) {
  const interaction = await prisma.interaction.update({ where: { id }, data: { ...input, date: new Date(input.date) }, include: { jobOpportunity: true } });
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function deleteInteractionRecord(id: string) {
  return prisma.interaction.delete({
    where: { id },
    include: { jobOpportunity: true }
  });
}

export async function listOpportunityInteractionRecords(opportunityId: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead();
  if (opportunityIds.includes(opportunityId)) {
    await syncOpportunityStatusRecord(opportunityId);
  }

  const interactions = await prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId },
    orderBy: { date: "asc" }
  });

  return promoteOverdueInteractionsForRead(interactions);
}

export async function createOpportunityInteractionRecord(opportunityId: string, input: InteractionInput) {
  return prisma.interaction.create({
    data: { ...input, date: new Date(input.date), jobOpportunityId: opportunityId }
  });
}

export async function findUpcomingInteractionRecords(limit = 8) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead();
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id)));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const interactions = await prisma.interaction.findMany({
    where: { date: { gte: today } },
    include: { jobOpportunity: true },
    orderBy: { date: "asc" },
    take: limit
  });

  return promoteOverdueInteractionsForRead(interactions);
}
