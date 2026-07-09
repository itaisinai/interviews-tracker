import { interactionTypeSchema } from "@interviews-tracker/core";

export const emailInteractionParserSkill = `
# Email Interaction Parser Skill

## Primary Objective

- Extract job-search interaction data from recruiter emails, interview invites, calendar messages, and follow-up emails.
- Preserve explicit facts. Do not guess dates, stages, outcomes, or titles that are not stated.
- Prefer structured email data over raw prose. If calendar data exists, treat it as the source of truth for meeting date/time.
- If information is not explicit, leave it null rather than inventing it.

## Extraction Rules

- Use parsed calendar DTSTART/DTEND when present.
- If no calendar exists, use explicit meeting time in subject/body.
- Use the email Date header only as a fallback for email timestamp, not meeting time.
- Never shift timezone manually if the input already includes an ISO date from calendar parsing.
- Sender name and sender email should come from the parsed From header.
- If sender name or email exists, do not call them unknown.
- Keep notes focused on the actual hiring interaction and preserve important details.
- Put the human-readable result of the interaction in outcome.
- Put the next action, if any, in followUp.
- Do not use status as the main story of the process.
- Status is the interaction's scheduling/state, while outcome is what happened and followUp is what should happen next.

## Stage Rules

- If the email explicitly says Final Interview, Technical Interview, HR Screen, Recruiter Screen, Onsite, or similar, use that exact stage.
- If it only says Interview, use stage: Interview.
- Do not upgrade generic Interview to Final Interview.
- If the stage is not explicit, use null or Interview, depending on whether the email is clearly an interview invite.

## Type Rules

- Type must be exactly one of: ${interactionTypeSchema.options.join(", ")}.
- Calendar or interview invitation => Interview
- If the subject/body/calendar title explicitly says Phone Call, type must be Phone Call.
- If the invite is clearly a phone call, do not collapse it into a generic Interview.
- Recruiter outreach or general recruiter message => Email
- Assignment message => Home Assignment
- Follow-up message => Follow-up
- Offer => Offer
- Rejection message => Rejection

## Status Rules

- Future meeting invite => SCHEDULED
- Past meeting summary or completed interaction => DONE
- Explicit rejection or rejection follow-up => REJECTED.
- Cancellation or reschedule => CANCELLED or NEEDS_FOLLOW_UP
- When unsure, prefer NEEDS_FOLLOW_UP over inventing a completed state.
- If a later terminal result is already present in the email/calendar thread, do not write "Waiting for response" into status; keep the result in outcome or followUp instead.
- For explicit rejection emails, use type Rejection, set status to REJECTED, put a short rejection summary in outcome, and leave followUp null unless there is an explicit next action.

## Output Rules

- Return only fields that match the schema.
- Keep agenda, notes, outcome, and followUp concise but complete.
- Include meeting time, location, link, and original subject in notes when available.
- Do not invent details that are not explicit in the email or calendar data.

## Success Criteria

- The user should feel that the parser preserved the important facts of the email, not that it fabricated a polished summary.
`.trim();

export function buildEmailInteractionParserSystemPrompt() {
  return [
    "Use the following email interaction parser skill as the primary extraction guide.",
    emailInteractionParserSkill,
  ].join("\n\n");
}
