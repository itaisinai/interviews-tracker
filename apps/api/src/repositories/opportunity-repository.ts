import type { Prisma } from "@prisma/client";
import { compareJobStatuses, deriveOpportunityStatusFromInteractions } from "@interviews-tracker/core";
import { prisma } from "../lib/prisma.js";
import { noteInputSchema, opportunityInputSchema, taskInputSchema } from "../lib/schemas.js";
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

function toWrite(input: OpportunityInput): Prisma.JobOpportunityCreateInput {
  const { domainIds, employeesRangeId, companyStageId, workModelId, ...rest } = input;
  return {
    ...rest,
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
    domains: { create: domainIds.map((domainId) => ({ domain: { connect: { id: domainId } } })) }
  };
}

export async function listOpportunityRecords(query: Record<string, string | undefined>) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead();
  await Promise.all(opportunityIds.map((id) => syncOpportunityStatusRecord(id)));

  const where: Prisma.JobOpportunityWhereInput = {
    status: query.status ? { equals: query.status as Prisma.EnumJobStatusFilter<"JobOpportunity">["equals"] } : undefined,
    pipelineType: query.pipeline ? { equals: query.pipeline as Prisma.EnumPipelineTypeFilter<"JobOpportunity">["equals"] } : undefined,
    priority: query.priority ? { equals: query.priority as Prisma.EnumPriorityFilter<"JobOpportunity">["equals"] } : undefined,
    OR: query.search
      ? [
          { companyName: { contains: query.search, mode: "insensitive" } },
          { roleTitle: { contains: query.search, mode: "insensitive" } }
        ]
      : undefined,
    domains: query.domainId ? { some: { domainId: query.domainId } } : undefined
  };

  const opportunities = await prisma.jobOpportunity.findMany({
    where,
    include: opportunityInclude,
    orderBy: query.sort === "nextInteraction" ? { interactions: { _count: "desc" } } : { updatedAt: "desc" }
  });

  return opportunities.map((opportunity) => promoteOpportunityInteractionsForRead(opportunity));
}

export async function getOpportunityRecord(id: string) {
  const opportunityIds = await normalizeOverdueScheduledInteractionsForRead();
  if (opportunityIds.includes(id)) {
    await syncOpportunityStatusRecord(id);
  }

  const opportunity = await prisma.jobOpportunity.findUniqueOrThrow({ where: { id }, include: opportunityInclude });
  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function getOpportunitySummaryRecord(id: string) {
  return prisma.jobOpportunity.findUnique({ where: { id }, select: { companyName: true, roleTitle: true } });
}

export async function createOpportunityRecord(input: OpportunityInput) {
  const opportunity = await prisma.jobOpportunity.create({ data: toWrite(input), include: opportunityInclude });
  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function updateOpportunityRecord(id: string, input: OpportunityInput) {
  const data = toWrite(input);
  const opportunity = await prisma.$transaction(async (tx) => {
    await tx.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: id } });
    return tx.jobOpportunity.update({ where: { id }, data, include: opportunityInclude });
  });

  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function deleteOpportunityRecord(id: string) {
  return prisma.jobOpportunity.delete({ where: { id } });
}

export async function syncOpportunityStatusRecord(id: string) {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
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

  await prisma.jobOpportunity.update({
    where: { id: opportunity.id },
    data: { status: nextStatus }
  });

  return nextStatus;
}

export async function listOpportunityInteractionsRecord(opportunityId: string) {
  const interactions = await prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId },
    orderBy: { date: "asc" }
  });

  return promoteOpportunityInteractionsForRead({ interactions }).interactions;
}

export type OpportunityNoteInput = z.infer<typeof noteInputSchema>;
export type OpportunityTaskInput = z.infer<typeof taskInputSchema>;

export async function createOpportunityNoteRecord(opportunityId: string, input: OpportunityNoteInput) {
  return prisma.note.create({ data: { ...input, jobOpportunityId: opportunityId } });
}

export async function createOpportunityTaskRecord(opportunityId: string, input: OpportunityTaskInput) {
  return prisma.task.create({ data: { ...input, jobOpportunityId: opportunityId, dueDate: input.dueDate ? new Date(input.dueDate) : null } });
}
