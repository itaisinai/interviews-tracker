import type { PipelineType, Prisma } from "@prisma/client";
import type { z } from "zod";

import {
  appendSlugCollisionSuffix,
  compareJobStatuses,
  createOpportunitySlug,
  deriveOpportunityStatusFromInteractions,
} from "@interviews-tracker/core";

import { prisma } from "../lib/prisma.js";
import { opportunityInputSchema } from "../lib/schemas.js";

import {
  normalizeOverdueScheduledInteractionsForRead,
  promoteOpportunityInteractionsForRead,
} from "./interaction-read-normalizer.js";

export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export function preserveLinkedinMetadataForUpdate(
  input: OpportunityInput,
  existing: { linkedinJobId?: string | null; sourceUrl?: string | null }
): OpportunityInput {
  return {
    ...input,
    linkedinJobId: input.linkedinJobId === undefined ? (existing.linkedinJobId ?? undefined) : input.linkedinJobId,
    sourceUrl: input.sourceUrl === undefined ? (existing.sourceUrl ?? undefined) : input.sourceUrl,
  };
}

// Optimized include - select only needed fields to reduce query time
// With cloud databases (Neon), each include adds 100-200ms latency
export const opportunityInclude = {
  company: {
    select: {
      id: true,
      slug: true,
      name: true,
      searchName: true,
      linkedinUrl: true,
      websiteUrl: true,
      location: true,
      funding: true,
      totalRaised: true,
      latestRound: true,
      description: true,
      productDescription: true,
      customersTraction: true,
      techStack: true,
      backendFrontendSplit: true,
      isWatchlisted: true,
      employeesRange: { select: { id: true, label: true } },
      companyStage: { select: { id: true, label: true } },
      domains: {
        select: {
          domain: { select: { id: true, label: true } },
        },
      },
    },
  },
  workModel: { select: { id: true, label: true } },
  domains: {
    select: {
      domain: { select: { id: true, label: true } },
    },
  },
  interactions: {
    orderBy: { date: "asc" as const },
    // Load all fields - needed for detail page
  },
  notesList: {
    orderBy: { createdAt: "desc" as const },
    // Load all fields - needed for detail page
  },
  tasks: {
    orderBy: { dueDate: "asc" as const },
    // Load all fields - needed for detail page
  },
  compensation: true,
} satisfies Prisma.JobOpportunityInclude;

function toWrite(
  input: OpportunityInput & { companyId: string },
  ownerEmail: string
): Omit<Prisma.JobOpportunityCreateInput, "slug"> {
  const { domainIds, workModelId, companyId, companyName, ...rest } = input;
  return {
    ...rest,
    ownerEmail,
    company: { connect: { id: companyId } },
    referrerOrConnection: rest.referrerOrConnection ?? null,
    source: rest.source ?? null,
    jobUrl: rest.jobUrl ?? null,
    linkedinUrl: rest.linkedinUrl ?? null,
    linkedinJobId: rest.linkedinJobId ?? null,
    sourceUrl: rest.sourceUrl ?? null,
    nextStep: rest.nextStep ?? null,
    notes: rest.notes ?? null,
    compensationNotes: rest.compensationNotes ?? null,
    workModel: workModelId ? { connect: { id: workModelId } } : undefined,
    domains: { create: domainIds.map((domainId) => ({ ownerEmail, domain: { connect: { id: domainId } } })) },
  };
}

async function createUniqueOpportunitySlug(
  companyName: string,
  roleTitle: string,
  ownerEmail: string,
  tx: Prisma.TransactionClient = prisma,
  excludeId?: string
) {
  const baseSlug = createOpportunitySlug(companyName, roleTitle);
  const existing = await tx.jobOpportunity.findMany({
    where: {
      ownerEmail,
      slug: { startsWith: baseSlug },
      id: excludeId ? { not: excludeId } : undefined,
    },
    select: { slug: true },
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

/**
 * List opportunities with only necessary fields for table view
 * No status sync, no nested includes, optimized for client-side filtering
 */
export async function listOpportunityRecords(ownerEmail: string) {
  const opportunities = await prisma.jobOpportunity.findMany({
    where: { ownerEmail },
    select: {
      id: true,
      slug: true,
      roleTitle: true,
      status: true,
      pipelineType: true,
      referrerOrConnection: true,
      nextStep: true,
      jobUrl: true,
      updatedAt: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      interactions: {
        select: {
          id: true,
          date: true,
          type: true,
        },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return opportunities;
}

export async function getOpportunityRecord(slugOrId: string, ownerEmail: string) {
  // Optimized: Single query with OR condition instead of two separate queries
  const opportunity = await prisma.jobOpportunity.findFirst({
    where: {
      ownerEmail,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    include: opportunityInclude,
  });

  if (!opportunity) {
    throw new Error("Opportunity not found");
  }

  // Removed expensive status sync from read path - this was querying ALL user interactions
  // Status sync should happen on write operations (create/update interaction), not reads

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
      company: { select: { id: true, name: true, searchName: true } },
      roleTitle: true,
      domains: { select: { domain: { select: { label: true } } } },
    },
  });
}

export async function createOpportunityRecord(input: OpportunityInput, ownerEmail: string, companyId: string) {
  // Get company name for slug generation
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) throw new Error("Company not found");

  const slug = await createUniqueOpportunitySlug(company.name, input.roleTitle, ownerEmail);
  const opportunity = await prisma.jobOpportunity.create({
    data: { ...toWrite({ ...input, companyId }, ownerEmail), slug },
    include: opportunityInclude,
  });
  return promoteOpportunityInteractionsForRead(opportunity);
}

export async function updateOpportunityRecord(
  slugOrId: string,
  input: Partial<OpportunityInput>,
  ownerEmail: string,
  companyId?: string
) {
  const id = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!id) throw new Error("Opportunity not found");

  // Optimized: Support partial updates, avoid unnecessary operations
  const opportunity = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.jobOpportunity.findFirst({
        where: { id, ownerEmail },
        include: {
          company: { select: { name: true } },
          domains: { select: { domainId: true } },
        },
      });

      if (!existing) throw new Error("Opportunity not found");

      const inputWithPreservedMetadata = preserveLinkedinMetadataForUpdate(input as OpportunityInput, existing);
      const finalCompanyId = companyId || existing.companyId;

      // Only regenerate slug if company or role actually changed
      let slug = existing.slug;
      const companyChanged = companyId && companyId !== existing.companyId;
      const roleChanged = input.roleTitle !== undefined && input.roleTitle !== existing.roleTitle;

      if (!slug || companyChanged || roleChanged) {
        let companyName = existing.company.name;
        if (companyChanged) {
          const company = await tx.company.findUnique({ where: { id: companyId }, select: { name: true } });
          if (!company) throw new Error("Company not found");
          companyName = company.name;
        }
        const newRoleTitle = input.roleTitle ?? existing.roleTitle;
        slug = await createUniqueOpportunitySlug(companyName, newRoleTitle, ownerEmail, tx, id);
      }

      // Build update data - only include provided fields
      const updateData: Prisma.JobOpportunityUpdateInput = {
        slug,
        ...(input.roleTitle !== undefined && { roleTitle: input.roleTitle }),
        ...(input.pipelineType !== undefined && { pipelineType: input.pipelineType }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.referrerOrConnection !== undefined && { referrerOrConnection: input.referrerOrConnection }),
        ...(input.source !== undefined && { source: input.source }),
        ...(input.jobUrl !== undefined && { jobUrl: input.jobUrl }),
        ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
        ...(input.linkedinJobId !== undefined && { linkedinJobId: inputWithPreservedMetadata.linkedinJobId }),
        ...(input.sourceUrl !== undefined && { sourceUrl: inputWithPreservedMetadata.sourceUrl }),
        ...(input.nextStep !== undefined && { nextStep: input.nextStep }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.compensationNotes !== undefined && { compensationNotes: input.compensationNotes }),
        ...(input.workModelId !== undefined && {
          workModel: input.workModelId ? { connect: { id: input.workModelId } } : { disconnect: true },
        }),
      };

      // Only handle domains if they were provided in the input
      if (input.domainIds !== undefined) {
        const existingDomainIds = new Set(existing.domains.map((d) => d.domainId));
        const newDomainIds = new Set(input.domainIds);
        const domainsChanged =
          existingDomainIds.size !== newDomainIds.size || [...existingDomainIds].some((id) => !newDomainIds.has(id));

        if (domainsChanged) {
          await tx.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: id, ownerEmail } });
          updateData.domains = {
            create: input.domainIds.map((domainId) => ({ ownerEmail, domain: { connect: { id: domainId } } })),
          };
        }
      }

      return tx.jobOpportunity.update({ where: { id }, data: updateData, include: opportunityInclude });
    },
    {
      timeout: 10000, // 10 seconds instead of default 5
    }
  );

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
          date: true,
        },
        orderBy: { date: "asc" },
      },
    },
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
      ...(shouldArchive && { pipelineType: nextPipelineType }),
    },
  });

  return nextStatus;
}

export async function listOpportunityInteractionsRecord(slugOrId: string, ownerEmail: string) {
  const opportunityId = await resolveOpportunityId(slugOrId, ownerEmail);
  if (!opportunityId) return [];
  const interactions = await prisma.interaction.findMany({
    where: { jobOpportunityId: opportunityId, ownerEmail },
    orderBy: { date: "asc" },
  });

  return promoteOpportunityInteractionsForRead({ interactions }).interactions;
}
