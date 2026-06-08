import { z } from "zod";
import { interactionStatusSchema } from "@interviews-tracker/core";

export const gmailEmailExtractionAnalysisSchema = z.object({
  dateSource: z.enum(["calendar", "text", "header"]),
  stageSource: z.enum(["explicit", "generic", "null"]),
  typeSource: z.enum(["explicit", "derived"]),
  statusSource: z.enum(["calendar", "text", "header"]),
  hasCalendar: z.boolean(),
  notes: z.array(z.string())
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

export const gmailInteractionDraftSchema = z.object({
  date: z.string().min(1),
  type: z.string().min(1),
  stage: z.string().nullish(),
  status: interactionStatusSchema,
  personName: z.string().nullable(),
  personRole: z.string().nullable(),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  outcome: z.string().nullable(),
  followUp: z.string().nullable()
});

export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;
export type GmailInteractionDraft = z.infer<typeof gmailInteractionDraftSchema>;
