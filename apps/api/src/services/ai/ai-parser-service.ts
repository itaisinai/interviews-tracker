import { z } from "zod";
import {
  aiParseResponseSchema,
  companyEnrichmentSchema,
  gmailEmailClassificationSchema,
  gmailInteractionDraftSchema,
  interactionDraftSchema
} from "@interviews-tracker/ai";
import { interactionTypeSchema } from "@interviews-tracker/core";
import { createTimer } from "../../lib/logger.js";
import { buildEmailInteractionParserSystemPrompt, buildInteractionTextParserSystemPrompt, buildJobParserSystemPrompt } from "@interviews-tracker/ai";
import { promoteOverdueInteractionStatusForRead } from "../../repositories/interaction-read-normalizer.js";

export type ParsedJobDescription = typeof aiParseResponseSchema._type;
export type CompanyEnrichment = typeof companyEnrichmentSchema._type;

export interface AiParserService {
  parseJobDescription(text: string): Promise<ParsedJobDescription>;
  parseCompanyEnrichment(text: string): Promise<CompanyEnrichment>;
  classifyGmailEmails(input: {
    companyName: string;
    roleTitle?: string | null;
    candidates: Array<{
      messageId: string;
      subject: string;
      from: string;
      snippet: string;
      date: string;
      senderDomain?: string | null;
    }>;
  }): Promise<Array<z.infer<typeof gmailEmailClassificationSchema>>>;
  parseStructuredGmailEmailToInteraction(input: {
    companyName: string;
    roleTitle?: string | null;
    email: unknown;
    derived: {
      date: string;
      dateSource: "calendar" | "text" | "header";
      type: string;
      stage: string | null;
      status: z.infer<typeof gmailInteractionDraftSchema>["status"];
      personName: string | null;
      personRole: string | null;
      agenda: string | null;
      notes: string | null;
      followUp: string | null;
    };
  }): Promise<z.infer<typeof gmailInteractionDraftSchema>>;
  parseInteractionText(input: {
    companyName: string;
    roleTitle?: string | null;
    opportunityContext?: string | null;
    text: string;
    nowIso: string;
  }): Promise<z.infer<typeof interactionDraftSchema>>;
}

type OpenAiTextOutput = {
  type: "output_text";
  text: string;
};

type OpenAiResponse = {
  output?: Array<{
    type?: string;
    content?: OpenAiTextOutput[];
  }>;
  output_text?: string;
};

const parsedJobDescriptionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["companyName", "roleTitle", "pipelineType", "status", "prioritySuggestion", "company", "role", "process", "rawImportantNotes"],
  properties: {
    companyName: { type: ["string", "null"] },
    roleTitle: { type: ["string", "null"] },
    pipelineType: { type: ["string", "null"], enum: ["POTENTIAL", "ACTIVE_PROCESS", null] },
    status: { type: ["string", "null"] },
    prioritySuggestion: { type: ["string", "null"], enum: ["HIGH", "MEDIUM", "LOW", "MAYBE", null] },
    company: {
      type: "object",
      additionalProperties: false,
      required: ["employees", "stage", "domains", "workModel", "location", "funding", "customersTraction", "companyDescription", "productDescription"],
      properties: {
        employees: { type: ["string", "null"] },
        stage: { type: ["string", "null"] },
        domains: { type: "array", items: { type: "string" } },
        workModel: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        funding: { type: ["string", "null"] },
        customersTraction: { type: ["string", "null"] },
        companyDescription: { type: ["string", "null"] },
        productDescription: { type: ["string", "null"] }
      }
    },
    role: {
      type: "object",
      additionalProperties: false,
      required: ["techStack", "backendFrontendSplit", "responsibilities", "requirements", "niceToHave", "compensation"],
      properties: {
        techStack: { type: "array", items: { type: "string" } },
        backendFrontendSplit: { type: ["string", "null"] },
        responsibilities: { type: "array", items: { type: "string" } },
        requirements: { type: "array", items: { type: "string" } },
        niceToHave: { type: "array", items: { type: "string" } },
        compensation: { type: ["string", "null"] }
      }
    },
    process: {
      type: "object",
      additionalProperties: false,
      required: ["knownNextInteraction", "knownContact", "suggestedNextStep"],
      properties: {
        knownNextInteraction: { type: ["string", "null"] },
        knownContact: { type: ["string", "null"] },
        suggestedNextStep: { type: ["string", "null"] }
      }
    },
    rawImportantNotes: { type: "array", items: { type: "string" } }
  }
} as const;

const companyEnrichmentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["companyName", "employees", "stage", "domains", "workModel", "location", "funding", "investmentRounds", "companyDescription", "productDescription", "customersTraction", "techStack", "backendFrontendSplit", "compensationNotes", "officeDaysPerWeek", "rawImportantNotes"],
  properties: {
    companyName: { type: ["string", "null"] },
    employees: { type: ["string", "null"] },
    stage: { type: ["string", "null"] },
    domains: { type: "array", items: { type: "string" } },
    workModel: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    funding: { type: ["string", "null"] },
    investmentRounds: { type: ["string", "null"] },
    companyDescription: { type: ["string", "null"] },
    productDescription: { type: ["string", "null"] },
    customersTraction: { type: ["string", "null"] },
    techStack: { type: "array", items: { type: "string" } },
    backendFrontendSplit: { type: ["string", "null"] },
    compensationNotes: { type: ["string", "null"] },
    officeDaysPerWeek: { type: ["number", "null"] },
    rawImportantNotes: { type: "array", items: { type: "string" } }
  }
} as const;

const gmailEmailClassificationBatchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["messageId", "isRelevant", "confidence", "emailType", "reason"],
        properties: {
          messageId: { type: "string" },
          isRelevant: { type: "boolean" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          emailType: {
            type: "string",
            enum: ["INTERVIEW_INVITATION", "RECRUITER_MESSAGE", "FOLLOW_UP", "REJECTION", "OFFER", "UNRELATED"]
          },
          reason: { type: "string" }
        }
      }
    }
  }
} as const;

const interactionDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "type", "stage", "status", "personName", "personRole", "agenda", "meetingLink", "notes", "outcome", "followUp"],
  properties: {
    date: { type: "string" },
    type: { type: "string", enum: [...interactionTypeSchema.options] },
    stage: { type: ["string", "null"] },
    status: { type: "string", enum: ["SCHEDULED", "DONE", "REJECTED", "CANCELLED", "NEEDS_FOLLOW_UP"] },
    personName: { type: ["string", "null"] },
    personRole: { type: ["string", "null"] },
    agenda: { type: ["string", "null"] },
    meetingLink: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    outcome: { type: ["string", "null"] },
    followUp: { type: ["string", "null"] }
  }
} as const;

export class OpenAiParserService implements AiParserService {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  ) {}

  async parseJobDescription(text: string): Promise<ParsedJobDescription> {
    const outputText = await this.createStructuredOutput({
      name: "parsed_job_description",
      schema: parsedJobDescriptionJsonSchema,
      systemPrompt: [
        buildJobParserSystemPrompt(),
        "This is an ingestion engine, not a summary generator.",
        "Preserve every explicit fact that could help the user later, even if the result is verbose.",
        "Put any useful leftover details into rawImportantNotes or suggestedNextStep instead of discarding them.",
        "Return only data that matches the provided JSON schema.",
        "Normalize prioritySuggestion based on seniority, fit signals, company quality, and urgency."
      ].join("\n\n"),
      text
    });

    return aiParseResponseSchema.parse(JSON.parse(outputText));
  }

  async parseCompanyEnrichment(text: string): Promise<CompanyEnrichment> {
    const outputText = await this.createStructuredOutput({
      name: "company_enrichment",
      schema: companyEnrichmentJsonSchema,
      systemPrompt: [
        "Extract structured company research for a job-search CRM from pasted notes, recruiter text, website snippets, or job descriptions.",
        "Focus on company size, stage, domain, work model, days from home or office, location, funding and investment rounds, product, traction, and tech stack.",
        "Use null for unknown scalar fields and [] for unknown lists.",
        "Do not invent facts. Preserve uncertainty in rawImportantNotes when needed."
      ].join(" "),
      text
    });

    return companyEnrichmentSchema.parse(JSON.parse(outputText));
  }

  async classifyGmailEmails(input: {
    companyName: string;
    roleTitle?: string | null;
    candidates: Array<{
      messageId: string;
      subject: string;
      from: string;
      snippet: string;
      date: string;
      senderDomain?: string | null;
    }>;
  }): Promise<Array<z.infer<typeof gmailEmailClassificationSchema>>> {
    const outputText = await this.createStructuredOutput({
      name: "gmail_email_classification_batch",
      schema: gmailEmailClassificationBatchJsonSchema,
      systemPrompt: [
        "Classify each Gmail candidate for a job-search CRM.",
        "Relevant means the email likely matters for the hiring process, even if confidence is only medium.",
        "Do not over-filter generic recruiter or scheduling email when it refers to the target company or role.",
        "Return results in the same order as the input candidates array.",
        `Company: ${input.companyName}`,
        input.roleTitle ? `Role: ${input.roleTitle}` : null,
        JSON.stringify(input.candidates)
      ].filter(Boolean).join("\n\n"),
      text: JSON.stringify(input.candidates)
    });

    const parsed = JSON.parse(outputText) as { results?: Array<z.infer<typeof gmailEmailClassificationSchema>> };
    return z.array(gmailEmailClassificationSchema).parse(parsed.results ?? []);
  }

  async parseStructuredGmailEmailToInteraction(input: {
    companyName: string;
    roleTitle?: string | null;
    email: unknown;
    derived: {
      date: string;
      dateSource: "calendar" | "text" | "header";
      type: string;
      stage: string | null;
      status: z.infer<typeof gmailInteractionDraftSchema>["status"];
      personName: string | null;
      personRole: string | null;
      agenda: string | null;
      notes: string | null;
      followUp: string | null;
    };
  }): Promise<z.infer<typeof gmailInteractionDraftSchema>> {
    const derivedPrompt = {
      date: input.derived.date,
      dateSource: input.derived.dateSource,
      notes: input.derived.notes
    };

    const outputText = await this.createStructuredOutput({
      name: "gmail_interaction_draft",
      schema: interactionDraftJsonSchema,
      systemPrompt: [
        buildEmailInteractionParserSystemPrompt(),
        "You are given a structured email object and derived hints from calendar/text extraction.",
        "Use the structured email and calendar contents to determine the interaction draft yourself.",
        "Use the derived date and notes only as supporting context, not as a type or stage guess.",
        "If the subject, body, or calendar title explicitly says Phone Call, the type should be Phone Call, not Interview.",
        "If the email clearly describes a phone call and the stage is not more specific, stage can be Interview.",
        "Prefer the derived date when it comes from a calendar invite or explicit meeting time.",
        "Fill agenda, notes, outcome, followUp, and personRole only when explicit in the structured email.",
        "Never upgrade a generic Interview to Final Interview.",
        "If stage is only Interview, keep it as Interview.",
        `Company: ${input.companyName}`,
        input.roleTitle ? `Role: ${input.roleTitle}` : null,
        `Derived date/context: ${JSON.stringify(derivedPrompt)}`,
        `Email: ${JSON.stringify(input.email)}`
      ].filter(Boolean).join("\n\n"),
      text: JSON.stringify(input.email)
    });

    const aiInteraction = interactionDraftSchema.parse(JSON.parse(outputText));
    return interactionDraftSchema.parse({
      ...aiInteraction,
      date: aiInteraction.date?.trim() ? aiInteraction.date : input.derived.date,
      notes: [input.derived.notes, aiInteraction.notes].filter(Boolean).join("\n\n") || null
    });
  }

  async parseInteractionText(input: {
    companyName: string;
    roleTitle?: string | null;
    opportunityContext?: string | null;
    text: string;
    nowIso: string;
  }): Promise<z.infer<typeof interactionDraftSchema>> {
    const outputText = await this.createStructuredOutput({
      name: "interaction_text_draft",
      schema: interactionDraftJsonSchema,
      systemPrompt: [
        buildInteractionTextParserSystemPrompt({
          companyName: input.companyName,
          roleTitle: input.roleTitle ?? null,
          opportunityContext: input.opportunityContext ?? null,
          nowIso: input.nowIso
        }),
        "You are given pasted text, not a structured email object.",
        "Do not change explicit facts into more advanced hiring stages.",
        "If the date is not explicit, use the fallback date and note that it should be verified."
      ].join("\n\n"),
      text: input.text
    });

    return promoteOverdueInteractionStatusForRead(interactionDraftSchema.parse(JSON.parse(outputText)));
  }

  private async createStructuredOutput(input: { name: string; schema: unknown; systemPrompt: string; text: string }) {
    const timer = createTimer("llm", `openai ${input.name}`, { model: this.model });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: input.systemPrompt
              }
            ]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: input.text }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: input.name,
            strict: true,
            schema: input.schema
          }
        }
      })
    });

    if (!response.ok) {
      timer.fail(new Error(`OpenAI parser failed: ${response.status}`), { name: input.name });
      throw new Error(`OpenAI parser failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;

    if (!outputText) {
      timer.fail(new Error("OpenAI parser returned no text output."), { name: input.name });
      throw new Error("OpenAI parser returned no text output.");
    }

    timer.end({ name: input.name });
    return outputText;
  }
}

export function createAiParserService(): AiParserService {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    return new OpenAiParserService(apiKey);
  }

  throw new Error("OPENAI_API_KEY is required. This parser now always uses OpenAI.");
}

let aiParserServiceInstance: AiParserService | undefined;

export function getAiParserService() {
  aiParserServiceInstance ??= createAiParserService();
  return aiParserServiceInstance;
}
