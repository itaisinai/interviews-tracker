import type { z } from "zod";

import type { ParsedJobDescription } from "@interviews-tracker/ai";

import { opportunityInputSchema } from "../../lib/schemas.js";
import { getAiParserService } from "../ai/ai-parser-service.js";
import { createDomainOption } from "../options/option-catalog-service.js";

import { createOpportunity } from "./opportunity-service.js";

export type OpportunityTextInput = z.infer<typeof opportunityInputSchema>;

function joinLines(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export async function buildOpportunityInputFromParsedJobDescription(
  parsed: ParsedJobDescription
): Promise<OpportunityTextInput> {
  const domainIds = await Promise.all(
    parsed.company.domains
      .map((label) => label.trim())
      .filter(Boolean)
      .map(async (label) => (await createDomainOption(label)).id)
  );

  return opportunityInputSchema.parse({
    companyName: parsed.companyName ?? "Unknown company",
    roleTitle: parsed.roleTitle ?? "Software Engineer",
    pipelineType: parsed.pipelineType ?? "POTENTIAL",
    status: parsed.status ?? "RESEARCH_LEAD",
    referrerOrConnection: parsed.process.knownContact,
    source: "Telegram opportunity webhook",
    nextStep: parsed.process.suggestedNextStep,
    notes: joinLines(parsed.rawImportantNotes),
    location: parsed.company.location,
    funding: parsed.company.funding,
    companyDescription: parsed.company.companyDescription,
    productDescription: parsed.company.productDescription,
    customersTraction: parsed.company.customersTraction,
    techStack: parsed.role.techStack.join(", "),
    backendFrontendSplit: parsed.role.backendFrontendSplit,
    compensationNotes: parsed.role.compensation,
    domainIds,
  });
}

export async function createOpportunityFromText(text: string, ownerEmail?: string) {
  const parsed = await getAiParserService().parseJobDescription(text);
  const input = await buildOpportunityInputFromParsedJobDescription(parsed);

  // For webhook calls without auth, use ALLOWED_EMAIL as the owner
  const owner = ownerEmail ?? process.env.ALLOWED_EMAIL?.trim().toLowerCase();

  if (!owner) {
    throw new Error("Cannot create opportunity: no owner email provided and ALLOWED_EMAIL not configured");
  }

  return createOpportunity(input, owner);
}
