import type { InteractionStatus, JobStatus, OfferStatus, PipelineType, Priority, TaskStatus } from "./types";

type LabeledOption<T extends string> = {
  value: T;
  label: string;
};

function createOptions<T extends string>(labels: Record<T, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label })) as Array<LabeledOption<T>>;
}

export const pipelineTypeLabels: Record<PipelineType, string> = {
  POTENTIAL: "Potential / Research",
  ACTIVE_PROCESS: "Active Process",
  ARCHIVED: "Archived"
};

export const priorityLabels: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  MAYBE: "Maybe"
};

export const jobStatusLabels: Record<JobStatus, string> = {
  RESEARCH_LEAD: "Research Lead",
  TO_APPLY: "To Apply",
  APPLIED: "Applied",
  RECRUITER_REACHED_OUT: "Recruiter Reached Out",
  PHONE_SCHEDULED: "Phone Scheduled",
  PHONE_DONE: "Phone Done",
  TECHNICAL_SCHEDULED: "Technical Scheduled",
  TECHNICAL_DONE: "Technical Done",
  HOME_ASSIGNMENT: "Home Assignment",
  ASSIGNMENT_SUBMITTED: "Assignment Submitted",
  FINAL_STAGE: "Final Stage",
  OFFER: "Offer",
  REJECTED: "Rejected",
  PAUSED: "Paused",
  NOT_RELEVANT: "Not Relevant"
};

export const offerStatusLabels: Record<OfferStatus, string> = {
  NOT_DISCUSSED: "Not Discussed",
  DISCUSSED: "Discussed",
  VERBAL_OFFER: "Verbal Offer",
  WRITTEN_OFFER: "Written Offer",
  ACCEPTED: "Accepted",
  DECLINED: "Declined"
};

export const interactionStatusLabels: Record<InteractionStatus, string> = {
  SCHEDULED: "Scheduled",
  DONE: "Done",
  CANCELLED: "Cancelled",
  NEEDS_FOLLOW_UP: "Needs Follow-up"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CANCELLED: "Cancelled"
};

export const pipelineTypeOptions = createOptions(pipelineTypeLabels);
export const priorityOptions = createOptions(priorityLabels);
export const jobStatusOptions = createOptions(jobStatusLabels);
export const offerStatusOptions = createOptions(offerStatusLabels);
export const interactionStatusOptions = createOptions(interactionStatusLabels);
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

export function labelForTaskStatus(value: TaskStatus) {
  return taskStatusLabels[value];
}

export function displayLabelForEnumValue(value: string) {
  if (value in pipelineTypeLabels) return pipelineTypeLabels[value as PipelineType];
  if (value in priorityLabels) return priorityLabels[value as Priority];
  if (value in jobStatusLabels) return jobStatusLabels[value as JobStatus];
  if (value in offerStatusLabels) return offerStatusLabels[value as OfferStatus];
  if (value in interactionStatusLabels) return interactionStatusLabels[value as InteractionStatus];
  if (value in taskStatusLabels) return taskStatusLabels[value as TaskStatus];
  return null;
}
