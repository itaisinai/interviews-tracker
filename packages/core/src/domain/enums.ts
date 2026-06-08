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
export const interactionStatusSchema = z.enum(["SCHEDULED", "DONE", "REJECTED", "CANCELLED", "NEEDS_FOLLOW_UP"]);
export const interactionTypeSchema = z.enum([
  "Email",
  "Phone Call",
  "Interview",
  "Technical Interview",
  "HR Screen",
  "Recruiter Screen",
  "Onsite",
  "Home Assignment",
  "Follow-up",
  "Offer",
  "Rejection"
]);
export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]);
export const offerStatusSchema = z.enum(["NOT_DISCUSSED", "DISCUSSED", "VERBAL_OFFER", "WRITTEN_OFFER", "ACCEPTED", "DECLINED"]);

export type PipelineType = z.infer<typeof pipelineTypeSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type InteractionStatus = z.infer<typeof interactionStatusSchema>;
export type InteractionType = z.infer<typeof interactionTypeSchema>;
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
