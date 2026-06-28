/**
 * Telegram Query Tools - Index
 * Exports all tools and their schemas
 */

export { getNextInteractions, getNextInteractionsTool, type NextInteraction } from "./get-next-interactions.js";
export { getOpportunitiesByStatus, getOpportunitiesByStatusTool, type OpportunitySummary } from "./get-opportunities-by-status.js";
export { getInteractionDetails, getInteractionDetailsTool, type InteractionDetails } from "./get-interaction-details.js";
export { searchOpportunities, searchOpportunitiesTool } from "./search-opportunities.js";
export { getNextInteractionForCompany, getNextInteractionForCompanyTool } from "./get-next-interaction-for-company.js";

// All tool schemas for OpenAI function calling
export const allTools = [
  getNextInteractionsTool,
  getOpportunitiesByStatusTool,
  getInteractionDetailsTool,
  searchOpportunitiesTool,
  getNextInteractionForCompanyTool
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
