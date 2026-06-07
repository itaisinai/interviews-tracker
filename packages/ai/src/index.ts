import { z } from "zod";
import { pipelineTypeSchema, prioritySchema, interactionStatusSchema } from "@interviews-tracker/core";

export const jobParserSkill = `
# Job Parser Skill

## Primary Objective

- This parser is an AI ingestion engine for a personal Job Search CRM, not a summarizer.
- Maximize information extraction.
- Missing information is worse than extracting too much, as long as the fact is explicitly stated.
- If a fact is explicitly stated, it should almost always be represented somewhere in the structured output.
- Preserve every useful detail that a user would want to remember six months from now.
- If information does not fit a dedicated field, place it in rawImportantNotes, suggestedNextStep, or another appropriate field.
- Think like a long-term CRM owner, not a short-term message summarizer.

## Extraction Priorities

- Highest priority: company name, role title, process stage, recruiter or company reached out, next expected action.
- Then: location, work model, office policy, company size, company age, funding, customers, product, domain, tech stack.
- Then: contacts, notes, interesting signals, competitive advantages, culture hints.
- Preserve any explicit detail that would help the user later during the hiring process.

## Extraction Principles

- Extract only what is explicitly present in the text.
- Prefer normalized CRM values over the original wording when the mapping is clear.
- Preserve uncertainty with null for unknown scalar fields and [] for unknown lists.
- Treat Hebrew and English recruiter messages as first-class inputs.
- When a recruiter message implies an active conversation or outreach, set pipelineType to ACTIVE_PROCESS.
- Keep the structured output schema intact and never invent compensation, dates, contacts, or funding.
- Extract contacts, notes, culture hints, competitive advantages, and unusual signals when they are explicitly present.
- Never discard a stated fact just because there is no perfect field for it.
- If a fact does not fit an existing field, place it in rawImportantNotes or suggestedNextStep rather than losing it.

## Normalization

- Normalize values whenever possible.
- Node -> Node.js.
- ReactJS -> React.
- AI platform -> AI.
- Tel Aviv -> Tel Aviv.
- ת"א -> Tel Aviv.

## Hebrew Recruiter-Message Patterns

- "חברת Alta" => companyName: Alta
- "משרת Senior Software Engineer" => roleTitle: Senior Software Engineer
- "התעניינה בקורות החיים שלך" => status: RECRUITER_REACHED_OUT
- "יושבים בת״א, רוטשילד" => location: Tel Aviv, Rothschild
- "ימי רביעי מהבית" => workModel: Hybrid - Wednesday from home
- "42 עובדים בעולם, 30 בארץ" => employees: 42 עובדים בעולם, 30 בארץ
- "30 לקוחות משלמים ביניהם Monday" => customersTraction: 30 לקוחות משלמים ביניהם Monday
- "פיתוח ב- Node + React" => techStack: Node.js, React

## Status Mapping Rules

- recruiter outreach, "התעניינה בקורות החיים שלך", or similar direct contact => RECRUITER_REACHED_OUT
- scheduled phone screen => PHONE_SCHEDULED
- completed phone screen => PHONE_DONE
- scheduled technical interview => TECHNICAL_SCHEDULED
- completed technical interview => TECHNICAL_DONE
- home assignment sent or assigned => HOME_ASSIGNMENT
- assignment submitted => ASSIGNMENT_SUBMITTED
- final stage / final rounds => FINAL_STAGE
- offer discussed or received => OFFER
- explicit rejection => REJECTED
- unclear early-stage interest => RESEARCH_LEAD or TO_APPLY depending on whether the user still needs to act

## Tech Stack Normalization Rules

- Normalize Node, node, NodeJS, and Node + React mentions to Node.js and React.
- Normalize common library names to their canonical form, for example Next.js, NestJS, PostgreSQL, Redis, TypeScript, JavaScript, Kubernetes, Docker, AWS, GCP, and Kafka.
- Split combined stack mentions into individual technologies.
- Keep the array deduplicated and ordered by the text emphasis when possible.

## Work Model Normalization Rules

- "Hybrid" with specific days from home should become a human-readable hybrid note, for example "Hybrid - Wednesday from home".
- "Remote", "fully remote", and "from home" should normalize to Remote unless the text explicitly describes a hybrid pattern.
- "Onsite", "onsite in office", and "in office" should normalize to Onsite.
- Preserve notable office-day details and neighborhood/location notes when they are present.

## Status Inference

- Recruiter contacted candidate => RECRUITER_REACHED_OUT.
- Interview scheduled => PHONE_SCHEDULED.
- Technical interview completed => TECHNICAL_DONE.
- Only company research => RESEARCH_LEAD.

## Do Not Hallucinate

- Never invent salary, funding, dates, team size, customers, or technologies.
- Unknown values should remain null.

## Examples

### Example 1

Input:

> היי, חברת Alta מחפשת משרת Senior Software Engineer. הם התעניינה בקורות החיים שלך, יושבים בת״א, רוטשילד, ימי רביעי מהבית, 42 עובדים בעולם, 30 בארץ, פיתוח ב- Node + React, ו-30 לקוחות משלמים ביניהם Monday.

Expected highlights:

- companyName: Alta
- roleTitle: Senior Software Engineer
- status: RECRUITER_REACHED_OUT
- location: Tel Aviv, Rothschild
- workModel: Hybrid - Wednesday from home
- employees: 42 עובדים בעולם, 30 בארץ
- customersTraction: 30 לקוחות משלמים ביניהם Monday
- techStack: Node.js, React
- rawImportantNotes should preserve any extra hiring-process detail that does not map cleanly to a field.

### Success Criteria

- A successful parser should make the user feel: "Wow, it remembered every important detail from this message."
- Not: "It produced valid JSON."

### Example 2

Input:

> We are looking for a Senior Backend Engineer. The recruiter reached out and said the team is hybrid, two days from home, based in Tel Aviv. Stack: Node, TypeScript, PostgreSQL.

Expected highlights:

- status: RECRUITER_REACHED_OUT
- workModel: Hybrid
- location: Tel Aviv
- techStack: Node.js, TypeScript, PostgreSQL
`.trim();

export function buildJobParserSystemPrompt() {
  return [
    "Use the following job parser skill as the primary extraction guide.",
    jobParserSkill
  ].join("\n\n");
}

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
- Keep notes and follow-up focused on the actual hiring interaction and preserve important details.

## Stage Rules

- If the email explicitly says Final Interview, Technical Interview, HR Screen, Recruiter Screen, Onsite, or similar, use that exact stage.
- If it only says Interview, use stage: Interview.
- Do not upgrade generic Interview to Final Interview.
- If the stage is not explicit, use null or Interview, depending on whether the email is clearly an interview invite.

## Type Rules

- Calendar or interview invitation => Interview
- Recruiter outreach or general recruiter message => Email
- Assignment message => Home Assignment
- Follow-up message => Follow-up Email
- Rejection => Rejection
- Offer => Offer

## Status Rules

- Future meeting invite => SCHEDULED
- Past meeting summary or completed interaction => DONE
- Cancellation or reschedule => CANCELLED or NEEDS_FOLLOW_UP
- When unsure, prefer NEEDS_FOLLOW_UP over inventing a completed state.

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
    emailInteractionParserSkill
  ].join("\n\n");
}

export const companyResearchExistingDataSchema = z.object({
  funding: z.string().nullable().optional(),
  investmentRounds: z.string().nullable().optional(),
  customersTraction: z.string().nullable().optional(),
  companyDescription: z.string().nullable().optional(),
  productDescription: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employees: z.string().nullable().optional()
});

export const companyResearchInputSchema = z.object({
  companyName: z.string().min(1),
  roleTitle: z.string().nullish(),
  knownContext: z.string().nullish(),
  existingCompanyData: companyResearchExistingDataSchema.nullish(),
  forceResearch: z.boolean().optional()
});

export const companyResearchResultSchema = z.object({
  companyName: z.string(),
  funding: z.string().nullable(),
  totalRaised: z.string().nullable(),
  roundsCount: z.number().int().nullable(),
  latestRound: z.string().nullable(),
  investors: z.array(z.string()),
  investmentRounds: z.string().nullable(),
  employees: z.string().nullable(),
  location: z.string().nullable(),
  domains: z.array(z.string()),
  customersTraction: z.string().nullable(),
  companyDescription: z.string().nullable(),
  productDescription: z.string().nullable(),
  sourceUrls: z.array(z.string().url()),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  rawImportantNotes: z.array(z.string())
});

export const companyResearchApplyInputSchema = z.object({
  targetOpportunityId: z.string().nullish(),
  research: companyResearchResultSchema
});

export type CompanyResearchApplyResponse = {
  research: CompanyResearchResult;
  updatedOpportunities: number;
};

export const companyEnrichmentSchema = z.object({
  companyName: z.string().nullable(),
  employees: z.string().nullable(),
  stage: z.string().nullable(),
  domains: z.array(z.string()),
  workModel: z.string().nullable(),
  location: z.string().nullable(),
  funding: z.string().nullable(),
  investmentRounds: z.string().nullable(),
  companyDescription: z.string().nullable(),
  productDescription: z.string().nullable(),
  customersTraction: z.string().nullable(),
  techStack: z.array(z.string()),
  backendFrontendSplit: z.string().nullable(),
  compensationNotes: z.string().nullable(),
  officeDaysPerWeek: z.number().nullable(),
  rawImportantNotes: z.array(z.string())
});

export const aiParseResponseSchema = z.object({
  companyName: z.string().nullable(),
  roleTitle: z.string().nullable(),
  pipelineType: pipelineTypeSchema.nullable(),
  status: z.string().nullable(),
  prioritySuggestion: prioritySchema.nullable(),
  company: z.object({
    employees: z.string().nullable(),
    stage: z.string().nullable(),
    domains: z.array(z.string()),
    workModel: z.string().nullable(),
    location: z.string().nullable(),
    funding: z.string().nullable(),
    customersTraction: z.string().nullable(),
    companyDescription: z.string().nullable(),
    productDescription: z.string().nullable()
  }),
  role: z.object({
    techStack: z.array(z.string()),
    backendFrontendSplit: z.string().nullable(),
    responsibilities: z.array(z.string()),
    requirements: z.array(z.string()),
    niceToHave: z.array(z.string()),
    compensation: z.string().nullable()
  }),
  process: z.object({
    knownNextInteraction: z.string().nullable(),
    knownContact: z.string().nullable(),
    suggestedNextStep: z.string().nullable()
  }),
  rawImportantNotes: z.array(z.string())
});

export const gmailEmailExtractionAnalysisSchema = z.object({
  dateSource: z.enum(["calendar", "text", "header"]),
  stageSource: z.enum(["explicit", "generic", "null"]),
  typeSource: z.enum(["explicit", "derived"]),
  statusSource: z.enum(["calendar", "text", "header"]),
  hasCalendar: z.boolean(),
  notes: z.array(z.string())
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

export type CompanyResearchExistingData = z.infer<typeof companyResearchExistingDataSchema>;
export type CompanyResearchInput = z.infer<typeof companyResearchInputSchema>;
export type CompanyResearchResult = z.infer<typeof companyResearchResultSchema>;
export type CompanyResearchApplyInput = z.infer<typeof companyResearchApplyInputSchema>;
export type CompanyEnrichment = z.infer<typeof companyEnrichmentSchema>;
export type ParsedJobDescription = z.infer<typeof aiParseResponseSchema>;
export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;
export type GmailInteractionDraft = z.infer<typeof gmailInteractionDraftSchema>;
