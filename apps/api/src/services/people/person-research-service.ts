import { z } from "zod";
import { personResearchInputSchema, personResearchResultSchema } from "../../lib/schemas.js";
import { ExaProvider } from "./exa-provider.js";

export type PersonResearchInput = z.infer<typeof personResearchInputSchema>;
export type PersonResearchResult = z.infer<typeof personResearchResultSchema>;

export function getPersonResearchService() {
  const exaApiKey = process.env.EXA_API_KEY;

  if (!exaApiKey) {
    throw new Error("EXA_API_KEY environment variable is required");
  }

  const exa = new ExaProvider(exaApiKey);

  return {
    async researchPerson(input: PersonResearchInput): Promise<PersonResearchResult | null> {
      const result = await exa.researchPerson(input.name, input.companyName, input.linkedinUrl);
      return result;
    }
  };
}
