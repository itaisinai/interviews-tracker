import { z } from "zod";

import { prisma } from "../../lib/prisma.js";
import { personResearchInputSchema, personResearchResultSchema } from "../../lib/schemas.js";

import { ExaProvider } from "./exa-provider.js";
import { llmPersonResearch } from "./person-research-llm-fallback.js";

export type PersonResearchInput = z.infer<typeof personResearchInputSchema>;
export type PersonResearchResult = z.infer<typeof personResearchResultSchema>;

/**
 * Extract person name from email address
 * rotem@altahq.com -> rotem
 */
function extractNameFromEmail(nameOrEmail: string): string {
  if (nameOrEmail.includes("@")) {
    return nameOrEmail.split("@")[0];
  }
  return nameOrEmail;
}

export function getPersonResearchService() {
  const exaApiKey = process.env.EXA_API_KEY;

  if (!exaApiKey) {
    throw new Error("EXA_API_KEY environment variable is required");
  }

  const exa = new ExaProvider(exaApiKey);

  return {
    async researchPerson(
      input: PersonResearchInput,
      opportunityId?: string,
      ownerEmail?: string
    ): Promise<PersonResearchResult | null> {
      const searchName = extractNameFromEmail(input.name);

      console.log("[RESEARCH] Query:", {
        name: searchName,
        company: input.companyName,
        linkedinUrl: input.linkedinUrl,
        opportunityId,
      });

      // Get wrong candidates for this opportunity
      const wrongCandidates =
        opportunityId && ownerEmail
          ? await prisma.wrongPersonCandidate.findMany({
              where: {
                opportunityId,
                ownerEmail,
              },
              select: { linkedinUrl: true },
            })
          : [];

      const wrongLinkedinUrls = new Set(
        wrongCandidates.map((c) => c.linkedinUrl).filter((url): url is string => url !== null)
      );

      console.log("[RESEARCH] Wrong candidates to exclude:", Array.from(wrongLinkedinUrls));

      // Try Exa
      console.log("[RESEARCH] Trying Exa...");
      const exaResult = await exa.researchPerson(searchName, input.companyName, input.linkedinUrl);

      if (exaResult) {
        // Check if this result is in the wrong candidates list
        if (exaResult.person.linkedinUrl && wrongLinkedinUrls.has(exaResult.person.linkedinUrl)) {
          console.log("[RESEARCH] ❌ Exa result is in wrong candidates list, skipping");
        } else {
          console.log("[RESEARCH] ✅ Exa found result");
          console.log("[RESEARCH] Full result:", JSON.stringify(exaResult, null, 2));
          return exaResult;
        }
      }

      // Fallback to Perplexity with same query
      console.log("[RESEARCH] Exa failed, trying Perplexity...");
      const llmResult = await llmPersonResearch({
        name: searchName,
        company: input.companyName,
        linkedinUrl: input.linkedinUrl,
      });

      if (llmResult && llmResult.status === "found" && llmResult.person.fullName) {
        // Check if this result is in the wrong candidates list
        if (llmResult.person.linkedinUrl && wrongLinkedinUrls.has(llmResult.person.linkedinUrl)) {
          console.log("[RESEARCH] ❌ Perplexity result is in wrong candidates list, skipping");
        } else {
          console.log("[RESEARCH] ✅ Perplexity found result");
          console.log("[RESEARCH] Full result:", JSON.stringify(llmResult, null, 2));

          return {
            person: {
              name: llmResult.person.fullName,
              linkedinUrl: llmResult.person.linkedinUrl ?? undefined,
              title: llmResult.person.currentTitle ?? undefined,
              company: llmResult.person.currentCompany ?? undefined,
              id: undefined,
              avatarUrl: undefined,
            },
            research: {
              about: llmResult.person.summary ?? undefined,
              experience: undefined,
              education: undefined,
              skills: undefined,
            },
          };
        }
      }

      console.log("[RESEARCH] ❌ Not found");
      return null;
    },
  };
}
