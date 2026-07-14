/**
 * Tool: Get Opportunities By Status
 * Fetches opportunities filtered by pipeline type
 */

import type { Prisma } from "@prisma/client";

import { prisma } from "../../../lib/prisma.js";

export interface OpportunitySummary {
  id: string;
  slug: string | null;
  companyName: string;
  roleTitle: string | null;
  status: string;
  pipelineType: string;
  nextStep: string | null;
  interactionCount: number;
  nextScheduledInteraction: {
    date: string;
    type: string;
    stage: string | null;
  } | null;
  updatedAt: string;
}

export async function getOpportunitiesByStatus(
  ownerEmail: string,
  pipelineType?: "ACTIVE_PROCESS" | "POTENTIAL" | "ARCHIVED"
): Promise<OpportunitySummary[]> {
  const where: Prisma.JobOpportunityWhereInput = {
    ownerEmail,
  };

  if (pipelineType) {
    where.pipelineType = pipelineType;
  }

  const opportunities = await prisma.jobOpportunity.findMany({
    where,
    include: {
      company: {
        select: {
          name: true,
        },
      },
      interactions: {
        where: {
          status: "SCHEDULED",
          date: {
            gte: new Date(),
          },
        },
        orderBy: {
          date: "asc",
        },
        take: 1,
        select: {
          date: true,
          type: true,
          stage: true,
        },
      },
      _count: {
        select: {
          interactions: true,
        },
      },
    },
    orderBy: [{ pipelineType: "asc" }, { updatedAt: "desc" }],
  });

  return opportunities.map((opp) => ({
    id: opp.id,
    slug: opp.slug,
    companyName: opp.company.name,
    roleTitle: opp.roleTitle,
    status: opp.status,
    pipelineType: opp.pipelineType,
    nextStep: opp.nextStep,
    interactionCount: opp._count.interactions,
    nextScheduledInteraction: opp.interactions[0]
      ? {
          date: opp.interactions[0].date.toISOString(),
          type: opp.interactions[0].type,
          stage: opp.interactions[0].stage,
        }
      : null,
    updatedAt: opp.updatedAt.toISOString(),
  }));
}

export const getOpportunitiesByStatusTool = {
  type: "function" as const,
  function: {
    name: "getOpportunitiesByStatus",
    description:
      "Get opportunities filtered by pipeline status. Use this when user asks about active processes, potential opportunities, or archived ones.",
    parameters: {
      type: "object",
      properties: {
        pipelineType: {
          type: "string",
          enum: ["ACTIVE_PROCESS", "POTENTIAL", "ARCHIVED"],
          description:
            "Filter by pipeline type. ACTIVE_PROCESS = currently interviewing, POTENTIAL = considering but not yet applied, ARCHIVED = rejected or closed",
        },
      },
      required: [],
    },
  },
};
