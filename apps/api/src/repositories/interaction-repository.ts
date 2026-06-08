import { prisma } from "../lib/prisma.js";
import { interactionInputSchema } from "../lib/schemas.js";
import type { z } from "zod";

export type InteractionInput = z.infer<typeof interactionInputSchema>;

export async function listInteractionRecords() {
  return prisma.interaction.findMany({
    include: { jobOpportunity: true },
    orderBy: { date: "asc" }
  });
}

export async function createInteractionRecord(input: InteractionInput & { jobOpportunityId: string }) {
  const { jobOpportunityId, ...rest } = input;
  return prisma.interaction.create({
    data: {
      ...rest,
      date: new Date(rest.date),
      jobOpportunityId
    },
    include: { jobOpportunity: true }
  });
}

export async function updateInteractionRecord(id: string, input: InteractionInput) {
  return prisma.interaction.update({ where: { id }, data: { ...input, date: new Date(input.date) } });
}

export async function deleteInteractionRecord(id: string) {
  return prisma.interaction.delete({ where: { id } });
}

export async function listOpportunityInteractionRecords(opportunityId: string) {
  return prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId },
    orderBy: { date: "asc" }
  });
}

export async function createOpportunityInteractionRecord(opportunityId: string, input: InteractionInput) {
  return prisma.interaction.create({
    data: { ...input, date: new Date(input.date), jobOpportunityId: opportunityId }
  });
}

export async function findUpcomingInteractionRecords(limit = 8) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return prisma.interaction.findMany({
    where: { date: { gte: today } },
    include: { jobOpportunity: true },
    orderBy: { date: "asc" },
    take: limit
  });
}
