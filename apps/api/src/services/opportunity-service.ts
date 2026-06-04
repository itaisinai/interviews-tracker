import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { opportunityInputSchema } from "../lib/schemas.js";
import type { z } from "zod";

type OpportunityInput = z.infer<typeof opportunityInputSchema>;

const include = {
  employeesRange: true,
  companyStage: true,
  workModel: true,
  domains: { include: { domain: true } },
  interactions: { orderBy: { date: "asc" as const } },
  notesList: { orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { dueDate: "asc" as const } },
  compensation: true
};

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

export async function listOpportunities(query: Record<string, string | undefined>) {
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
    include,
    orderBy: query.sort === "nextInteraction" ? { interactions: { _count: "desc" } } : { updatedAt: "desc" }
  });
}

export async function getOpportunity(id: string) {
  return prisma.jobOpportunity.findUniqueOrThrow({ where: { id }, include });
}

export async function createOpportunity(input: OpportunityInput) {
  return prisma.jobOpportunity.create({ data: toWrite(input), include });
}

export async function updateOpportunity(id: string, input: OpportunityInput) {
  const data = toWrite(input);
  return prisma.$transaction(async (tx) => {
    await tx.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: id } });
    return tx.jobOpportunity.update({ where: { id }, data, include });
  });
}

export async function deleteOpportunity(id: string) {
  return prisma.jobOpportunity.delete({ where: { id } });
}
