import { z } from "zod";

import { gmailInteractionDraftSchema } from "./interaction.js";

export const gmailEmailExtractionAnalysisSchema = z.object({
  dateSource: z.enum(["calendar", "text", "header"]),
  stageSource: z.enum(["explicit", "generic", "null"]),
  typeSource: z.enum(["explicit", "derived"]),
  statusSource: z.enum(["calendar", "text", "header"]),
  hasCalendar: z.boolean(),
  notes: z.array(z.string()),
});

export const gmailEmailClassificationSchema = z.object({
  messageId: z.string().min(1),
  isRelevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  emailType: z.enum(["INTERVIEW_INVITATION", "RECRUITER_MESSAGE", "FOLLOW_UP", "REJECTION", "OFFER", "UNRELATED"]),
  reason: z.string().min(1),
});

export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;
export type GmailInteractionDraft = z.infer<typeof gmailInteractionDraftSchema>;
