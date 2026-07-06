import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createPersonSlug, appendSlugCollisionSuffix } from "@interviews-tracker/core";

/**
 * Generate a unique slug for a Person
 * Format: {name-slug} or {name-slug}-{counter}
 */
export async function generateUniquePersonSlug(
  name: string,
  ownerEmail: string,
  tx: Prisma.TransactionClient = prisma
): Promise<string> {
  const baseSlug = createPersonSlug(name);

  // Find existing persons with similar slugs
  const existingSlugs = await tx.person.findMany({
    where: {
      ownerEmail,
      slug: {
        startsWith: baseSlug
      }
    },
    select: { slug: true }
  });

  // If no collisions, use base slug
  if (existingSlugs.length === 0) {
    return baseSlug;
  }

  // Find the next available counter
  const slugSet = new Set(existingSlugs.map(p => p.slug));
  let counter = 1;
  let candidateSlug = baseSlug;

  while (slugSet.has(candidateSlug)) {
    counter++;
    candidateSlug = appendSlugCollisionSuffix(baseSlug, counter);
  }

  return candidateSlug;
}

/**
 * Create a new Person with auto-generated slug
 */
export async function createPersonWithSlug(
  data: {
    name: string;
    ownerEmail: string;
    email?: string | null;
    linkedinUrl?: string | null;
    title?: string | null;
    company?: string | null;
    avatarUrl?: string | null;
    jobOpportunityId?: string | null;
  }
) {
  return await prisma.$transaction(async (tx) => {
    const slug = await generateUniquePersonSlug(data.name, data.ownerEmail, tx);

    return await tx.person.create({
      data: {
        ...data,
        slug,
      },
      include: { research: true }
    });
  });
}

/**
 * Find Person by slug
 */
export async function findPersonBySlug(
  slug: string,
  ownerEmail: string
) {
  return await prisma.person.findUnique({
    where: {
      ownerEmail_slug: {
        ownerEmail,
        slug
      }
    },
    include: { research: true }
  });
}
