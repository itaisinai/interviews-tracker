import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  // Find Rotem Zikorel records
  console.log('\n=== Rotem Zikorel Records ===');
  const rotemRecords = await prisma.person.findMany({
    where: { name: 'Rotem Zikorel' },
    include: {
      jobOpportunity: true,
      research: true
    },
    orderBy: { createdAt: 'asc' }
  });

  for (const person of rotemRecords) {
    console.log('\n---');
    console.log('ID:', person.id);
    console.log('Name:', person.name);
    console.log('Title:', person.title);
    console.log('Company:', person.company);
    console.log('Email:', person.email);
    console.log('LinkedIn:', person.linkedinUrl);
    console.log('Created:', person.createdAt);
    console.log('Opportunity:', person.jobOpportunity?.companyName, '-', person.jobOpportunity?.roleTitle);
    console.log('Has Research:', !!person.research);
  }

  // Find all duplicate persons (same name, same opportunity)
  console.log('\n\n=== All Duplicate Contacts (same name, same opportunity) ===');
  const allPersons = await prisma.person.findMany({
    where: { jobOpportunityId: { not: null } },
    include: { jobOpportunity: true },
    orderBy: [{ jobOpportunityId: 'asc' }, { name: 'asc' }]
  });

  const grouped = new Map<string, typeof allPersons>();
  for (const person of allPersons) {
    const key = `${person.jobOpportunityId}:${person.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(person);
  }

  let foundDuplicates = false;
  for (const [key, persons] of grouped.entries()) {
    if (persons.length > 1) {
      foundDuplicates = true;
      console.log('\n---');
      console.log('Duplicate found:', persons[0].name);
      console.log('Opportunity:', persons[0].jobOpportunity?.companyName, '-', persons[0].jobOpportunity?.roleTitle);
      for (const person of persons) {
        console.log('  -', person.id, '|', person.title, '|', person.company, '| created:', person.createdAt);
      }
    }
  }

  if (!foundDuplicates) {
    console.log('No duplicates found!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
