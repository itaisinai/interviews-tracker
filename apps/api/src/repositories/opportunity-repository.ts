import type { Prisma, PipelineType } from "@prisma/client";
import { appendSlugCollisionSuffix, compareJobStatuses, createOpportunitySlug, deriveOpportunityStatusFromInteractions } from "@interviews-tracker/core";
import { prisma } from "../lib/prisma.js";
import { opportunityInputSchema } from "../lib/schemas.js";
import type { z } from "zod";
import {
  normalizeOverdueScheduledInteractionsForRead,
  promoteOpportunityInteractionsForRead
} from "./interaction-read-normalizer.js";

export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const opportunityInclude = {
  employeesRange: true,
  companyStage: true,
  workModel: true,
  domains: { include: { domain: true } },
  interactions: { orderBy: { date: "asc" as const } },
  notesList: { orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { dueDate: "asc" as const } },
  compensation: true
} satisfies Prisma.JobOpportunityInclude;

function toWrite(input: OpportunityInput, ownerEmail: string): Omit<Prisma.JobOpportunityCreateInput, "slug"> {
  const { domainIds, employeesRangeId, companyStageId, workModelId, ...rest } = input;
  return {
    ...rest,
    ownerEmail,
    referrerOrConnection: rest.referrerOrConnection ?? null,
    source: rest.source ?? null,
    jobUrl: rest.jobUrl ?? null,
    linkedinUrl: rest.linkedinUrl ?? null,
    nextStep: rest.nextStep ?? null,
    notes: rest.notes ?? null,
    location: rest.location ?? null,
    funding: rest.funding ?? null,
    companyDescription: rest.companyDescription ?? null,
    productDescription: rest.productDescription ?? null,
    customersTraction: rest.customersTraction ?? null,
    techStack: rest.techStack ?? null,
    backendFrontendSplit: rest.backendFrontendSplit ?? null,
    compensationNotes: rest.compensationNotes ?? null,
    employeesRange: employeesRangeId ? { connect: { id: employeesRangeId } } : undefined,
    companyStage: companyStageId ? { connect: { id: companyStageId } } : undefined,
    workModel: workModelId ? { connect: { id: workModelId } } : undefined,
    domains: { create: domainIds.map((domainId) => ({ ownerEmail, domain: { connect: { id: domainId } } })) }
  };
}

async function createUniqueOpportunitySlug(input: Pick<OpportunityInput, "companyName" | "roleTitle">, ownerEmail: string, tx: Prisma.TransactionClient = prisma, excludeId?: string) {
  const baseSlug = createOpportunitySlug(input.companyName, input.roleTitle);
  const existing = await tx.jobOpportunity.findMany({
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

export async function resolveOpportunityId(slugOrId: string, ownerEmail: string) {
  const byId = await prisma.jobOpportunity.findFirst({ where: { id: slugOrId, ownerEmail }, select: { id: true } });
  if (byId) {
    return byId.id;
  }

  const bySlug = await prisma.jobOpportunity.findFirst({ where: { slug: slugOrId, ownerEmail }, select: { id: true } });
  return bySlug?.id ?? null;
}

export async function listOpportunityRecords(query: Record<string, string | undefined>, ownerEmail: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));

  const where: Prisma.JobOpportunityWhereInput = {
    ownerEmail,
    status: query.status ? { equals: query.status as Prisma.EnumJobStatusFilter<"JobOpportunity">["equals"] } : undefined,
    priority: query.priority ? { equals: query.priority as Prisma.EnumPriorityFilter<"JobOpportunity">["equals"] } : undefined,
    OR: query.search
      ? [
          { companyName: { contains: query.search, mode: "insensitive" } },
          { roleTitle: { contains: query.search, mode: "insensitive" } }
        ]
      : undefined,
    domains: query.domainId ? { some: { domainId: query.domainId } } : undefined
  };

  // Custom pipeline filtering logic
  if (query.pipeline === "POTENTIAL") {
    // POTENTIAL: Only leads WITHOUT any interactions
    where.interactions = { none: {} };
    where.pipelineType = "POTENTIAL";
  } else if (query.pipeline === "ACTIVE_PROCESS") {
    // ACTIVE_PROCESS: Any process WITH interactions (exclude REJECTED status)
    where.interactions = { some: {} };
    // Preserve any existing status filter, or default to excluding REJECTED
    if (!where.status) {
      where.status = { not: "REJECTED" };
    }
  } else if (query.pipeline === "ARCHIVED") {
    // ARCHIVED: Rejected or closed opportunities (pipeline=ARCHIVED or relevant statuses)
    // Keep opportunities with pipelineType=ARCHIVED even if status isn't explicitly REJECTED
    where.pipelineType = "ARCHIVED";
  } else if (query.pipeline) {
    // Fallback for other pipeline types
    where.pipelineType = query.pipeline as PipelineType;
  }

  const opportunities = await prisma.jobOpportunity.findMany({
    where,
    include: opportunityInclude,
    orderBy: query.sort === "nextInteraction" ? { interactions: { _count: "desc" } } : { updatedAt: "desc" }
  });

  return opportunities.map((opportunity) => promoteOpportunityInteractionsForRead(opportunity));
}

export async function getOpportunityRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!id) {
    throw new Error("Opportunity not found");
  }

  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  if (opportunityIds.includes(id)) {
    await syncOpportunityStatusRecord(id, ownerEmail);
  }

  const opportunity = await prisma.jobOpportunity.findFirstOrThrow({ where: { id, ownerEmail }, include: opportunityInclude });
  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function getOpportunitySummaryRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!id) {
    return null;
  }

  return prisma.jobOpportunity.findFirst({
    where: { id, ownerEmail },
    select: {
      id: true,
      companyName: true,
      companySearchName: true,
      roleTitle: true,
      domains: { select: { domain: { select: { label: true } } } }
    }
  });
}

export async function createOpportunityRecord(input: OpportunityInput, ownerEmail: string) {
  const slug = await createUniqueOpportunitySlug(input, ownerEmail);
  const opportunity = await prisma.jobOpportunity.create({ data: { ...toWrite(input, ownerEmail), slug }, include: opportunityInclude });
  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function updateOpportunityRecord(slugOrId: string, input: OpportunityInput, ownerEmail: string) {
  const id = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!id) throw new Error("Opportunity not found");
  const data = toWrite(input, ownerEmail);
  const opportunity = await prisma.$transaction(async (tx) => {
    const existing = await tx.jobOpportunity.findFirst({ where: { id, ownerEmail }, select: { slug: true } });
    const slug = existing?.slug || await createUniqueOpportunitySlug(input, ownerEmail, tx, id);
    await tx.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: id, ownerEmail } });
    return tx.jobOpportunity.update({ where: { id }, data: { ...data, slug }, include: opportunityInclude });
  });

  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function deleteOpportunityRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!id) throw new Error("Opportunity not found");
  return prisma.jobOpportunity.delete({ where: { id } });
}

export async function syncOpportunityStatusRecord(id: string, ownerEmail: string) {
  const opportunity = await prisma.jobOpportunity.findFirst({
    where: { id, ownerEmail },
    select: {
      id: true,
      status: true,
      pipelineType: true,
      interactions: {
        select: {
          type: true,
          stage: true,
          status: true,
          outcome: true,
          followUp: true,
          date: true
        },
        orderBy: { date: "asc" }
      }
    }
  });

  if (!opportunity) {
    return null;
  }

  const derivedStatus = deriveOpportunityStatusFromInteractions(opportunity.interactions);
  const nextStatus = !derivedStatus
    ? opportunity.status
    : compareJobStatuses(derivedStatus, opportunity.status) > 0
      ? derivedStatus
      : opportunity.status;

  if (nextStatus === opportunity.status) {
    return opportunity.status;
  }

  // Auto-archive when rejected or marked not relevant
  const shouldArchive = nextStatus === "REJECTED" || nextStatus === "NOT_RELEVANT";
  const nextPipelineType = shouldArchive ? "ARCHIVED" : opportunity.pipelineType;

  await prisma.jobOpportunity.update({
    where: { id: opportunity.id },
    data: {
      status: nextStatus,
      ...(shouldArchive && { pipelineType: nextPipelineType })
    }
  });

  return nextStatus;
}

export async function listOpportunityInteractionsRecord(slugOrId: string, ownerEmail: string) {
  const opportunityId = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!opportunityId) return [];
  const interactions = await prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId, ownerEmail },
    orderBy: { date: "asc" }
  });

  return promoteOpportunityInteractionsForRead({ interactions }).interactions;
}
