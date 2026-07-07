/**
 * Tool: Get Next Interactions
 * Fetches upcoming scheduled interactions sorted by date
 */

import { prisma } from "../../../lib/prisma.js";

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
          roleTitle: true,
          company: {
            select: {
              name: true
            }
          }
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
    companyName: interaction.jobOpportunity.company.name,
    roleTitle: interaction.jobOpportunity.roleTitle,
    opportunityId: interaction.jobOpportunity.id,
    opportunitySlug: interaction.jobOpportunity.slug
  }));
}

export const getNextInteractionsTool = {
  type: "function" as const,
  function: {
    name: "getNextInteractions",
    description: "Get upcoming scheduled interactions (interviews, calls, meetings) sorted by date. Use this when the user asks about next/upcoming interactions, meetings, or interviews.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of interactions to return (default: 10)",
          default: 10
        }
      },
      required: []
    }
  }
};
