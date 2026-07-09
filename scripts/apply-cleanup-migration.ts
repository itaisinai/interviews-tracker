#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Applying cleanup migration...\n");

  try {
    // Step 1: Make companyId NOT NULL
    console.log("1️⃣  Making companyId required...");
    await prisma.$executeRaw`ALTER TABLE "JobOpportunity" ALTER COLUMN "companyId" SET NOT NULL`;
    console.log("   ✓ Done\n");

    // Step 2: Add foreign key constraints
    console.log("2️⃣  Adding foreign key constraints...");

    try {
      await prisma.$executeRaw`ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE`;
      console.log("   ✓ JobOpportunity.companyId FK added");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42710") {
        console.log("   ⊙ JobOpportunity.companyId FK already exists");
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
      console.log("   ✓ Note.companyId FK added");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42710") {
        console.log("   ⊙ Note.companyId FK already exists");
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
      console.log("   ✓ Task.companyId FK added");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42710") {
        console.log("   ⊙ Task.companyId FK already exists");
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`;
      console.log("   ✓ Person.companyId FK added");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42710") {
        console.log("   ⊙ Person.companyId FK already exists");
      } else {
        throw e;
      }
    }
    console.log("");

    // Step 3: Drop old unique constraint (if it exists)
    console.log("3️⃣  Dropping old unique constraint...");
    try {
      await prisma.$executeRaw`ALTER TABLE "JobOpportunity" DROP CONSTRAINT "JobOpportunity_ownerEmail_companyName_roleTitle_key"`;
      console.log("   ✓ Old constraint dropped\n");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42704") {
        console.log("   ⊙ Constraint already removed\n");
      } else {
        throw e;
      }
    }

    // Step 4: Add new unique constraint
    console.log("4️⃣  Adding new unique constraint...");
    try {
      await prisma.$executeRaw`CREATE UNIQUE INDEX "JobOpportunity_ownerEmail_companyId_roleTitle_key" ON "JobOpportunity"("ownerEmail", "companyId", "roleTitle")`;
      console.log("   ✓ New constraint added\n");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42P07") {
        console.log("   ⊙ Constraint already exists\n");
      } else {
        throw e;
      }
    }

    // Step 5: Drop old columns
    console.log("5️⃣  Dropping deprecated columns from JobOpportunity...");
    const columnsToDropFromOpp = [
      "companyName",
      "companySearchName",
      "employeesRangeId",
      "companyStageId",
      "location",
      "funding",
      "companyDescription",
      "productDescription",
      "customersTraction",
      "techStack",
      "backendFrontendSplit",
    ];

    for (const col of columnsToDropFromOpp) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "JobOpportunity" DROP COLUMN "${col}"`);
        console.log(`   ✓ Dropped ${col}`);
      } catch (e: any) {
        if (e.code === "P2010" && e.meta?.code === "42703") {
          console.log(`   ⊙ ${col} already dropped`);
        } else {
          throw e;
        }
      }
    }
    console.log("");

    // Step 6: Drop old columns from Person
    console.log("6️⃣  Dropping deprecated columns from Person...");
    try {
      await prisma.$executeRaw`ALTER TABLE "Person" DROP COLUMN "jobOpportunityId"`;
      console.log("   ✓ Dropped jobOpportunityId");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42703") {
        console.log("   ⊙ jobOpportunityId already dropped");
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRaw`ALTER TABLE "Person" DROP COLUMN "company"`;
      console.log("   ✓ Dropped company");
    } catch (e: any) {
      if (e.code === "P2010" && e.meta?.code === "42703") {
        console.log("   ⊙ company already dropped");
      } else {
        throw e;
      }
    }
    console.log("");

    // Step 7: Drop old indexes
    console.log("7️⃣  Dropping old Person indexes...");
    const indexesToDrop = [
      "Person_name_company_idx",
      "Person_jobOpportunityId_idx",
      "Person_name_jobOpportunityId_idx",
    ];

    for (const idx of indexesToDrop) {
      try {
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx}"`);
        console.log(`   ✓ Dropped ${idx}`);
      } catch (e: any) {
        console.log(`   ⊙ ${idx} already dropped or doesn't exist`);
      }
    }
    console.log("");

    console.log("✨ Cleanup migration completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Cleanup migration failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
