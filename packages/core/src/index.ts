import { z } from "zod";

export const pipelineTypeSchema = z.enum(["POTENTIAL", "ACTIVE_PROCESS", "ARCHIVED"]);
export const prioritySchema = z.enum(["HIGH", "MEDIUM", "LOW", "MAYBE"]);
export const jobStatusSchema = z.enum([
  "RESEARCH_LEAD",
  "TO_APPLY",
  "APPLIED",
  "RECRUITER_REACHED_OUT",
  "PHONE_SCHEDULED",
  "PHONE_DONE",
  "TECHNICAL_SCHEDULED",
  "TECHNICAL_DONE",
  "HOME_ASSIGNMENT",
  "ASSIGNMENT_SUBMITTED",
  "FINAL_STAGE",
  "OFFER",
  "REJECTED",
  "PAUSED",
  "NOT_RELEVANT"
]);
export const interactionStatusSchema = z.enum(["SCHEDULED", "DONE", "CANCELLED", "NEEDS_FOLLOW_UP"]);
export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]);
export const offerStatusSchema = z.enum(["NOT_DISCUSSED", "DISCUSSED", "VERBAL_OFFER", "WRITTEN_OFFER", "ACCEPTED", "DECLINED"]);

export type PipelineType = z.infer<typeof pipelineTypeSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type InteractionStatus = z.infer<typeof interactionStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;

export type Option = {
  id: string;
  label: string;
};

export type OptionsResponse = {
  companySizes: Option[];
  companyStages: Option[];
  domains: Option[];
  workModels: Option[];
  interactionTypes: Option[];
  interviewStages: Option[];
};

export const opportunityInputSchema = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().min(1),
  pipelineType: pipelineTypeSchema,
  status: jobStatusSchema,
  priority: prioritySchema,
  referrerOrConnection: z.string().nullish(),
  source: z.string().nullish(),
  jobUrl: z.string().nullish(),
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
  type: z.string().min(1),
  stage: z.string().nullish(),
  status: interactionStatusSchema,
  personName: z.string().nullish(),
  personRole: z.string().nullish(),
  agenda: z.string().nullish(),
  notes: z.string().nullish(),
  outcome: z.string().nullish(),
  followUp: z.string().nullish()
});

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
  companyName: string;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection?: string | null;
  source?: string | null;
  jobUrl?: string | null;
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
  notesList: Note[];
  tasks: Task[];
  compensation?: Compensation | null;
};

export type Interaction = {
  id: string;
  jobOpportunityId: string;
  date: string;
  type: string;
  stage?: string | null;
  status: InteractionStatus;
  personName?: string | null;
  personRole?: string | null;
  agenda?: string | null;
  notes?: string | null;
  outcome?: string | null;
  followUp?: string | null;
  jobOpportunity?: Opportunity;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  notes?: string | null;
  jobOpportunity?: Opportunity;
};

export type Compensation = {
  id: string;
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
  notes: Note[];
  tasks: Task[];
  compensation: Compensation[];
};
