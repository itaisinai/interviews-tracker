import type { InteractionStatus, InteractionType, JobStatus, OfferStatus, PipelineType, Priority, TaskStatus } from "./types";

type LabeledOption<T extends string> = {
  value: T;
  label: string;
};

function createOptions<T extends string>(labels: Record<T, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label })) as Array<LabeledOption<T>>;
}

export const pipelineTypeLabels: Record<PipelineType, string> = {
  POTENTIAL: "potential / research",
  ACTIVE_PROCESS: "active process",
  ARCHIVED: "archived / rejected"
};

export const priorityLabels: Record<Priority, string> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  MAYBE: "maybe"
};

export const jobStatusLabels: Record<JobStatus, string> = {
  RESEARCH_LEAD: "research lead",
  TO_APPLY: "to apply",
  APPLIED: "applied",
  RECRUITER_REACHED_OUT: "recruiter reached out",
  PHONE_SCHEDULED: "phone scheduled",
  PHONE_DONE: "phone done",
  TECHNICAL_SCHEDULED: "technical scheduled",
  TECHNICAL_DONE: "technical done",
  HOME_ASSIGNMENT: "home assignment",
  ASSIGNMENT_SUBMITTED: "assignment submitted",
  FINAL_STAGE: "final stage",
  OFFER: "offer",
  REJECTED: "rejected",
  PAUSED: "paused",
  NOT_RELEVANT: "not relevant"
};

export const offerStatusLabels: Record<OfferStatus, string> = {
  NOT_DISCUSSED: "not discussed",
  DISCUSSED: "discussed",
  VERBAL_OFFER: "verbal offer",
  WRITTEN_OFFER: "written offer",
  ACCEPTED: "accepted",
  DECLINED: "declined"
};

export const interactionStatusLabels: Record<InteractionStatus, string> = {
  SCHEDULED: "scheduled",
  DONE: "passed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  NEEDS_FOLLOW_UP: "waiting for response"
};

export const interactionTypeLabels: Record<InteractionType, string> = {
  Email: "Email",
  "Phone Call": "Phone Call",
  Interview: "Interview",
  "Technical Interview": "Technical Interview",
  "HR Screen": "HR Screen",
  "Recruiter Screen": "Recruiter Screen",
  Onsite: "Onsite",
  "Home Assignment": "Home Assignment",
  "Follow-up": "Follow-up",
  Offer: "Offer",
  Rejection: "Rejection"
};

const interactionTypeAliases: Record<string, InteractionType> = {
  "phone interview": "Phone Call",
  "phone screen": "Phone Call",
  "screening call": "Phone Call",
  "phone screen call": "Phone Call",
  "follow up": "Follow-up",
  "follow-up email": "Follow-up",
  "follow up email": "Follow-up",
  "recruiter call": "Recruiter Screen",
  "recruiter interview": "Recruiter Screen",
  "onsite interview": "Onsite"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "pending",
  IN_PROGRESS: "in progress",
  DONE: "done",
  CANCELLED: "cancelled"
};

export const pipelineTypeOptions = createOptions(pipelineTypeLabels);
export const priorityOptions = createOptions(priorityLabels);
export const jobStatusOptions = createOptions(jobStatusLabels);
export const offerStatusOptions = createOptions(offerStatusLabels);
export const interactionStatusOptions = createOptions(interactionStatusLabels);
export const interactionTypeOptions = createOptions(interactionTypeLabels);
export const taskStatusOptions = createOptions(taskStatusLabels);

export function labelForPipelineType(value: PipelineType) {
  return pipelineTypeLabels[value];
}

export function labelForPriority(value: Priority) {
  return priorityLabels[value];
}

export function labelForJobStatus(value: JobStatus) {
  return jobStatusLabels[value];
}

export function labelForOfferStatus(value: OfferStatus) {
  return offerStatusLabels[value];
}

export function labelForInteractionStatus(value: InteractionStatus) {
  return interactionStatusLabels[value];
}

export function labelForInteractionType(value: InteractionType) {
  return interactionTypeLabels[value];
}

export function normalizeInteractionType(value: string | null | undefined): InteractionType {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "Interview";
  }

  if (trimmed in interactionTypeLabels) {
    return trimmed as InteractionType;
  }

  const canonical = interactionTypeAliases[trimmed.toLowerCase()];
  return canonical ?? "Interview";
}

export function labelForTaskStatus(value: TaskStatus) {
  return taskStatusLabels[value];
}

export function displayLabelForEnumValue(value: string) {
  if (value in pipelineTypeLabels) return pipelineTypeLabels[value as PipelineType];
  if (value in priorityLabels) return priorityLabels[value as Priority];
  if (value in jobStatusLabels) return jobStatusLabels[value as JobStatus];
  if (value in offerStatusLabels) return offerStatusLabels[value as OfferStatus];
  if (value in taskStatusLabels) return taskStatusLabels[value as TaskStatus];
  if (value in interactionStatusLabels) return interactionStatusLabels[value as InteractionStatus];
  if (value in interactionTypeLabels) return interactionTypeLabels[value as InteractionType];
  const normalizedInteractionType = normalizeInteractionType(value);
  if (normalizedInteractionType !== "Interview" || value.trim().toLowerCase() === "interview") return interactionTypeLabels[normalizedInteractionType];
  return null;
}
