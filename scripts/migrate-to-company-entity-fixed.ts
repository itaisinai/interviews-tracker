#!/usr/bin/env tsx

/**
 * Data Migration Script: Add Company Entity (Raw SQL version)
 *
 * This version uses raw SQL queries to work with the intermediate database state
 * where old fields still exist but Company table has been created.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase();
}

function createCompanySlug(companyName: string): string {
  return normalizeCompanyName(companyName).replace(/[^a-z0-9]+/g, "-");
}

async function main() {
  console.log("🚀 Starting Company entity migration (raw SQL)...\n");

  // Step 1: Extract unique companies using raw SQL
  console.log("📊 Step 1: Extracting unique companies...");

  const opportunities: any[] = await prisma.$queryRaw`
    SELECT
      "id",
      "ownerEmail",
      "companyName",
      "companySearchName",
      "linkedinUrl",
      "location",
      "funding",
      "employeesRangeId",
      "companyStageId",
      "companyDescription",
      "productDescription",
      "customersTraction",
      "techStack",
      "backendFrontendSplit"
    FROM "JobOpportunity"
  `;

  console.log(`   Found ${opportunities.length} opportunities`);

  // Get domains for opportunities
  const opportunityDomains: any[] = await prisma.$queryRaw`
    SELECT "jobOpportunityId", "domainId"
    FROM "JobOpportunityDomain"
  `;

  const domainsByOpp = new Map<string, string[]>();
  for (const od of opportunityDomains) {
    if (!domainsByOpp.has(od.jobOpportunityId)) {
      domainsByOpp.set(od.jobOpportunityId, []);
    }
    domainsByOpp.get(od.jobOpportunityId)!.push(od.domainId);
  }

  // Group opportunities by (ownerEmail, normalized companyName)
  const companyMap = new Map<string, any>();

  for (const opp of opportunities) {
    if (!opp.companyName) {
      console.log(`⚠️  Skipping opportunity ${opp.id} - no company name`);
      continue;
    }

    const key = `${opp.ownerEmail}|||${normalizeCompanyName(opp.companyName)}`;

    if (!companyMap.has(key)) {
      const slug = createCompanySlug(opp.companyName);
      const searchName = opp.companySearchName || normalizeCompanyName(opp.companyName);
      const domains = domainsByOpp.get(opp.id) || [];

      companyMap.set(key, {
        ownerEmail: opp.ownerEmail,
        name: opp.companyName,
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
        domainIds: new Set(domains),
        opportunityIds: [opp.id],
      });
    } else {
      const existing = companyMap.get(key)!;
      existing.opportunityIds.push(opp.id);

      // Merge domain IDs
      const domains = domainsByOpp.get(opp.id) || [];
      domains.forEach((domainId) => existing.domainIds.add(domainId));

      // Merge data (prefer non-null values)
      if (!existing.linkedinUrl && opp.linkedinUrl) existing.linkedinUrl = opp.linkedinUrl;
      if (!existing.location && opp.location) existing.location = opp.location;
      if (!existing.funding && opp.funding) existing.funding = opp.funding;
      if (!existing.employeesRangeId && opp.employeesRangeId) existing.employeesRangeId = opp.employeesRangeId;
      if (!existing.companyStageId && opp.companyStageId) existing.companyStageId = opp.companyStageId;
      if (!existing.description && opp.companyDescription) existing.description = opp.companyDescription;
      if (!existing.productDescription && opp.productDescription) existing.productDescription = opp.productDescription;
      if (!existing.customersTraction && opp.customersTraction) existing.customersTraction = opp.customersTraction;
      if (!existing.techStack && opp.techStack) existing.techStack = opp.techStack;
      if (!existing.backendFrontendSplit && opp.backendFrontendSplit) existing.backendFrontendSplit = opp.backendFrontendSplit;
    }
  }

  console.log(`   Identified ${companyMap.size} unique companies\n`);

  // Step 2: Create Company records
  console.log("📝 Step 2: Creating Company records...");

  const companyIdMap = new Map<string, string>(); // key -> company ID

  for (const [key, company] of companyMap.entries()) {
    try {
      // Generate cuid-like ID
      const companyId = `c${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

      await prisma.$executeRaw`
        INSERT INTO "Company" (
          "id", "ownerEmail", "slug", "name", "searchName",
          "linkedinUrl", "location", "funding",
          "employeesRangeId", "companyStageId",
          "description", "productDescription", "customersTraction",
          "techStack", "backendFrontendSplit",
          "isWatchlisted", "createdAt", "updatedAt"
        ) VALUES (
          ${companyId}, ${company.ownerEmail}, ${company.slug}, ${company.name}, ${company.searchName},
          ${company.linkedinUrl}, ${company.location}, ${company.funding},
          ${company.employeesRangeId}, ${company.companyStageId},
          ${company.description}, ${company.productDescription}, ${company.customersTraction},
          ${company.techStack}, ${company.backendFrontendSplit},
          false, NOW(), NOW()
        )
      `;

      companyIdMap.set(key, companyId);

      // Create CompanyDomain records
      for (const domainId of company.domainIds) {
        await prisma.$executeRaw`
          INSERT INTO "CompanyDomain" ("ownerEmail", "companyId", "domainId")
          VALUES (${company.ownerEmail}, ${companyId}, ${domainId})
        `;
      }

      console.log(`   ✓ Created company: ${company.name} (${company.opportunityIds.length} opportunities)`);
    } catch (error) {
      console.error(`   ✗ Failed to create company: ${company.name}`, error);
      throw error;
    }
  }

  console.log(`\n   Created ${companyIdMap.size} companies\n`);

  // Step 3: Update JobOpportunity records with companyId
  console.log("🔗 Step 3: Linking opportunities to companies...");

  let updated = 0;
  for (const [key, company] of companyMap.entries()) {
    const companyId = companyIdMap.get(key);
    if (!companyId) {
      console.error(`   ✗ No company ID found for key: ${key}`);
      continue;
    }

    for (const oppId of company.opportunityIds) {
      await prisma.$executeRaw`
        UPDATE "JobOpportunity"
        SET "companyId" = ${companyId}
        WHERE "id" = ${oppId}
      `;
      updated++;
    }
  }

  console.log(`   Updated ${updated} opportunities\n`);

  // Step 4: Migrate Person records
  console.log("👤 Step 4: Migrating Person records...");

  const people: any[] = await prisma.$queryRaw`
    SELECT "id", "jobOpportunityId", "ownerEmail"
    FROM "Person"
    WHERE "jobOpportunityId" IS NOT NULL
  `;

  let peopleUpdated = 0;
  for (const person of people) {
    // Get the opportunity's companyId
    const opp: any[] = await prisma.$queryRaw`
      SELECT "companyId" FROM "JobOpportunity"
      WHERE "id" = ${person.jobOpportunityId}
    `;

    if (opp.length > 0 && opp[0].companyId) {
      await prisma.$executeRaw`
        UPDATE "Person"
        SET "companyId" = ${opp[0].companyId}
        WHERE "id" = ${person.id}
      `;
      peopleUpdated++;
    }
  }

  console.log(`   Updated ${peopleUpdated} person records\n`);

  // Step 5: Verify
  console.log("✅ Step 5: Verifying migration...");

  const companiesCount: any[] = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Company"`;
  const oppsWithCompany: any[] = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "JobOpportunity" WHERE "companyId" IS NOT NULL`;
  const oppsWithoutCompany: any[] = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "JobOpportunity" WHERE "companyId" IS NULL`;

  console.log(`   Companies created: ${companiesCount[0].count}`);
  console.log(`   Opportunities linked: ${oppsWithCompany[0].count}`);
  console.log(`   Opportunities unlinked: ${oppsWithoutCompany[0].count}`);

  if (Number(oppsWithoutCompany[0].count) > 0) {
    throw new Error("Some opportunities were not linked to companies!");
  }

  console.log("\n✨ Migration completed successfully!\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
