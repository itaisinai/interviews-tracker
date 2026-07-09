import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all duplicate groups
  const duplicates = await prisma.$queryRaw<Array<{ name: string; jobOpportunityId: string; count: bigint }>>`
    SELECT name, "jobOpportunityId", COUNT(*) as count
    FROM "Person"
    WHERE "jobOpportunityId" IS NOT NULL
    GROUP BY name, "jobOpportunityId"
    HAVING COUNT(*) > 1
  `;

  console.log(`Found ${duplicates.length} duplicate groups\n`);

  for (const dup of duplicates) {
    const records = await prisma.person.findMany({
      where: {
        name: dup.name,
        jobOpportunityId: dup.jobOpportunityId,
      },
      include: {
        research: true,
        jobOpportunity: {
          select: {
            companyName: true,
            roleTitle: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`\n=== ${dup.name} (${records[0].jobOpportunity?.companyName}) ===`);

    // Strategy: Keep the one with research if only one has it, otherwise keep the most recent
    const withResearch = records.filter((r) => r.research);

    let toKeep;
    if (withResearch.length === 1) {
      toKeep = withResearch[0];
      console.log(`Keeping: ID ${toKeep.id} (has research)`);
    } else {
      toKeep = records[records.length - 1]; // Most recent
      console.log(`Keeping: ID ${toKeep.id} (most recent)`);
    }

    const toDelete = records.filter((r) => r.id !== toKeep.id);

    for (const record of toDelete) {
      console.log(`Deleting: ID ${record.id} - ${record.title} at ${record.company}`);
      await prisma.person.delete({
        where: { id: record.id },
      });
    }
  }

  console.log("\n✅ Duplicates resolved");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
