#!/usr/bin/env node
/**
 * One-time migration: Archive all rejected opportunities
 *
 * Finds opportunities with status=REJECTED and pipelineType!=ARCHIVED,
 * then updates them to pipelineType=ARCHIVED.
 */

import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("[MIGRATION] Starting rejected opportunities migration...");

  // Find all rejected opportunities that are not archived
  const rejectedOpportunities = await prisma.jobOpportunity.findMany({
    where: {
      status: "REJECTED",
      pipelineType: {
        not: "ARCHIVED",
      },
    },
    select: {
      id: true,
      companyName: true,
      roleTitle: true,
      status: true,
      pipelineType: true,
      ownerEmail: true,
    },
  });

  console.log(`[MIGRATION] Found ${rejectedOpportunities.length} rejected opportunities to archive`);

  if (rejectedOpportunities.length === 0) {
    console.log("[MIGRATION] ✅ No opportunities to migrate");
    return;
  }

  // Show what will be updated
  console.log("\n[MIGRATION] Will archive:");
  rejectedOpportunities.forEach((opp) => {
    console.log(`  - ${opp.companyName} (${opp.roleTitle}) - ${opp.pipelineType} → ARCHIVED`);
  });

  // Update all to ARCHIVED
  const result = await prisma.jobOpportunity.updateMany({
    where: {
      id: {
        in: rejectedOpportunities.map((o) => o.id),
      },
    },
    data: {
      pipelineType: "ARCHIVED",
    },
  });

  console.log(`\n[MIGRATION] ✅ Updated ${result.count} opportunities to ARCHIVED`);
  console.log("[MIGRATION] Migration complete!");
}

main()
  .catch((error) => {
    console.error("[MIGRATION] ❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
