import { aiParseResponseSchema, companyEnrichmentSchema } from "../lib/schemas.js";
import { buildJobParserSystemPrompt } from "./job-parser-skill.js";

export type ParsedJobDescription = typeof aiParseResponseSchema._type;
export type CompanyEnrichment = typeof companyEnrichmentSchema._type;

export interface AiParserService {
  parseJobDescription(text: string): Promise<ParsedJobDescription>;
  parseCompanyEnrichment(text: string): Promise<CompanyEnrichment>;
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

  private async createStructuredOutput(input: { name: string; schema: unknown; systemPrompt: string; text: string }) {
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
      throw new Error(`OpenAI parser failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;

    if (!outputText) {
      throw new Error("OpenAI parser returned no text output.");
    }

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
