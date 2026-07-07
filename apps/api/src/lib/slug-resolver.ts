import { prisma } from "./prisma.js";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Resolve Opportunity slug to internal database ID
 * @throws NotFoundError if opportunity not found or not owned by user
 */
export async function resolveOpportunitySlug(
  slug: string,
  ownerEmail: string
): Promise<string> {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: {
      ownerEmail_slug: {
        ownerEmail,
        slug
      }
    },
    select: { id: true }
  });

  if (!opportunity) {
    throw new NotFoundError(`Opportunity '${slug}' not found`);
  }

  return opportunity.id;
}

/**
 * Resolve Interaction slug to internal database ID
 * @throws NotFoundError if interaction not found or not owned by user
 */
export async function resolveInteractionSlug(
  slug: string,
  ownerEmail: string
): Promise<string> {
  const interaction = await prisma.interaction.findUnique({
    where: {
      ownerEmail_slug: {
        ownerEmail,
        slug
      }
    },
    select: { id: true }
  });

  if (!interaction) {
    throw new NotFoundError(`Interaction '${slug}' not found`);
  }

  return interaction.id;
}

/**
 * Resolve Person slug to internal database ID
 * @throws NotFoundError if person not found or not owned by user
 */
export async function resolvePersonSlug(
  slug: string,
  ownerEmail: string
): Promise<string> {
  const person = await prisma.person.findUnique({
    where: {
      ownerEmail_slug: {
        ownerEmail,
        slug
      }
    },
    select: { id: true }
  });

  if (!person) {
    throw new NotFoundError(`Person '${slug}' not found`);
  }

  return person.id;
}

/**
 * Batch resolve Opportunity slugs to IDs
 * More efficient than calling resolveOpportunitySlug in a loop
 */
export async function batchResolveOpportunitySlugs(
  slugs: string[],
  ownerEmail: string
): Promise<Map<string, string>> {
  const opportunities = await prisma.jobOpportunity.findMany({
    where: {
      ownerEmail,
      slug: {
        in: slugs
      }
    },
    select: { slug: true, id: true }
  });

  return new Map(opportunities.map(o => [o.slug, o.id]));
}
