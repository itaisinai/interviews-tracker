import { prisma } from "../../lib/prisma.js";
import type { CompanyInput } from "../../repositories/company-repository.js";
import {
  companyInclude,
  createCompanyRecord,
  deleteCompanyRecord,
  findCompanyByName,
  findCompanyRecord,
  findOrCreateCompanyByName,
  listCompanyRecords,
  listCompanyRecordsLightweight,
  resolveCompanyId,
  updateCompanyRecord,
} from "../../repositories/company-repository.js";

export class CompanyService {
  async list(query: Record<string, string | undefined>, ownerEmail: string) {
    return listCompanyRecords(query, ownerEmail);
  }

  async listLightweight(ownerEmail: string) {
    return listCompanyRecordsLightweight(ownerEmail);
  }

  async get(slugOrId: string, ownerEmail: string) {
    return findCompanyRecord(slugOrId, ownerEmail);
  }

  async findByName(name: string, ownerEmail: string) {
    return findCompanyByName(name, ownerEmail);
  }

  async create(input: CompanyInput, ownerEmail: string) {
    return createCompanyRecord(input, ownerEmail);
  }

  async update(slugOrId: string, input: Partial<CompanyInput>, ownerEmail: string) {
    return updateCompanyRecord(slugOrId, input, ownerEmail);
  }

  async delete(slugOrId: string, ownerEmail: string) {
    return deleteCompanyRecord(slugOrId, ownerEmail);
  }

  async findOrCreate(name: string, ownerEmail: string) {
    return findOrCreateCompanyByName(name, ownerEmail);
  }

  async addToWatchlist(slugOrId: string, reason: string | null, ownerEmail: string) {
    return updateCompanyRecord(slugOrId, { isWatchlisted: true, watchlistReason: reason }, ownerEmail);
  }

  async removeFromWatchlist(slugOrId: string, ownerEmail: string) {
    return updateCompanyRecord(slugOrId, { isWatchlisted: false, watchlistReason: null }, ownerEmail);
  }

  async markResearched(slugOrId: string, ownerEmail: string) {
    // Update lastResearchedAt directly using Prisma (not part of CompanyInput schema)
    const id = await resolveCompanyId(slugOrId, ownerEmail);
    if (!id) return null;

    return prisma.company.update({
      where: { id },
      data: { lastResearchedAt: new Date() },
      include: companyInclude,
    });
  }
}

let instance: CompanyService | null = null;

export function getCompanyService() {
  if (!instance) {
    instance = new CompanyService();
  }
  return instance;
}
