import type { CompanyResearchResult } from "@interviews-tracker/ai";

import { prisma } from "../../lib/prisma.js";

import { getCompanyService } from "./company-service.js";

function present(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeEmployees(value: string | null | undefined) {
  if (!value) return null;
  return (
    value
      .replace(/^(approximately|around|about|~|roughly)\s*/i, "")
      .replace(/\s+(employees?|people|team members?)\s*$/i, "")
      .trim() || null
  );
}

/** Applies research with the same preserve-existing/non-empty merge policy as the manual flow. */
export async function applyCompanyResearch(companyId: string, ownerEmail: string, research: CompanyResearchResult) {
  const company = await getCompanyService().get(companyId, ownerEmail);
  if (!company) throw new Error("Company not found or is not owned by the research job owner");

  const employeesLabel = normalizeEmployees(research.employees);
  const employeesRange = employeesLabel
    ? await prisma.companySizeOption.upsert({
        where: { label: employeesLabel },
        create: { label: employeesLabel },
        update: {},
      })
    : null;
  const domains = await Promise.all(
    research.domains.map((label) => prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} }))
  );

  const updated = await getCompanyService().update(
    company.id,
    {
      name: present(research.companyName) ? research.companyName : company.name,
      searchName: present(research.companySearchName) ? research.companySearchName : company.searchName,
      funding: present(company.funding) ? company.funding : research.funding,
      totalRaised: present(company.totalRaised) ? company.totalRaised : research.totalRaised,
      latestRound: present(company.latestRound) ? company.latestRound : research.latestRound,
      employeesRangeId: company.employeesRangeId ?? employeesRange?.id,
      location: present(company.location) ? company.location : research.location,
      linkedinUrl: present(company.linkedinUrl) ? company.linkedinUrl : research.linkedinUrl,
      description: present(company.description) ? company.description : research.companyDescription,
      productDescription: present(company.productDescription)
        ? company.productDescription
        : research.productDescription,
      customersTraction: present(company.customersTraction) ? company.customersTraction : research.customersTraction,
      domainIds: domains.length
        ? [...new Set([...company.domains.map((domain) => domain.domainId), ...domains.map((domain) => domain.id)])]
        : undefined,
    },
    ownerEmail
  );
  if (!updated) throw new Error("Company disappeared while applying research");
  return getCompanyService().markResearched(updated.id, ownerEmail);
}
