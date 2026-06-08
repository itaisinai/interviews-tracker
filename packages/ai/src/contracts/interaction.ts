import { z } from "zod";
import { interactionStatusSchema, interactionTypeSchema } from "@interviews-tracker/core";

export const interactionDraftSchema = z.object({
  date: z.string().min(1),
  type: interactionTypeSchema,
  stage: z.string().nullish(),
  status: interactionStatusSchema,
  personName: z.string().nullable(),
  personRole: z.string().nullable(),
  agenda: z.string().nullable(),
  notes: z.string().nullable(),
  outcome: z.string().nullable(),
  followUp: z.string().nullable()
});

export type InteractionDraft = z.infer<typeof interactionDraftSchema>;

export const gmailInteractionDraftSchema = interactionDraftSchema;
