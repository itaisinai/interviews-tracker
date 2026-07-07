import type { Prisma } from "@prisma/client";
import { appendSlugCollisionSuffix, createInteractionSlug, createInteractionTitle } from "@interviews-tracker/core";
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

async function createUniqueInteractionSlug(input: Pick<InteractionInput, "type" | "stage">, jobOpportunityId: string, ownerEmail: string, tx: Prisma.TransactionClient = prisma, excludeId?: string) {
  const opportunity = await tx.jobOpportunity.findFirstOrThrow({ where: { id: jobOpportunityId, ownerEmail }, include: { company: { select: { name: true } } } });
  const baseSlug = createInteractionSlug(opportunity.company.name, createInteractionTitle(input.type, input.stage));
  const existing = await tx.interaction.findMany({
    where: {
      ownerEmail,
      slug: { startsWith: baseSlug },
      id: excludeId ? { not: excludeId } : undefined
    },
    select: { slug: true }
  });
  const usedSlugs = new Set(existing.map((item) => item.slug));

  for (let index = 1; ; index += 1) {
    const candidate = appendSlugCollisionSuffix(baseSlug, index);
    if (!usedSlugs.has(candidate)) {
      return candidate;
    }
  }
}

export async function resolveInteractionId(slugOrId: string, ownerEmail: string) {
  const byId = await prisma.interaction.findFirst({ where: { id: slugOrId, ownerEmail }, select: { id: true } });
  if (byId) return byId.id;

  const bySlug = await prisma.interaction.findFirst({ where: { slug: slugOrId, ownerEmail }, select: { id: true } });
  return bySlug?.id ?? null;
}


export async function listInteractionRecords(ownerEmail: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));

  const interactions = await prisma.interaction.findMany({
    where: { ownerEmail },
    include: {
      jobOpportunity: {
        include: {
          company: true
        }
      }
    },
    orderBy: { date: "asc" }
  });

  return promoteOverdueInteractionsForRead(interactions);
}

export async function createInteractionRecord(input: InteractionInput & { jobOpportunityId: string }, ownerEmail: string) {
  const { jobOpportunityId, ...rest } = input;
  const slug = await createUniqueInteractionSlug(rest, jobOpportunityId, ownerEmail);
  const interaction = await prisma.interaction.create({
    data: {
      ...rest,
      slug,
      ownerEmail,
      date: new Date(rest.date),
      endDate: rest.endDate ? new Date(rest.endDate) : null,
      jobOpportunityId
    },
    include: {
      jobOpportunity: {
        include: { company: true }
      }
    }
  });

  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function updateInteractionRecord(slugOrId: string, input: InteractionInput, ownerEmail: string) {
  const id = await resolveInteractionId(slugOrId, ownerEmail);
  if (!id) throw new Error("Interaction not found");

  const interaction = await prisma.$transaction(async (tx) => {
    const existing = await tx.interaction.findFirstOrThrow({ where: { id, ownerEmail }, select: { jobOpportunityId: true } });
    const slug = await createUniqueInteractionSlug(input, existing.jobOpportunityId, ownerEmail, tx, id);
    return tx.interaction.update({ where: { id }, data: { ...input, slug, date: new Date(input.date), endDate: input.endDate ? new Date(input.endDate) : null }, include: { jobOpportunity: { include: { company: true } } } });
  });
  return promoteOverdueInteractionStatusForRead(interaction);
}

export async function deleteInteractionRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveInteractionId(slugOrId, ownerEmail);
  if (!id) throw new Error("Interaction not found");
  return prisma.interaction.delete({
    where: { id },
    include: {
      jobOpportunity: {
        include: { company: true }
      }
    }
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
  const slug = await createUniqueInteractionSlug(input, opportunityId, ownerEmail);
  return prisma.interaction.create({
    data: { ...input, slug, ownerEmail, date: new Date(input.date), endDate: input.endDate ? new Date(input.endDate) : null, jobOpportunityId: opportunityId }
  });
}

export async function findUpcomingInteractionRecords(ownerEmail: string, limit = 8) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const interactions = await prisma.interaction.findMany({
    where: { ownerEmail, date: { gte: today } },
    include: {
      jobOpportunity: {
        include: { company: true }
      }
    },
    orderBy: { date: "asc" },
    take: limit
  });

  return promoteOverdueInteractionsForRead(interactions);
}
