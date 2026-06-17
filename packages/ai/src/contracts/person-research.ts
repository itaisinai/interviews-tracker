import { z } from "zod";

export const personResearchExperienceSchema = z.object({
  company: z.string(),
  companyUrl: z.string().url().optional(),
  title: z.string(),
  dates: z.string().optional(),
  duration: z.string().optional()
});

export const personResearchEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  dates: z.string().optional()
});

export const personResearchSourceSchema = z.object({
  label: z.string(),
  url: z.string().url()
});

export const personResearchInputSchema = z.object({
  personId: z.string().optional(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  roleTitle: z.string().optional(),
  linkedinUrl: z.string().url().optional()
});

export const personResearchResultSchema = z.object({
  person: z.object({
    id: z.string().optional(),
    name: z.string(),
    title: z.string().optional(),
    company: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
    avatarUrl: z.string().url().optional()
  }),
  research: z.object({
    about: z.string().optional(),
    experience: z.array(personResearchExperienceSchema).optional(),
    education: z.array(personResearchEducationSchema).optional(),
    skills: z.array(z.string()).optional(),
    sources: z.array(personResearchSourceSchema).optional()
  })
});

export type PersonResearchExperience = z.infer<typeof personResearchExperienceSchema>;
export type PersonResearchEducation = z.infer<typeof personResearchEducationSchema>;
export type PersonResearchSource = z.infer<typeof personResearchSourceSchema>;
export type PersonResearchInput = z.infer<typeof personResearchInputSchema>;
export type PersonResearchResult = z.infer<typeof personResearchResultSchema>;
