#!/usr/bin/env tsx

/**
 * Data Migration Script: Add Company Entity
 *
 * This script migrates existing data from the opportunity-centric model
 * to the new Company entity model.
 *
 * Steps:
 * 1. Extract unique companies from JobOpportunity records
 * 2. Create Company records with consolidated data
 * 3. Update JobOpportunity records to reference Company
 * 4. Migrate Person records to reference Company instead of JobOpportunity
 * 5. Migrate domains from opportunities to companies
 * 6. Verify data integrity
 */

import { PrismaClient } from "@prisma/client";
import { createOpportunitySlug } from "@interviews-tracker/core/domain/slugs";

const prisma = new PrismaClient();

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase();
}

function createCompanySlug(companyName: string, ownerEmail: string): string {
  // Simple slug: normalized company name
  return normalizeCompanyName(companyName).replace(/[^a-z0-9]+/g, "-");
}

interface CompanyData {
  ownerEmail: string;
  name: string;
  searchName: string;
  slug: string;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  funding?: string | null;
  employeesRangeId?: string | null;
  companyStageId?: string | null;
  description?: string | null;
  productDescription?: string | null;
  customersTraction?: string | null;
  techStack?: string | null;
  backendFrontendSplit?: string | null;
  companyNotes?: string | null;
  domainIds: Set<string>;
}

async function main() {
  console.log("🚀 Starting Company entity migration...\n");

  // Step 1: Extract unique companies from opportunities
  console.log("📊 Step 1: Extracting unique companies...");

  const opportunities = await prisma.jobOpportunity.findMany({
    include: {
      employeesRange: true,
      companyStage: true,
      domains: { include: { domain: true } },
    },
  });

  console.log(`   Found ${opportunities.length} opportunities`);

  // Group opportunities by (ownerEmail, companyName)
  const companyMap = new Map<string, CompanyData>();

  for (const opp of opportunities) {
    const key = `${opp.ownerEmail}|||${normalizeCompanyName(opp.companyName)}`;

    if (!companyMap.has(key)) {
      const slug = createCompanySlug(opp.companyName, opp.ownerEmail);
      const searchName = opp.companySearchName || normalizeCompanyName(opp.companyName);

      companyMap.set(key, {
        ownerEmail: opp.ownerEmail,
        name: opp.companyName, // Use original name from first opportunity
        searchName,
        slug,
        linkedinUrl: opp.linkedinUrl,
        location: opp.location,
        funding: opp.funding,
        employeesRangeId: opp.employeesRangeId,
        companyStageId: opp.companyStageId,
        description: opp.companyDescription,
        productDescription: opp.productDescription,
        customersTraction: opp.customersTraction,
        techStack: opp.techStack,
        backendFrontendSplit: opp.backendFrontendSplit,
        companyNotes: opp.notes,
        domainIds: new Set(opp.domains.map(d => d.domainId)),
      });
    } else {
      // Consolidate data from multiple opportunities
      const existing = companyMap.get(key)!;

      // Prefer non-null values
      if (opp.linkedinUrl && !existing.linkedinUrl) existing.linkedinUrl = opp.linkedinUrl;
      if (opp.location && !existing.location) existing.location = opp.location;
      if (opp.funding && !existing.funding) existing.funding = opp.funding;
      if (opp.employeesRangeId && !existing.employeesRangeId) existing.employeesRangeId = opp.employeesRangeId;
      if (opp.companyStageId && !existing.companyStageId) existing.companyStageId = opp.companyStageId;
      if (opp.companyDescription && !existing.description) existing.description = opp.companyDescription;
      if (opp.productDescription && !existing.productDescription) existing.productDescription = opp.productDescription;
      if (opp.customersTraction && !existing.customersTraction) existing.customersTraction = opp.customersTraction;
      if (opp.techStack && !existing.techStack) existing.techStack = opp.techStack;
      if (opp.backendFrontendSplit && !existing.backendFrontendSplit) existing.backendFrontendSplit = opp.backendFrontendSplit;

      // Merge domains
      for (const domain of opp.domains) {
        existing.domainIds.add(domain.domainId);
      }

      // Consolidate notes (append if both have notes)
      if (opp.notes) {
        if (existing.companyNotes) {
          existing.companyNotes += `\n\n---\n\n${opp.notes}`;
        } else {
          existing.companyNotes = opp.notes;
        }
      }
    }
  }

  console.log(`   Identified ${companyMap.size} unique companies\n`);

  // Step 2: Create Company records
  console.log("🏢 Step 2: Creating Company records...");

  const companyIdMap = new Map<string, string>(); // key -> companyId

  for (const [key, data] of companyMap.entries()) {
    try {
      const company = await prisma.company.create({
        data: {
          ownerEmail: data.ownerEmail,
          name: data.name,
          searchName: data.searchName,
          slug: data.slug,
          linkedinUrl: data.linkedinUrl,
          location: data.location,
          funding: data.funding,
          employeesRangeId: data.employeesRangeId,
          companyStageId: data.companyStageId,
          description: data.description,
          productDescription: data.productDescription,
          customersTraction: data.customersTraction,
          techStack: data.techStack,
          backendFrontendSplit: data.backendFrontendSplit,
          companyNotes: data.companyNotes,
        },
      });

      companyIdMap.set(key, company.id);
      console.log(`   ✓ Created company: ${data.name} (${data.ownerEmail})`);
    } catch (error) {
      console.error(`   ✗ Failed to create company: ${data.name}`, error);
      throw error;
    }
  }

  console.log(`   Created ${companyIdMap.size} companies\n`);

  // Step 3: Migrate company domains
  console.log("🔗 Step 3: Migrating company domains...");

  for (const [key, data] of companyMap.entries()) {
    const companyId = companyIdMap.get(key)!;

    for (const domainId of data.domainIds) {
      await prisma.companyDomain.create({
        data: {
          ownerEmail: data.ownerEmail,
          companyId,
          domainId,
        },
      });
    }

    if (data.domainIds.size > 0) {
      console.log(`   ✓ Migrated ${data.domainIds.size} domains for: ${data.name}`);
    }
  }

  console.log();

  // Step 4: Update JobOpportunity records with companyId
  console.log("📝 Step 4: Updating JobOpportunity records...");

  for (const opp of opportunities) {
    const key = `${opp.ownerEmail}|||${normalizeCompanyName(opp.companyName)}`;
    const companyId = companyIdMap.get(key);

    if (!companyId) {
      console.error(`   ✗ No company found for opportunity: ${opp.id}`);
      continue;
    }

    try {
      await prisma.jobOpportunity.update({
        where: { id: opp.id },
        data: { companyId },
      });
      console.log(`   ✓ Updated opportunity: ${opp.companyName} - ${opp.roleTitle}`);
    } catch (error) {
      console.error(`   ✗ Failed to update opportunity: ${opp.id}`, error);
      throw error;
    }
  }

  console.log();

  // Step 5: Migrate Person records to reference Company
  console.log("👤 Step 5: Migrating Person records...");

  const persons = await prisma.person.findMany({
    where: { jobOpportunityId: { not: null } },
    include: { jobOpportunity: true },
  });

  console.log(`   Found ${persons.length} persons linked to opportunities`);

  for (const person of persons) {
    if (!person.jobOpportunity) continue;

    const key = `${person.jobOpportunity.ownerEmail}|||${normalizeCompanyName(person.jobOpportunity.companyName)}`;
    const companyId = companyIdMap.get(key);

    if (!companyId) {
      console.error(`   ✗ No company found for person: ${person.id}`);
      continue;
    }

    try {
      await prisma.person.update({
        where: { id: person.id },
        data: {
          companyId,
          jobOpportunityId: null, // Unlink from opportunity
        },
      });
      console.log(`   ✓ Migrated person: ${person.name} → ${person.jobOpportunity.companyName}`);
    } catch (error) {
      console.error(`   ✗ Failed to migrate person: ${person.id}`, error);
      throw error;
    }
  }

  console.log();

  // Step 6: Verify data integrity
  console.log("✅ Step 6: Verifying data integrity...");

  const companiesCount = await prisma.company.count();
  const opportunitiesWithCompany = await prisma.jobOpportunity.count({
    where: { companyId: { not: null } },
  });
  const totalOpportunities = await prisma.jobOpportunity.count();
  const personsWithCompany = await prisma.person.count({
    where: { companyId: { not: null } },
  });

  console.log(`   Companies created: ${companiesCount}`);
  console.log(`   Opportunities linked to companies: ${opportunitiesWithCompany}/${totalOpportunities}`);
  console.log(`   Persons linked to companies: ${personsWithCompany}`);

  if (opportunitiesWithCompany !== totalOpportunities) {
    throw new Error("❌ Not all opportunities are linked to companies!");
  }

  console.log("\n✨ Migration completed successfully!");
}

main()
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
