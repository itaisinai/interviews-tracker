import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { appendSlugCollisionSuffix, createCompanySlug } from "@interviews-tracker/core";

import { prisma } from "../lib/prisma.js";
import { companyInputSchema } from "../lib/schemas.js";

export type CompanyInput = z.infer<typeof companyInputSchema>;

export const companyInclude = {
  employeesRange: true,
  companyStage: true,
  domains: { include: { domain: true } },
  opportunities: {
    include: {
      interactions: { orderBy: { date: "asc" as const } },
      compensation: true,
      workModel: true,
      domains: { include: { domain: true } },
    },
  },
  notesList: { orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { dueDate: "asc" as const } },
  contacts: { orderBy: { name: "asc" as const } },
} satisfies Prisma.CompanyInclude;

function toWrite(input: CompanyInput, ownerEmail: string): Omit<Prisma.CompanyCreateInput, "slug"> {
  const { domainIds, employeesRangeId, companyStageId, ...rest } = input;
  return {
    ...rest,
    ownerEmail,
    searchName: rest.searchName ?? rest.name.toLowerCase().trim(),
    linkedinUrl: rest.linkedinUrl ?? null,
    websiteUrl: rest.websiteUrl ?? null,
    location: rest.location ?? null,
    funding: rest.funding ?? null,
    description: rest.description ?? null,
    productDescription: rest.productDescription ?? null,
    customersTraction: rest.customersTraction ?? null,
    techStack: rest.techStack ?? null,
    backendFrontendSplit: rest.backendFrontendSplit ?? null,
    companyNotes: rest.notes ?? null,
    watchlistReason: rest.watchlistReason ?? null,
    employeesRange: employeesRangeId ? { connect: { id: employeesRangeId } } : undefined,
    companyStage: companyStageId ? { connect: { id: companyStageId } } : undefined,
    domains: { create: domainIds.map((domainId: string) => ({ ownerEmail, domain: { connect: { id: domainId } } })) },
  };
}

async function createUniqueCompanySlug(
  input: Pick<CompanyInput, "name">,
  ownerEmail: string,
  tx: Prisma.TransactionClient = prisma,
  excludeId?: string
) {
  const baseSlug = createCompanySlug(input.name);
  const existing = await tx.company.findMany({
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

export async function resolveCompanyId(slugOrId: string, ownerEmail: string) {
  const byId = await prisma.company.findFirst({ where: { id: slugOrId, ownerEmail }, select: { id: true } });
  if (byId) {
    return byId.id;
  }

  const bySlug = await prisma.company.findFirst({ where: { slug: slugOrId, ownerEmail }, select: { id: true } });
  return bySlug?.id ?? null;
}

export async function listCompanyRecords(query: Record<string, string | undefined>, ownerEmail: string) {
  const where: Prisma.CompanyWhereInput = {
    ownerEmail,
    isWatchlisted: query.watchlisted === "true" ? true : undefined,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" } },
          { searchName: { contains: query.search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const companies = await prisma.company.findMany({
    where,
    include: companyInclude,
    orderBy: { updatedAt: "desc" },
  });

  return companies;
}

export async function findCompanyRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveCompanyId(slugOrId, ownerEmail);
  if (!id) return null;

  const company = await prisma.company.findUnique({
    where: { id },
    include: companyInclude,
  });

  return company;
}

export async function findCompanyByName(name: string, ownerEmail: string) {
  const company = await prisma.company.findFirst({
    where: {
      ownerEmail,
      OR: [{ name: { equals: name, mode: "insensitive" } }, { searchName: { equals: name.toLowerCase().trim() } }],
    },
    include: companyInclude,
  });

  return company;
}

export async function createCompanyRecord(input: CompanyInput, ownerEmail: string) {
  const slug = await createUniqueCompanySlug(input, ownerEmail);
  const data = toWrite(input, ownerEmail);

  const company = await prisma.company.create({
    data: { ...data, slug },
    include: companyInclude,
  });

  return company;
}

export async function updateCompanyRecord(slugOrId: string, input: Partial<CompanyInput>, ownerEmail: string) {
  const id = await resolveCompanyId(slugOrId, ownerEmail);
  if (!id) return null;

  const existing = await prisma.company.findUnique({ where: { id }, select: { name: true } });
  if (!existing) return null;

  const slug =
    input.name && input.name !== existing.name
      ? await createUniqueCompanySlug({ name: input.name }, ownerEmail, prisma, id)
      : undefined;

  const { domainIds, employeesRangeId, companyStageId, ...rest } = input;

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...rest,
      slug,
      searchName: input.searchName ?? (input.name ? input.name.toLowerCase().trim() : undefined),
      employeesRange: employeesRangeId ? { connect: { id: employeesRangeId } } : undefined,
      companyStage: companyStageId ? { connect: { id: companyStageId } } : undefined,
    },
    include: companyInclude,
  });

  // Update domains if provided
  if (domainIds) {
    await prisma.companyDomain.deleteMany({ where: { companyId: id, ownerEmail } });
    if (domainIds.length > 0) {
      await prisma.companyDomain.createMany({
        data: domainIds.map((domainId: string) => ({ ownerEmail, companyId: id, domainId })),
        skipDuplicates: true,
      });
    }
  }

  return company;
}

export async function deleteCompanyRecord(slugOrId: string, ownerEmail: string) {
  const id = await resolveCompanyId(slugOrId, ownerEmail);
  if (!id) return false;

  // Check if company has opportunities (enforce restrict)
  const opportunityCount = await prisma.jobOpportunity.count({ where: { companyId: id, ownerEmail } });
  if (opportunityCount > 0) {
    throw new Error(`Cannot delete company with ${opportunityCount} opportunities. Delete opportunities first.`);
  }

  await prisma.company.delete({ where: { id } });
  return true;
}

export async function findOrCreateCompanyByName(name: string, ownerEmail: string): Promise<string> {
  const existing = await findCompanyByName(name, ownerEmail);
  if (existing) {
    return existing.id;
  }

  const company = await createCompanyRecord({ name, isWatchlisted: false, domainIds: [] }, ownerEmail);
  return company.id;
}
