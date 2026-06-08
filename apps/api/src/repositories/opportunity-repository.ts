import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { interactionInputSchema, noteInputSchema, opportunityInputSchema, taskInputSchema } from "../lib/schemas.js";
import type { z } from "zod";

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

  return prisma.jobOpportunity.findMany({
    where,
    include: opportunityInclude,
    orderBy: query.sort === "nextInteraction" ? { interactions: { _count: "desc" } } : { updatedAt: "desc" }
  });
}

export async function getOpportunityRecord(id: string) {
  return prisma.jobOpportunity.findUniqueOrThrow({ where: { id }, include: opportunityInclude });
}

export async function getOpportunitySummaryRecord(id: string) {
  return prisma.jobOpportunity.findUnique({ where: { id }, select: { companyName: true, roleTitle: true } });
}

export async function createOpportunityRecord(input: OpportunityInput) {
  return prisma.jobOpportunity.create({ data: toWrite(input), include: opportunityInclude });
}

export async function updateOpportunityRecord(id: string, input: OpportunityInput) {
  const data = toWrite(input);
  return prisma.$transaction(async (tx) => {
    await tx.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: id } });
    return tx.jobOpportunity.update({ where: { id }, data, include: opportunityInclude });
  });
}

export async function deleteOpportunityRecord(id: string) {
  return prisma.jobOpportunity.delete({ where: { id } });
}

export async function listOpportunityInteractionsRecord(opportunityId: string) {
  return prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId },
    orderBy: { date: "asc" }
  });
}

export type OpportunityInteractionInput = z.infer<typeof interactionInputSchema>;
export type OpportunityNoteInput = z.infer<typeof noteInputSchema>;
export type OpportunityTaskInput = z.infer<typeof taskInputSchema>;

export async function createOpportunityInteractionRecord(opportunityId: string, input: OpportunityInteractionInput) {
  return prisma.interaction.create({ data: { ...input, date: new Date(input.date), jobOpportunityId: opportunityId } });
}

export async function createOpportunityNoteRecord(opportunityId: string, input: OpportunityNoteInput) {
  return prisma.note.create({ data: { ...input, jobOpportunityId: opportunityId } });
}

export async function createOpportunityTaskRecord(opportunityId: string, input: OpportunityTaskInput) {
  return prisma.task.create({ data: { ...input, jobOpportunityId: opportunityId, dueDate: input.dueDate ? new Date(input.dueDate) : null } });
}
