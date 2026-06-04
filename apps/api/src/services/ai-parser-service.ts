import { aiParseResponseSchema, companyEnrichmentSchema } from "../lib/schemas.js";

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
        "Extract structured job-search CRM data from pasted job, company, recruiter, or interview-process text.",
        "Use null for unknown scalar fields and [] for unknown lists.",
        "Normalize pipelineType to POTENTIAL unless the text clearly says an interview process already started.",
        "Normalize prioritySuggestion based on seniority, fit signals, company quality, and urgency.",
        "Do not invent compensation, dates, contacts, or funding."
      ].join(" "),
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

export class MockAiParserService implements AiParserService {
  async parseJobDescription(text: string): Promise<ParsedJobDescription> {
    const lower = text.toLowerCase();
    const domains = [
      lower.includes("cyber") ? "Cybersecurity" : null,
      lower.includes("ai") ? "AI" : null,
      lower.includes("developer tool") ? "Developer Tools" : null,
      lower.includes("fintech") ? "Fintech" : null
    ].filter((domain): domain is string => Boolean(domain));

    const parsed = {
      companyName: this.extractAfter(text, /company[:\-]\s*([^\n]+)/i),
      roleTitle: this.extractAfter(text, /(?:role|title)[:\-]\s*([^\n]+)/i) ?? "Software Engineer",
      pipelineType: "POTENTIAL",
      status: "RESEARCH_LEAD",
      prioritySuggestion: lower.includes("senior") || lower.includes("principal") ? "HIGH" : "MEDIUM",
      company: {
        employees: this.extractAfter(text, /employees[:\-]\s*([^\n]+)/i),
        stage: this.extractAfter(text, /stage[:\-]\s*([^\n]+)/i),
        domains,
        workModel: lower.includes("remote") ? "Remote" : lower.includes("hybrid") ? "Hybrid" : null,
        location: this.extractAfter(text, /location[:\-]\s*([^\n]+)/i),
        funding: this.extractAfter(text, /funding[:\-]\s*([^\n]+)/i),
        customersTraction: this.extractAfter(text, /(?:traction|customers)[:\-]\s*([^\n]+)/i),
        companyDescription: text.slice(0, 500),
        productDescription: this.extractAfter(text, /product[:\-]\s*([^\n]+)/i)
      },
      role: {
        techStack: ["TypeScript", "React", "Node.js", "PostgreSQL"].filter((tech) => lower.includes(tech.toLowerCase())),
        backendFrontendSplit: null,
        responsibilities: this.sentencesContaining(text, ["build", "own", "lead", "develop"]),
        requirements: this.sentencesContaining(text, ["experience", "required", "must"]),
        niceToHave: this.sentencesContaining(text, ["nice", "bonus", "plus"]),
        compensation: this.extractAfter(text, /(?:compensation|salary)[:\-]\s*([^\n]+)/i)
      },
      process: {
        knownNextInteraction: null,
        knownContact: this.extractAfter(text, /(?:contact|recruiter)[:\-]\s*([^\n]+)/i),
        suggestedNextStep: "Review parsed fields, research company fit, and decide whether to apply."
      },
      rawImportantNotes: text.split("\n").map((line) => line.trim()).filter((line) => line.length > 80).slice(0, 5)
    };

    return aiParseResponseSchema.parse(parsed);
  }

  async parseCompanyEnrichment(text: string): Promise<CompanyEnrichment> {
    const lower = text.toLowerCase();
    const domains = [
      lower.includes("cyber") ? "Cybersecurity" : null,
      lower.includes("ai") ? "AI" : null,
      lower.includes("customer support") ? "Customer Support" : null,
      lower.includes("fintech") ? "Fintech" : null,
      lower.includes("developer tool") ? "Developer Tools" : null
    ].filter((domain): domain is string => Boolean(domain));

    return companyEnrichmentSchema.parse({
      companyName: this.extractAfter(text, /company[:\-]\s*([^\n]+)/i),
      employees: this.extractAfter(text, /(?:employees|size)[:\-]\s*([^\n]+)/i),
      stage: this.extractAfter(text, /stage[:\-]\s*([^\n]+)/i),
      domains,
      workModel: this.extractAfter(text, /(?:work model|hybrid|remote|office)[:\-]\s*([^\n]+)/i) ?? (lower.includes("remote") ? "Remote" : lower.includes("hybrid") ? "Hybrid" : null),
      location: this.extractAfter(text, /location[:\-]\s*([^\n]+)/i),
      funding: this.extractAfter(text, /funding[:\-]\s*([^\n]+)/i),
      investmentRounds: this.extractAfter(text, /(?:investment rounds|rounds|raised)[:\-]\s*([^\n]+)/i),
      companyDescription: text.slice(0, 500),
      productDescription: this.extractAfter(text, /product[:\-]\s*([^\n]+)/i),
      customersTraction: this.extractAfter(text, /(?:traction|customers)[:\-]\s*([^\n]+)/i),
      techStack: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "Python", "Go"].filter((tech) => lower.includes(tech.toLowerCase())),
      backendFrontendSplit: this.extractAfter(text, /(?:backend.*frontend|split)[:\-]\s*([^\n]+)/i),
      compensationNotes: this.extractAfter(text, /(?:compensation|salary)[:\-]\s*([^\n]+)/i),
      officeDaysPerWeek: this.extractOfficeDays(lower),
      rawImportantNotes: text.split("\n").map((line) => line.trim()).filter((line) => line.length > 60).slice(0, 8)
    });
  }

  private extractAfter(text: string, regex: RegExp) {
    return regex.exec(text)?.[1]?.trim() ?? null;
  }

  private sentencesContaining(text: string, terms: string[]) {
    return text
      .split(/[.\n]/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => terms.some((term) => sentence.toLowerCase().includes(term)))
      .slice(0, 5);
  }

  private extractOfficeDays(lower: string) {
    const match = /(\d)\s*(?:days?|x)\s*(?:from|in)?\s*(?:office|onsite|on-site)/i.exec(lower);
    return match ? Number(match[1]) : null;
  }
}

export function createAiParserService(): AiParserService {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  const provider = process.env.AI_PROVIDER ?? "openai";

  if (provider === "openai" && apiKey) {
    return new OpenAiParserService(apiKey);
  }

  return new MockAiParserService();
}

export const aiParserService: AiParserService = createAiParserService();
