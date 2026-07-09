/**
 * Telegram Query Tools - Index
 * Exports all tools and their schemas
 */

import { getInteractionDetailsTool } from "./get-interaction-details.js";
import { getNextInteractionForCompanyTool } from "./get-next-interaction-for-company.js";
import { getNextInteractionsTool } from "./get-next-interactions.js";
import { getOpportunitiesByStatusTool } from "./get-opportunities-by-status.js";
import { searchOpportunitiesTool } from "./search-opportunities.js";

export {
  getInteractionDetails,
  getInteractionDetailsTool,
  type InteractionDetails,
} from "./get-interaction-details.js";
export { getNextInteractionForCompany, getNextInteractionForCompanyTool } from "./get-next-interaction-for-company.js";
export { getNextInteractions, getNextInteractionsTool, type NextInteraction } from "./get-next-interactions.js";
export {
  getOpportunitiesByStatus,
  getOpportunitiesByStatusTool,
  type OpportunitySummary,
} from "./get-opportunities-by-status.js";
export { searchOpportunities, searchOpportunitiesTool } from "./search-opportunities.js";

// All tool schemas for OpenAI function calling
export const allTools = [
  getNextInteractionsTool,
  getOpportunitiesByStatusTool,
  getInteractionDetailsTool,
  searchOpportunitiesTool,
  getNextInteractionForCompanyTool,
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
