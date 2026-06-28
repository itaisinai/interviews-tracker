/**
 * Telegram query repository - Specialized data access for bot queries
 * Provides focused functions that return exactly what the AI needs
 */

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";

export interface NextInteraction {
  id: string;
  date: string;
  endDate: string | null;
  type: string;
  stage: string | null;
  status: string;
  personName: string | null;
  personRole: string | null;
  agenda: string | null;
  notes: string | null;
  meetingLink: string | null;
  companyName: string;
  roleTitle: string | null;
  opportunityId: string;
  opportunitySlug: string | null;
}

export interface OpportunitySummary {
  id: string;
  slug: string | null;
  companyName: string;
  roleTitle: string | null;
  status: string;
  pipelineType: string;
  priority: string | null;
  nextStep: string | null;
  interactionCount: number;
  nextScheduledInteraction: {
    date: string;
    type: string;
    stage: string | null;
  } | null;
  updatedAt: string;
}

export interface InteractionDetails {
  id: string;
  date: string;
  endDate: string | null;
  type: string;
  stage: string | null;
  status: string;
  personName: string | null;
  personRole: string | null;
  agenda: string | null;
  notes: string | null;
  outcome: string | null;
  followUp: string | null;
  meetingLink: string | null;
  companyName: string;
  roleTitle: string | null;
  opportunityId: string;
  participants: Array<{
    name: string;
    title: string | null;
    email: string | null;
  }>;
}

/**
 * Get upcoming scheduled interactions sorted by date
 */
export async function getNextInteractions(
  ownerEmail: string,
  limit: number = 10,
  fromDate?: Date
): Promise<NextInteraction[]> {
  const startDate = fromDate ?? new Date();

  const interactions = await prisma.interaction.findMany({
    where: {
      jobOpportunity: {
        ownerEmail
      },
      status: "SCHEDULED",
      date: {
        gte: startDate
      }
    },
    include: {
      jobOpportunity: {
        select: {
          id: true,
          slug: true,
          companyName: true,
          roleTitle: true
        }
      }
    },
    orderBy: {
      date: "asc"
    },
    take: limit
  });

  return interactions.map(interaction => ({
    id: interaction.id,
    date: interaction.date.toISOString(),
    endDate: interaction.endDate?.toISOString() ?? null,
    type: interaction.type,
    stage: interaction.stage,
    status: interaction.status,
    personName: interaction.personName,
    personRole: interaction.personRole,
    agenda: interaction.agenda,
    notes: interaction.notes,
    meetingLink: interaction.meetingLink,
    companyName: interaction.jobOpportunity.companyName,
    roleTitle: interaction.jobOpportunity.roleTitle,
    opportunityId: interaction.jobOpportunity.id,
    opportunitySlug: interaction.jobOpportunity.slug
  }));
}

/**
 * Get opportunities filtered by pipeline type/status
 */
export async function getOpportunitiesByStatus(
  ownerEmail: string,
  pipelineType?: "ACTIVE_PROCESS" | "POTENTIAL" | "ARCHIVED"
): Promise<OpportunitySummary[]> {
  const where: Prisma.JobOpportunityWhereInput = {
    ownerEmail
  };

  if (pipelineType) {
    where.pipelineType = pipelineType;
  }

  const opportunities = await prisma.jobOpportunity.findMany({
    where,
    include: {
      interactions: {
        where: {
          status: "SCHEDULED",
          date: {
            gte: new Date()
          }
        },
        orderBy: {
          date: "asc"
        },
        take: 1,
        select: {
          date: true,
          type: true,
          stage: true
        }
      },
      _count: {
        select: {
          interactions: true
        }
      }
    },
    orderBy: [
      { pipelineType: "asc" },
      { updatedAt: "desc" }
    ]
  });

  return opportunities.map(opp => ({
    id: opp.id,
    slug: opp.slug,
    companyName: opp.companyName,
    roleTitle: opp.roleTitle,
    status: opp.status,
    pipelineType: opp.pipelineType,
    priority: opp.priority,
    nextStep: opp.nextStep,
    interactionCount: opp._count.interactions,
    nextScheduledInteraction: opp.interactions[0] ? {
      date: opp.interactions[0].date.toISOString(),
      type: opp.interactions[0].type,
      stage: opp.interactions[0].stage
    } : null,
    updatedAt: opp.updatedAt.toISOString()
  }));
}

/**
 * Get full details of a specific interaction including participants
 */
export async function getInteractionDetails(
  interactionId: string
): Promise<InteractionDetails | null> {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      jobOpportunity: {
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          contacts: {
            select: {
              name: true,
              title: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!interaction) {
    return null;
  }

  // Collect participants from personName and contacts
  const participants: Array<{ name: string; title: string | null; email: string | null }> = [];

  // Add the primary person if exists
  if (interaction.personName) {
    participants.push({
      name: interaction.personName,
      title: interaction.personRole,
      email: null
    });
  }

  // Add opportunity contacts (avoiding duplicates by name)
  const existingNames = new Set(participants.map(p => p.name.toLowerCase()));
  for (const contact of interaction.jobOpportunity.contacts) {
    if (!existingNames.has(contact.name.toLowerCase())) {
      participants.push({
        name: contact.name,
        title: contact.title,
        email: contact.email
      });
    }
  }

  return {
    id: interaction.id,
    date: interaction.date.toISOString(),
    endDate: interaction.endDate?.toISOString() ?? null,
    type: interaction.type,
    stage: interaction.stage,
    status: interaction.status,
    personName: interaction.personName,
    personRole: interaction.personRole,
    agenda: interaction.agenda,
    notes: interaction.notes,
    outcome: interaction.outcome,
    followUp: interaction.followUp,
    meetingLink: interaction.meetingLink,
    companyName: interaction.jobOpportunity.companyName,
    roleTitle: interaction.jobOpportunity.roleTitle,
    opportunityId: interaction.jobOpportunity.id,
    participants
  };
}

/**
 * Search opportunities by company name
 */
export async function searchOpportunities(
  ownerEmail: string,
  searchTerm: string
): Promise<OpportunitySummary[]> {
  const opportunities = await prisma.jobOpportunity.findMany({
    where: {
      ownerEmail,
      companyName: {
        contains: searchTerm,
        mode: "insensitive"
      }
    },
    include: {
      interactions: {
        where: {
          status: "SCHEDULED",
          date: {
            gte: new Date()
          }
        },
        orderBy: {
          date: "asc"
        },
        take: 1,
        select: {
          date: true,
          type: true,
          stage: true
        }
      },
      _count: {
        select: {
          interactions: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return opportunities.map(opp => ({
    id: opp.id,
    slug: opp.slug,
    companyName: opp.companyName,
    roleTitle: opp.roleTitle,
    status: opp.status,
    pipelineType: opp.pipelineType,
    priority: opp.priority,
    nextStep: opp.nextStep,
    interactionCount: opp._count.interactions,
    nextScheduledInteraction: opp.interactions[0] ? {
      date: opp.interactions[0].date.toISOString(),
      type: opp.interactions[0].type,
      stage: opp.interactions[0].stage
    } : null,
    updatedAt: opp.updatedAt.toISOString()
  }));
}

/**
 * Get next interaction for a specific company
 */
export async function getNextInteractionForCompany(
  ownerEmail: string,
  companyName: string
): Promise<NextInteraction | null> {
  const interaction = await prisma.interaction.findFirst({
    where: {
      jobOpportunity: {
        ownerEmail,
        companyName: {
          contains: companyName,
          mode: "insensitive"
        }
      },
      status: "SCHEDULED",
      date: {
        gte: new Date()
      }
    },
    include: {
      jobOpportunity: {
        select: {
          id: true,
          slug: true,
          companyName: true,
          roleTitle: true
        }
      }
    },
    orderBy: {
      date: "asc"
    }
  });

  if (!interaction) {
    return null;
  }

  return {
    id: interaction.id,
    date: interaction.date.toISOString(),
    endDate: interaction.endDate?.toISOString() ?? null,
    type: interaction.type,
    stage: interaction.stage,
    status: interaction.status,
    personName: interaction.personName,
    personRole: interaction.personRole,
    agenda: interaction.agenda,
    notes: interaction.notes,
    meetingLink: interaction.meetingLink,
    companyName: interaction.jobOpportunity.companyName,
    roleTitle: interaction.jobOpportunity.roleTitle,
    opportunityId: interaction.jobOpportunity.id,
    opportunitySlug: interaction.jobOpportunity.slug
  };
}
