import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const mode = process.argv[2] === "source" ? "source" : "target";
const variableName = mode === "source" ? "SOURCE_DATABASE_URL" : "DATABASE_URL";
const databaseUrl = process.env[variableName];

if (!databaseUrl) {
  console.error(`${variableName} is missing or empty in .env.`);
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

function targetSummary() {
  const url = new URL(databaseUrl);
  return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
}

async function main() {
  console.log(`Counting Prisma records in ${variableName} (${targetSummary()})`);

  const counts = {
    JobOpportunity: await prisma.jobOpportunity.count(),
    Interaction: await prisma.interaction.count(),
    Note: await prisma.note.count(),
    Task: await prisma.task.count(),
    Compensation: await prisma.compensation.count(),
    CompanySizeOption: await prisma.companySizeOption.count(),
    CompanyStageOption: await prisma.companyStageOption.count(),
    DomainOption: await prisma.domainOption.count(),
    WorkModelOption: await prisma.workModelOption.count(),
    InteractionTypeOption: await prisma.interactionTypeOption.count(),
    InterviewStageOption: await prisma.interviewStageOption.count(),
    JobOpportunityDomain: await prisma.jobOpportunityDomain.count()
  };

  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
