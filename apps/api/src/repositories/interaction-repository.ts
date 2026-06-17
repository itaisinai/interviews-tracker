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

export async function listInteractionRecords(ownerEmail: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));

  const interactions = await prisma.interaction.findMany({
    where: { ownerEmail },
    include: { jobOpportunity: true },
    orderBy: { date: "asc" }
  });

  return promoteOverdueInteractionsForRead(interactions);
}

export async function createInteractionRecord(input: InteractionInput & { jobOpportunityId: string }, ownerEmail: string) {
  const { jobOpportunityId, ...rest } = input;
  const interaction = await prisma.interaction.create({
    data: {
      ...rest,
      ownerEmail,
      date: new Date(rest.date),
      endDate: rest.endDate ? new Date(rest.endDate) : null,
      jobOpportunityId
    },
    include: { jobOpportunity: true }
  });

  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function updateInteractionRecord(id: string, input: InteractionInput, ownerEmail: string) {
  const interaction = await prisma.interaction.update({ where: { id }, data: { ...input, date: new Date(input.date), endDate: input.endDate ? new Date(input.endDate) : null }, include: { jobOpportunity: true } });
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function deleteInteractionRecord(id: string, ownerEmail: string) {
  return prisma.interaction.delete({
    where: { id },
    include: { jobOpportunity: true }
  });
}

export async function listOpportunityInteractionRecords(opportunityId: string, ownerEmail: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  if (opportunityIds.includes(opportunityId)) {
    await syncOpportunityStatusRecord(opportunityId, ownerEmail);
  }

  const interactions = await prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId, ownerEmail },
    orderBy: { date: "asc" }
  });

  return promoteOverdueInteractionsForRead(interactions);
}

export async function createOpportunityInteractionRecord(opportunityId: string, input: InteractionInput, ownerEmail: string) {
  return prisma.interaction.create({
    data: { ...input, ownerEmail, date: new Date(input.date), endDate: input.endDate ? new Date(input.endDate) : null, jobOpportunityId: opportunityId }
  });
}

export async function findUpcomingInteractionRecords(ownerEmail: string, limit = 8) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const interactions = await prisma.interaction.findMany({
    where: { ownerEmail, date: { gte: today } },
    include: { jobOpportunity: true },
    orderBy: { date: "asc" },
    take: limit
  });

  return promoteOverdueInteractionsForRead(interactions);
}
