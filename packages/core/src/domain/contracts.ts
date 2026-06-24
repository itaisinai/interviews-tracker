import { z } from "zod";
import { interactionStatusSchema, interactionTypeSchema, jobStatusSchema, offerStatusSchema, pipelineTypeSchema, prioritySchema, taskStatusSchema, type InteractionStatus, type InteractionType, type JobStatus, type OfferStatus, type PipelineType, type Priority, type TaskStatus, type Option } from "./enums.js";

export const opportunityInputSchema = z.object({
  companyName: z.string().min(1),
  companySearchName: z.string().nullish(),
  roleTitle: z.string().min(1),
  pipelineType: pipelineTypeSchema,
  status: jobStatusSchema,
  priority: prioritySchema,
  referrerOrConnection: z.string().nullish(),
  source: z.string().nullish(),
  jobUrl: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  nextStep: z.string().nullish(),
  notes: z.string().nullish(),
  employeesRangeId: z.string().nullish(),
  companyStageId: z.string().nullish(),
  workModelId: z.string().nullish(),
  location: z.string().nullish(),
  funding: z.string().nullish(),
  companyDescription: z.string().nullish(),
  productDescription: z.string().nullish(),
  customersTraction: z.string().nullish(),
  techStack: z.string().nullish(),
  backendFrontendSplit: z.string().nullish(),
  compensationNotes: z.string().nullish(),
  domainIds: z.array(z.string()).default([])
});

export const interactionInputSchema = z.object({
  date: z.string().datetime().or(z.string().min(1)),
  endDate: z.string().datetime().or(z.string().min(1)).nullish(),
  type: interactionTypeSchema,
  stage: z.string().nullish(),
  status: interactionStatusSchema,
  personName: z.string().nullish(),
  personRole: z.string().nullish(),
  agenda: z.string().nullish(),
  meetingLink: z.string().url().nullish(),
  gmailMessageId: z.string().min(1).nullish(),
  notes: z.string().nullish(),
  outcome: z.string().nullish(),
  followUp: z.string().nullish()
}).refine((data) => {
  if (!data.endDate) return true;
  return new Date(data.endDate).getTime() >= new Date(data.date).getTime();
}, { message: "End date must be at or after start date", path: ["endDate"] });

export const noteInputSchema = z.object({
  jobOpportunityId: z.string().nullish(),
  interactionId: z.string().nullish(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1)
});

export const taskInputSchema = z.object({
  jobOpportunityId: z.string().nullish(),
  interactionId: z.string().nullish(),
  title: z.string().min(1),
  status: taskStatusSchema,
  priority: prioritySchema,
  dueDate: z.string().nullish(),
  notes: z.string().nullish()
});

export const compensationInputSchema = z.object({
  jobOpportunityId: z.string().min(1),
  baseSalary: z.string().nullish(),
  equity: z.string().nullish(),
  bonus: z.string().nullish(),
  signingBonus: z.string().nullish(),
  benefits: z.string().nullish(),
  vacationDays: z.string().nullish(),
  workModelNotes: z.string().nullish(),
  negotiationNotes: z.string().nullish(),
  offerStatus: offerStatusSchema
});

export type Opportunity = {
  id: string;
  ownerEmail: string;
  slug: string;
  companyName: string;
  companySearchName?: string | null;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection?: string | null;
  source?: string | null;
  jobUrl?: string | null;
  linkedinUrl?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  employeesRangeId?: string | null;
  companyStageId?: string | null;
  workModelId?: string | null;
  location?: string | null;
  funding?: string | null;
  companyDescription?: string | null;
  productDescription?: string | null;
  customersTraction?: string | null;
  techStack?: string | null;
  backendFrontendSplit?: string | null;
  compensationNotes?: string | null;
  updatedAt: string;
  employeesRange?: Option | null;
  companyStage?: Option | null;
  workModel?: Option | null;
  domains: Array<{ domain: Option }>;
  interactions: Interaction[];
  compensation?: Compensation | null;
};

export type Interaction = {
  id: string;
  slug: string;
  ownerEmail: string;
  jobOpportunityId: string;
  date: string;
  endDate?: string | null;
  type: InteractionType;
  stage?: string | null;
  status: InteractionStatus;
  personName?: string | null;
  personRole?: string | null;
  agenda?: string | null;
  meetingLink?: string | null;
  gmailMessageId?: string | null;
  notes?: string | null;
  outcome?: string | null;
  followUp?: string | null;
  jobOpportunity?: Opportunity;
};

export type Compensation = {
  id: string;
  ownerEmail: string;
  jobOpportunityId: string;
  baseSalary?: string | null;
  equity?: string | null;
  bonus?: string | null;
  signingBonus?: string | null;
  benefits?: string | null;
  vacationDays?: string | null;
  workModelNotes?: string | null;
  negotiationNotes?: string | null;
  offerStatus: OfferStatus;
  jobOpportunity?: Opportunity;
};

export type CompanySummary = {
  companyName: string;
  rolesCount: number;
  activeProcesses: number;
  potentialOpportunities: number;
  interactionsCount: number;
  nextInteraction?: Interaction | null;
  priority: Priority;
  status: JobStatus;
  employees?: string | null;
  stage?: string | null;
  domains: string[];
  workModel?: string | null;
  location?: string | null;
  funding?: string | null;
  updatedAt?: string | null;
};

export type CompanyDetail = {
  companyName: string;
  opportunities: Opportunity[];
  interactions: Interaction[];
  compensation: Compensation[];
};
