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

export const aiParseResponseSchema = z.object({
  companyName: z.string().nullable(),
  roleTitle: z.string().nullable(),
  pipelineType: pipelineTypeSchema.nullable(),
  status: z.string().nullable(),
  prioritySuggestion: prioritySchema.nullable(),
  company: z.object({
    employees: z.string().nullable(),
    stage: z.string().nullable(),
    domains: z.array(z.string()),
    workModel: z.string().nullable(),
    location: z.string().nullable(),
    funding: z.string().nullable(),
    customersTraction: z.string().nullable(),
    companyDescription: z.string().nullable(),
    productDescription: z.string().nullable()
  }),
  role: z.object({
    techStack: z.array(z.string()),
    backendFrontendSplit: z.string().nullable(),
    responsibilities: z.array(z.string()),
    requirements: z.array(z.string()),
    niceToHave: z.array(z.string()),
    compensation: z.string().nullable()
  }),
  process: z.object({
    knownNextInteraction: z.string().nullable(),
    knownContact: z.string().nullable(),
    suggestedNextStep: z.string().nullable()
  }),
  rawImportantNotes: z.array(z.string())
});

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

export const companyResearchExistingDataSchema = z.object({
  funding: z.string().nullable().optional(),
  investmentRounds: z.string().nullable().optional(),
  customersTraction: z.string().nullable().optional(),
  companyDescription: z.string().nullable().optional(),
  productDescription: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employees: z.string().nullable().optional()
});

export const companyResearchInputSchema = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().nullish(),
  knownContext: z.string().nullish(),
  existingCompanyData: companyResearchExistingDataSchema.nullish(),
  forceResearch: z.boolean().optional()
});

export const gmailMessageCandidateSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string().min(1),
  from: z.string().min(1),
  date: z.string().min(1),
  snippet: z.string().min(1)
});

export const gmailEmailCalendarSchema = z.object({
  summary: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  timezone: z.string().nullable(),
  attendees: z.array(z.string())
});

export const gmailStructuredEmailSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string().min(1),
  fromRaw: z.string().min(1),
  senderName: z.string().nullable(),
  senderEmail: z.string().nullable(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  dateHeader: z.string().nullable(),
  internalDate: z.string().min(1),
  snippet: z.string().min(1),
  plainText: z.string(),
  htmlText: z.string(),
  calendarText: z.string(),
  calendar: gmailEmailCalendarSchema.nullable()
});

export const gmailEmailClassificationSchema = z.object({
  messageId: z.string().min(1),
  isRelevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  emailType: z.enum([
    "INTERVIEW_INVITATION",
    "RECRUITER_MESSAGE",
    "FOLLOW_UP",
    "REJECTION",
    "OFFER",
    "UNRELATED"
  ]),
  reason: z.string().min(1)
});

export const gmailSearchCandidateSchema = gmailMessageCandidateSchema.extend({
  relevance: gmailEmailClassificationSchema
});

export const gmailEmailExtractionAnalysisSchema = z.object({
  dateSource: z.enum(["calendar", "text", "header"]),
  stageSource: z.enum(["explicit", "generic", "null"]),
  typeSource: z.enum(["explicit", "derived"]),
  statusSource: z.enum(["calendar", "text", "header"]),
  hasCalendar: z.boolean(),
  notes: z.array(z.string())
});

export const gmailInteractionDraftSchema = z.object({
  date: z.string().min(1),
  type: z.string().min(1),
  stage: z.string().nullable(),
  status: interactionStatusSchema,
  personName: z.string().nullable(),
  personRole: z.string().nullable(),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  outcome: z.string().nullable(),
  followUp: z.string().nullable()
});

export const gmailStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  googleEmail: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export const gmailConnectRequestSchema = z.object({
  returnTo: z.string().optional()
});

export const gmailConnectResponseSchema = z.object({
  authUrl: z.string().url()
});

export const gmailSearchResponseSchema = z.object({
  companyName: z.string(),
  roleTitle: z.string().nullable(),
  query: z.string(),
  candidates: z.array(gmailSearchCandidateSchema)
});

export const gmailParseEmailRequestSchema = z.object({
  messageId: z.string().min(1)
});

export const gmailParseEmailResponseSchema = z.object({
  email: gmailStructuredEmailSchema,
  interaction: gmailInteractionDraftSchema,
  analysis: gmailEmailExtractionAnalysisSchema
});

export const companyResearchResultSchema = z.object({
  companyName: z.string(),
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
  rawImportantNotes: z.array(z.string())
});

export const companyResearchApplyInputSchema = z.object({
  targetOpportunityId: z.string().nullish(),
  research: companyResearchResultSchema
});
