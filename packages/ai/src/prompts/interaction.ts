import { interactionTypeSchema } from "@interviews-tracker/core";

export const interactionTextParserSkill = `
# Interaction Text Parser Skill

## Primary Objective

- Extract a structured interaction draft from arbitrary recruiter messages, interview notes, calendar text, WhatsApp snippets, and follow-up messages.
- Preserve explicit facts only. Do not invent stage, outcome, date, or person title.
- Treat the text as a CRM ingestion input, not a summary task.

## Inputs

- The text may be in Hebrew, English, or mixed.
- The opportunity context may include company name, role title, and current process state.
- When date is absent, use the provided fallback timestamp and add a warning in notes that the date should be verified.

## Extraction Rules

- Prefer an explicit meeting or interview date/time if present.
- If the text is a calendar invite, use the calendar time as the source of truth.
- If there is no explicit date, use the fallback timestamp from the prompt and mention that the date was not explicit.
- Never upgrade a generic interview to Final Interview or Technical Interview unless the text says so.
- If stage is not explicit, use Interview or null; do not invent a more advanced stage.
- Preserve useful raw details in notes.
- If an explicit Google Meet or Zoom URL is present, put it in meetingLink.
- Put the human-readable result of the interaction in outcome.
- Put the next action, if any, in followUp.
- Do not use status as the main narrative field.
- Status is for the scheduling/state of this interaction only.
- Sender/person names should be taken from the text only if explicit.
- Type must be exactly one of: ${interactionTypeSchema.options.join(", ")}.
- If the message looks like a recruiter outreach, use type Email.
- If it is a scheduled interview or invite, use type Interview.
- If the text explicitly says Phone Call, use type Phone Call.
- If it is a home assignment, use type Home Assignment.
- If it is a follow-up, use type Follow-up.
- If it is an offer, use type Offer.
- If it is a rejection, use type Rejection.

## Status Rules

- Future interview or invite => SCHEDULED
- Completed meeting or post-interview note => DONE
- Explicit rejection or rejection follow-up => REJECTED.
- Cancellation or reschedule => CANCELLED or NEEDS_FOLLOW_UP
- If the text is ambiguous, prefer NEEDS_FOLLOW_UP over guessing completion.
- If the text already contains a later terminal result, do not put "Waiting for response" into status; keep the response in outcome or followUp instead.
- For explicit rejection emails, use type Rejection, set status to REJECTED, put a short rejection summary in outcome, and leave followUp null unless there is an explicit action to take.

## Output Rules

- Return only fields that match the interaction draft schema.
- Keep agenda, notes, outcome, and followUp concise but complete.
- Use meetingLink only for an explicit meeting URL. Leave it null if none is present.
- Include helpful context in notes, such as meeting link, location, or a brief source summary when explicit.
- Do not fabricate details that are not stated in the text.

## Success Criteria

- The user should be able to trust that the draft preserves the important facts they pasted, including the hiring context and next action, without hallucinated polish.
`.trim();

export function buildInteractionTextParserSystemPrompt(input: { companyName: string; roleTitle?: string | null; opportunityContext?: string | null; nowIso: string }) {
  return [
    "Use the following interaction text parser skill as the primary extraction guide.",
    interactionTextParserSkill,
    `Company: ${input.companyName}`,
    input.roleTitle ? `Role: ${input.roleTitle}` : null,
    input.opportunityContext ? `Opportunity context: ${input.opportunityContext}` : null,
    `Fallback date: ${input.nowIso}`
  ].filter(Boolean).join("\n\n");
}
