import { z } from "zod";

import {
  type InteractionStatus,
  interactionStatusSchema,
  type InteractionType,
  interactionTypeSchema,
  type JobStatus,
  jobStatusSchema,
  type OfferStatus,
  offerStatusSchema,
  type Option,
  type PipelineType,
  pipelineTypeSchema,
  type Priority,
  prioritySchema,
  type TaskStatus,
  taskStatusSchema,
} from "./enums.js";

export const companyInputSchema = z.object({
  name: z.string().min(1),
  searchName: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  websiteUrl: z.string().url().nullish(),
  location: z.string().nullish(),
  funding: z.string().nullish(),
  totalRaised: z.string().nullish(),
  latestRound: z.string().nullish(),
  employeesRangeId: z.string().nullish(),
  companyStageId: z.string().nullish(),
  description: z.string().nullish(),
  productDescription: z.string().nullish(),
  customersTraction: z.string().nullish(),
  techStack: z.string().nullish(),
  backendFrontendSplit: z.string().nullish(),
  notes: z.string().nullish(),
  isWatchlisted: z.boolean().default(false),
  watchlistReason: z.string().nullish(),
  domainIds: z.array(z.string()).default([]),
});

export const opportunityInputSchema = z
  .object({
    companyId: z.string().min(1).optional(), // Optional: can provide companyId OR companyName
    companyName: z.string().min(1).optional(), // Optional: for backward compatibility, auto-creates company
    roleTitle: z.string().min(1),
    pipelineType: pipelineTypeSchema,
    status: jobStatusSchema,
    priority: prioritySchema,
    referrerOrConnection: z.string().nullish(),
    source: z.string().nullish(),
    jobUrl: z.string().nullish(),
    linkedinUrl: z.string().url().nullish(),
    linkedinJobId: z.string().nullish(),
    sourceUrl: z.string().url().nullish(),
    nextStep: z.string().nullish(),
    notes: z.string().nullish(),
    workModelId: z.string().nullish(),
    compensationNotes: z.string().nullish(),
    domainIds: z.array(z.string()).default([]),
  })
  .refine((data) => data.companyId || data.companyName, {
    message: "Either companyId or companyName must be provided",
    path: ["companyId"],
  });

export const interactionInputSchema = z
  .object({
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
    followUp: z.string().nullish(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate).getTime() >= new Date(data.date).getTime();
    },
    { message: "End date must be at or after start date", path: ["endDate"] }
  );

export const noteInputSchema = z.object({
  companyId: z.string().nullish(),
  jobOpportunityId: z.string().nullish(),
  interactionId: z.string().nullish(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
});

export const taskInputSchema = z.object({
  companyId: z.string().nullish(),
  jobOpportunityId: z.string().nullish(),
  interactionId: z.string().nullish(),
  title: z.string().min(1),
  status: taskStatusSchema,
  priority: prioritySchema,
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
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
  offerStatus: offerStatusSchema,
});

export type Company = {
  ownerEmail: string;
  slug: string;
  name: string;
  searchName?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  funding?: string | null;
  totalRaised?: string | null;
  latestRound?: string | null;
  employeesRangeId?: string | null;
  companyStageId?: string | null;
  description?: string | null;
  productDescription?: string | null;
  customersTraction?: string | null;
  techStack?: string | null;
  backendFrontendSplit?: string | null;
  companyNotes?: string | null; // Renamed from 'notes' to avoid conflict with notesList
  isWatchlisted: boolean;
  watchlistReason?: string | null;
  lastResearchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employeesRange?: Option | null;
  companyStage?: Option | null;
  domains: Array<{ domain: Option }>;
};

export type Opportunity = {
  ownerEmail: string;
  slug: string;
  company: Company;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection?: string | null;
  source?: string | null;
  jobUrl?: string | null;
  linkedinUrl?: string | null;
  linkedinJobId?: string | null;
  sourceUrl?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  compensationNotes?: string | null;
  updatedAt: string;
  workModel?: Option | null;
  domains: Array<{ domain: Option }>;
  interactions: Interaction[];
  compensation?: Compensation | null;
};

export type Interaction = {
  slug: string;
  ownerEmail: string;
  jobOpportunityId?: string; // Deprecated: Use jobOpportunity.slug instead. No longer returned in API responses.
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
  ownerEmail: string;
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
  slug: string;
  name: string;
  isWatchlisted: boolean;
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
  location?: string | null;
  funding?: string | null;
  lastResearchedAt?: string | null;
  updatedAt: string;
};

export type CompanyDetail = {
  slug: string;
  name: string;
  searchName?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  funding?: string | null;
  totalRaised?: string | null;
  latestRound?: string | null;
  description?: string | null;
  productDescription?: string | null;
  customersTraction?: string | null;
  techStack?: string | null;
  backendFrontendSplit?: string | null;
  companyNotes?: string | null; // Renamed from 'notes' to avoid conflict with notesList
  isWatchlisted: boolean;
  watchlistReason?: string | null;
  lastResearchedAt?: string | null;
  employeesRange?: Option | null;
  companyStage?: Option | null;
  domains: Array<{ domain: Option }>;
  opportunities: Opportunity[];
  interactions: Interaction[];
  notesList: Note[]; // Renamed from 'notes' for clarity
  tasks: Task[];
  contacts: Person[];
  compensation: Compensation[];
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  ownerEmail: string;
  jobOpportunityId?: string | null;
  interactionId?: string | null;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  ownerEmail: string;
  jobOpportunityId?: string | null;
  interactionId?: string | null;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Person = {
  ownerEmail: string;
  slug: string;
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  company?: Company | null;
  createdAt: string;
  updatedAt: string;
};
