/**
 * OpenAI function definitions for telegram query answering
 * These tools allow the AI to fetch specific data it needs
 */

export const telegramQueryTools = [
  {
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
  },
  {
    type: "function" as const,
    function: {
      name: "getOpportunitiesByStatus",
      description: "Get opportunities filtered by pipeline status. Use this when user asks about active processes, potential opportunities, or archived ones.",
      parameters: {
        type: "object",
        properties: {
          pipelineType: {
            type: "string",
            enum: ["ACTIVE_PROCESS", "POTENTIAL", "ARCHIVED"],
            description: "Filter by pipeline type. ACTIVE_PROCESS = currently interviewing, POTENTIAL = considering but not yet applied, ARCHIVED = rejected or closed"
          }
        },
        required: []
      }
    }
  },
  {
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
  },
  {
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
  },
  {
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
  }
];

export type ToolName =
  | "getNextInteractions"
  | "getOpportunitiesByStatus"
  | "getInteractionDetails"
  | "searchOpportunities"
  | "getNextInteractionForCompany";

export interface ToolCall {
  id: string;
  name: ToolName;
  arguments: Record<string, unknown>;
}
