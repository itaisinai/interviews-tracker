import { z } from "zod";

export const companyResearchExistingDataSchema = z.object({
  companySearchName: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  funding: z.string().nullable().optional(),
  investmentRounds: z.string().nullable().optional(),
  customersTraction: z.string().nullable().optional(),
  companyDescription: z.string().nullable().optional(),
  productDescription: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employees: z.string().nullable().optional(),
});

export const companyResearchInputSchema = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().nullish(),
  knownContext: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  existingCompanyData: companyResearchExistingDataSchema.nullish(),
  forceResearch: z.boolean().optional(),
});

export const companyResearchResultSchema = z.object({
  companyName: z.string(),
  companySearchName: z.string().nullable(),
  linkedinUrl: z.string().url().nullable(),
  funding: z.string().nullable(),
  totalRaised: z.string().nullable(),
  roundsCount: z.number().int().nullable(),
  latestRound: z.string().nullable(),
  investors: z.array(z.string()),
  investmentRounds: z.string().nullable(),
  employees: z.string().nullable(),
  location: z.string().nullable(),
  domains: z.array(z.string()),
  customersTraction: z.string().nullable(),
  companyDescription: z.string().nullable(),
  productDescription: z.string().nullable(),
  sourceUrls: z.array(z.string().url()),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  rawImportantNotes: z.array(z.string()),
});

export const companyResearchApplyInputSchema = z.object({
  targetOpportunityId: z.string().nullish(),
  research: companyResearchResultSchema,
});

export type CompanyResearchExistingData = z.infer<typeof companyResearchExistingDataSchema>;
export type CompanyResearchInput = z.infer<typeof companyResearchInputSchema>;
export type CompanyResearchResult = z.infer<typeof companyResearchResultSchema>;
export type CompanyResearchApplyInput = z.infer<typeof companyResearchApplyInputSchema>;

export type CompanyResearchApplyResponse = {
  research: CompanyResearchResult;
  updatedOpportunities: number;
};
