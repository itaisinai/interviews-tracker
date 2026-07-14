import { z } from "zod";

import { pipelineTypeSchema } from "@interviews-tracker/core";

export const aiParseResponseSchema = z.object({
  companyName: z.string().nullable(),
  product: z.string().nullable(),
  roleTitle: z.string().nullable(),
  pipelineType: pipelineTypeSchema.nullable(),
  status: z.string().nullable(),
  company: z.object({
    employees: z.string().nullable(),
    stage: z.string().nullable(),
    domains: z.array(z.string()),
    workModel: z.string().nullable(),
    location: z.string().nullable(),
    funding: z.string().nullable(),
    customersTraction: z.string().nullable(),
    companyDescription: z.string().nullable(),
    productDescription: z.string().nullable(),
  }),
  role: z.object({
    techStack: z.array(z.string()),
    backendFrontendSplit: z.string().nullable(),
    responsibilities: z.array(z.string()),
    requirements: z.array(z.string()),
    niceToHave: z.array(z.string()),
    compensation: z.string().nullable(),
  }),
  process: z.object({
    knownNextInteraction: z.string().nullable(),
    knownContact: z.string().nullable(),
    suggestedNextStep: z.string().nullable(),
  }),
  rawImportantNotes: z.array(z.string()),
});

export type ParsedJobDescription = z.infer<typeof aiParseResponseSchema>;
