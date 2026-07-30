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
- If the From header is an automated sender (noreply@, no-reply@, notifications@), look for the actual person's name in:
  - Email signature (name at the end)
  - "From:" or "Sent by:" mentions in the body
  - Calendar organizer if available
  - Do NOT use the company name as the person name
- If sender name or email exists, do not call them unknown.

## Person and Contact Extraction

- Extract personName and personRole from interviewer mentions in the email body
- Look for patterns like: "Interview with [Name]", "[Name] (Role/Title)", "Interviewer: [Name]"
- Check for LinkedIn profile links that indicate the interviewer
- Examples: "Ido Raz (Banking Team Lead, LinkedIn)", "Your interviewer will be Sarah Chen, VP of Engineering"
- If multiple interviewers, combine with "and": "John Smith and Jane Doe"
- Put the primary interviewer in personName, and their title/role in personRole

## Meeting Link Extraction

- Always extract meetingLink from video conference URLs
- Prioritize explicit "Join with Google Meet" or "Join via Zoom" links
- Common patterns: meet.google.com/*, zoom.us/*, us0*.zoom.us/*, teams.microsoft.com/*
- Extract the full URL including meeting ID/code

## Notes Extraction

- Keep notes comprehensive and preserve ALL actionable interview preparation details
- Include: interviewer details, meeting format, technical requirements (camera, screen sharing, tools)
- Include: what to prepare/bring, interview style/format, coding language options, special instructions
- Include: dial-in phone numbers with PINs, parking info, building access, dress code
- Examples of important details to preserve:
  * "Camera must be on, be ready to share entire screen for the duration"
  * "Python preferred, but JavaScript/TypeScript/Node.js also available"
  * "LeetCode-style practical problem with genuine logic and context - no AI usage permitted"
  * "AI Notetaker will record and transcribe - opt-out link provided if preferred"
  * "Dial-in: +972 73-359-9899 PIN: 1195053192824"
- Do NOT include redundant metadata (subject line, from address, date) already in other fields
- Organize with bullet points or short paragraphs for readability

## Outcome and Follow-up

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
