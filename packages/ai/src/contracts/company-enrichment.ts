import { z } from "zod";

export const companyEnrichmentSchema = z.object({
  companyName: z.string().nullable(),
  employees: z.string().nullable(),
  stage: z.string().nullable(),
  domains: z.array(z.string()),
  workModel: z.string().nullable(),
  location: z.string().nullable(),
  funding: z.string().nullable(),
  investmentRounds: z.string().nullable(),
  companyDescription: z.string().nullable(),
  productDescription: z.string().nullable(),
  customersTraction: z.string().nullable(),
  techStack: z.array(z.string()),
  backendFrontendSplit: z.string().nullable(),
  compensationNotes: z.string().nullable(),
  officeDaysPerWeek: z.number().nullable(),
  rawImportantNotes: z.array(z.string())
});

export type CompanyEnrichment = z.infer<typeof companyEnrichmentSchema>;
