/**
 * Tool: Search Opportunities
 * Search opportunities by company name
 */

import { prisma } from "../../../lib/prisma.js";
import type { OpportunitySummary } from "./get-opportunities-by-status.js";

export async function searchOpportunities(
  ownerEmail: string,
  searchTerm: string
): Promise<OpportunitySummary[]> {
  const opportunities = await prisma.jobOpportunity.findMany({
    where: {
      ownerEmail,
      company: {
        name: {
          contains: searchTerm,
          mode: "insensitive"
        }
      }
    },
    include: {
      company: {
        select: {
          name: true
        }
      },
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
    companyName: opp.company.name,
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

export const searchOpportunitiesTool = {
  type: "function" as const,
  function: {
    name: "searchOpportunities",
    description: "Search opportunities by company name. Use this when user asks about a specific company or mentions a company name.",
    parameters: {
      type: "object",
      properties: {
        companyName: {
          type: "string",
          description: "Company name to search for (case-insensitive partial match)"
        }
      },
      required: ["companyName"]
    }
  }
};
