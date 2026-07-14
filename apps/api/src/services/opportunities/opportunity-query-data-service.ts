import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

/**
 * Fetches opportunities data for telegram query answering
 * Returns a simplified structure optimized for AI processing
 */
export async function getOpportunitiesDataForQuery(ownerEmail: string) {
  const opportunities = await prisma.jobOpportunity.findMany({
    where: {
      ownerEmail,
      // Focus on active and potential opportunities, exclude archived
      pipelineType: {
        in: ["ACTIVE_PROCESS", "POTENTIAL"],
      },
    },
    include: {
      company: {
        include: {
          contacts: {
            select: {
              id: true,
              name: true,
              title: true,
              email: true,
            },
          },
        },
      },
      interactions: {
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          endDate: true,
          type: true,
          stage: true,
          status: true,
          personName: true,
          personRole: true,
          agenda: true,
          notes: true,
          meetingLink: true,
        },
      },
    },
    orderBy: [
      { pipelineType: "asc" }, // ACTIVE_PROCESS first
      { updatedAt: "desc" },
    ],
  });

  // Transform to a simpler structure for AI
  return opportunities.map((opp) => ({
    id: opp.id,
    slug: opp.slug,
    companyName: opp.company.name,
    roleTitle: opp.roleTitle,
    status: opp.status,
    pipelineType: opp.pipelineType,
    nextStep: opp.nextStep,
    interactions: opp.interactions.map((interaction) => ({
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
    })),
    contacts: opp.company.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      title: contact.title,
      email: contact.email,
    })),
    updatedAt: opp.updatedAt.toISOString(),
  }));
}

/**
 * Formats opportunities data as JSON string for AI prompt
 */
export async function formatOpportunitiesForAI(ownerEmail: string): Promise<string> {
  const opportunities = await getOpportunitiesDataForQuery(ownerEmail);

  if (opportunities.length === 0) {
    return JSON.stringify(
      {
        message: "No active or potential opportunities found.",
        opportunities: [],
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      totalOpportunities: opportunities.length,
      opportunities,
    },
    null,
    2
  );
}
