/**
 * Tool: Get Interaction Details
 * Fetches full details of a specific interaction including participants
 */

import { prisma } from "../../../lib/prisma.js";

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

export async function getInteractionDetails(
  interactionId: string
): Promise<InteractionDetails | null> {
  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
    include: {
      jobOpportunity: {
        select: {
          id: true,
          roleTitle: true,
          company: {
            select: {
              name: true,
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

  // Add company contacts (avoiding duplicates by name)
  const existingNames = new Set(participants.map(p => p.name.toLowerCase()));
  for (const contact of interaction.jobOpportunity.company.contacts) {
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
    companyName: interaction.jobOpportunity.company.name,
    roleTitle: interaction.jobOpportunity.roleTitle,
    opportunityId: interaction.jobOpportunity.id,
    participants
  };
}

export const getInteractionDetailsTool = {
  type: "function" as const,
  function: {
    name: "getInteractionDetails",
    description: "Get full details of a specific interaction including participants, agenda, notes, and outcome. Use this when user asks about participants, details, or specifics of an interaction.",
    parameters: {
      type: "object",
      properties: {
        interactionId: {
          type: "string",
          description: "The ID of the interaction to get details for"
        }
      },
      required: ["interactionId"]
    }
  }
};
