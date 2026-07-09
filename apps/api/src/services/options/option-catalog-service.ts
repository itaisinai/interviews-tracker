import { prisma } from "../../lib/prisma.js";

import { invalidateOptionsCache } from "./option-catalog-cache.js";

export async function createDomainOption(label: string) {
  const option = await prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} });
  invalidateOptionsCache();
  return option;
}

export async function createOption(kind: string, label: string) {
  if (kind === "company-size") {
    const option = await prisma.companySizeOption.upsert({ where: { label }, create: { label }, update: {} });
    invalidateOptionsCache();
    return option;
  }
  if (kind === "company-stage") {
    const option = await prisma.companyStageOption.upsert({ where: { label }, create: { label }, update: {} });
    invalidateOptionsCache();
    return option;
  }
  if (kind === "work-model") {
    const option = await prisma.workModelOption.upsert({ where: { label }, create: { label }, update: {} });
    invalidateOptionsCache();
    return option;
  }
  if (kind === "interaction-type") {
    const option = await prisma.interactionTypeOption.upsert({ where: { label }, create: { label }, update: {} });
    invalidateOptionsCache();
    return option;
  }
  if (kind === "interview-stage") {
    const option = await prisma.interviewStageOption.upsert({ where: { label }, create: { label }, update: {} });
    invalidateOptionsCache();
    return option;
  }

  return null;
}

export async function deleteOption(kind: string, id: string) {
  if (kind === "domain") {
    await prisma.jobOpportunityDomain.deleteMany({ where: { domainId: id } });
    await prisma.domainOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }
  if (kind === "company-size") {
    // Update Company records (these fields moved from JobOpportunity to Company)
    await prisma.company.updateMany({ where: { employeesRangeId: id }, data: { employeesRangeId: null } });
    await prisma.companySizeOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }
  if (kind === "company-stage") {
    // Update Company records (these fields moved from JobOpportunity to Company)
    await prisma.company.updateMany({ where: { companyStageId: id }, data: { companyStageId: null } });
    await prisma.companyStageOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }
  if (kind === "work-model") {
    await prisma.jobOpportunity.updateMany({ where: { workModelId: id }, data: { workModelId: null } });
    await prisma.workModelOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }
  if (kind === "interaction-type") {
    await prisma.interactionTypeOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }
  if (kind === "interview-stage") {
    await prisma.interviewStageOption.delete({ where: { id } });
    invalidateOptionsCache();
    return true;
  }

  return false;
}
