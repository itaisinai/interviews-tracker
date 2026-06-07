export type PipelineType = "POTENTIAL" | "ACTIVE_PROCESS" | "ARCHIVED";
export type Priority = "HIGH" | "MEDIUM" | "LOW" | "MAYBE";
export type JobStatus = "RESEARCH_LEAD" | "TO_APPLY" | "APPLIED" | "RECRUITER_REACHED_OUT" | "PHONE_SCHEDULED" | "PHONE_DONE" | "TECHNICAL_SCHEDULED" | "TECHNICAL_DONE" | "HOME_ASSIGNMENT" | "ASSIGNMENT_SUBMITTED" | "FINAL_STAGE" | "OFFER" | "REJECTED" | "PAUSED" | "NOT_RELEVANT";
export type InteractionStatus = "SCHEDULED" | "DONE" | "CANCELLED" | "NEEDS_FOLLOW_UP";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type OfferStatus = "NOT_DISCUSSED" | "DISCUSSED" | "VERBAL_OFFER" | "WRITTEN_OFFER" | "ACCEPTED" | "DECLINED";

export type Option = { id: string; label: string };

export type OptionsResponse = {
  companySizes: Option[];
  companyStages: Option[];
  domains: Option[];
  workModels: Option[];
  interactionTypes: Option[];
  interviewStages: Option[];
};

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

export type ParsedJobDescription = {
  companyName: string | null;
  roleTitle: string | null;
  pipelineType: PipelineType | null;
  status: string | null;
  prioritySuggestion: Priority | null;
  company: {
    employees: string | null;
    stage: string | null;
    domains: string[];
    workModel: string | null;
    location: string | null;
    funding: string | null;
    customersTraction: string | null;
    companyDescription: string | null;
    productDescription: string | null;
  };
  role: {
    techStack: string[];
    backendFrontendSplit: string | null;
    responsibilities: string[];
    requirements: string[];
    niceToHave: string[];
    compensation: string | null;
  };
  process: {
    knownNextInteraction: string | null;
    knownContact: string | null;
    suggestedNextStep: string | null;
  };
  rawImportantNotes: string[];
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

export type CompanyEnrichment = {
  companyName: string | null;
  employees: string | null;
  stage: string | null;
  domains: string[];
  workModel: string | null;
  location: string | null;
  funding: string | null;
  investmentRounds: string | null;
  companyDescription: string | null;
  productDescription: string | null;
  customersTraction: string | null;
  techStack: string[];
  backendFrontendSplit: string | null;
  compensationNotes: string | null;
  officeDaysPerWeek: number | null;
  rawImportantNotes: string[];
};

export type CompanyResearchExistingData = {
  funding?: string | null;
  investmentRounds?: string | null;
  customersTraction?: string | null;
  companyDescription?: string | null;
  productDescription?: string | null;
  location?: string | null;
  employees?: string | null;
};

export type CompanyResearchInput = {
  companyName: string;
  roleTitle?: string | null;
  knownContext?: string | null;
  existingCompanyData?: CompanyResearchExistingData | null;
  forceResearch?: boolean;
};

export type CompanyResearchResult = {
  companyName: string;
  funding: string | null;
  totalRaised: string | null;
  roundsCount: number | null;
  latestRound: string | null;
  investors: string[];
  investmentRounds: string | null;
  employees: string | null;
  location: string | null;
  domains: string[];
  customersTraction: string | null;
  companyDescription: string | null;
  productDescription: string | null;
  sourceUrls: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rawImportantNotes: string[];
};

export type CompanyResearchApplyResponse = {
  research: CompanyResearchResult;
  updatedOpportunities: number;
};

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  updatedAt: string | null;
};

export type GmailMessageCandidate = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailSearchResponse = {
  companyName: string;
  roleTitle: string | null;
  query: string;
  candidates: GmailMessageCandidate[];
};

export type GmailInteractionDraft = {
  date: string;
  type: string;
  stage: string | null;
  status: InteractionStatus;
  personName: string | null;
  personRole: string | null;
  agenda: string | null;
  notes: string | null;
  outcome: string | null;
  followUp: string | null;
};

export type GmailParsedEmailResponse = {
  email: GmailMessageCandidate;
  interaction: GmailInteractionDraft;
};

export type GmailConnectResponse = {
  authUrl: string;
};
