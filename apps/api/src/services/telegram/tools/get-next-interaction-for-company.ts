/**
 * Tool: Get Next Interaction For Company
 * Get the next scheduled interaction for a specific company
 */

import { prisma } from "../../../lib/prisma.js";
import type { NextInteraction } from "./get-next-interactions.js";

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

export const getNextInteractionForCompanyTool = {
  type: "function" as const,
  function: {
    name: "getNextInteractionForCompany",
    description: "Get the next scheduled interaction for a specific company. Use this when user asks about next interaction/meeting/interview with a specific company.",
    parameters: {
      type: "object",
      properties: {
        companyName: {
          type: "string",
          description: "Company name to find next interaction for"
        }
      },
      required: ["companyName"]
    }
  }
};
