import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { createOpportunity } from "../opportunities/opportunity-service.js";
import { createTimer } from "../../lib/logger.js";
import type { opportunityInputSchema } from "../../lib/schemas.js";

export function extractLinkedinJobIdFromUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    const currentJobId = url.searchParams.get("currentJobId");
    if (currentJobId) return currentJobId;
    const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const trimmedNullable = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}, z.string().nullable());

export const linkedinJobImportInputSchema = z.object({
  sourceUrl: z.string().url(),
  linkedinJobId: trimmedNullable.optional(),
  title: trimmedNullable.optional(),
  companyName: trimmedNullable.optional(),
  location: trimmedNullable.optional(),
  workplaceType: trimmedNullable.optional(),
  employmentType: trimmedNullable.optional(),
  seniority: trimmedNullable.optional(),
  descriptionText: trimmedNullable.optional(),
  rawText: trimmedNullable.optional(),
  rawHtmlSnippet: trimmedNullable.optional(),
  extractedAt: z.string().datetime().optional()
}).transform((input) => ({
  ...input,
  linkedinJobId: input.linkedinJobId ?? extractLinkedinJobIdFromUrl(input.sourceUrl),
  extractedAt: input.extractedAt ?? new Date().toISOString()
})).refine((input) => Boolean(input.title || input.companyName || input.descriptionText || input.rawText), {
  message: "LinkedIn import requires at least one useful job field: title, companyName, descriptionText, or rawText."
});

export type LinkedinJobImportInput = z.infer<typeof linkedinJobImportInputSchema>;

const normalizedLinkedinJobSchema = z.object({
  company: z.object({
    name: z.string().min(1),
    linkedinUrl: z.string().url().nullable().optional(),
    website: z.string().url().nullable().optional(),
    description: z.string().nullable().optional(),
    industry: z.string().nullable().optional()
  }),
  opportunity: z.object({
    title: z.string().min(1),
    location: z.string().nullable().optional(),
    workplaceType: z.enum(["remote", "hybrid", "onsite"]).nullable().optional(),
    employmentType: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    requirements: z.array(z.string()).default([]),
    niceToHave: z.array(z.string()).default([]),
    responsibilities: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    summary: z.string().nullable().optional(),
    originalJobDescription: z.string().nullable().optional()
  }),
  metadata: z.object({
    source: z.literal("linkedin"),
    sourceUrl: z.string().url(),
    linkedinJobId: z.string().nullable().optional(),
    extractedAt: z.string().datetime()
  }),
  warnings: z.array(z.string()).default([])
});

export type NormalizedLinkedinJob = z.infer<typeof normalizedLinkedinJobSchema>;
type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export interface LinkedinJobNormalizer {
  normalize(input: LinkedinJobImportInput): Promise<NormalizedLinkedinJob>;
}

const linkedinJobImportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["company", "opportunity", "metadata", "warnings"],
  properties: {
    company: { type: "object", additionalProperties: false, required: ["name", "linkedinUrl", "website", "description", "industry"], properties: { name: { type: "string" }, linkedinUrl: { type: ["string", "null"] }, website: { type: ["string", "null"] }, description: { type: ["string", "null"] }, industry: { type: ["string", "null"] } } },
    opportunity: { type: "object", additionalProperties: false, required: ["title", "location", "workplaceType", "employmentType", "seniority", "description", "requirements", "niceToHave", "responsibilities", "technologies", "summary", "originalJobDescription"], properties: { title: { type: "string" }, location: { type: ["string", "null"] }, workplaceType: { type: ["string", "null"], enum: ["remote", "hybrid", "onsite", null] }, employmentType: { type: ["string", "null"] }, seniority: { type: ["string", "null"] }, description: { type: ["string", "null"] }, requirements: { type: "array", items: { type: "string" } }, niceToHave: { type: "array", items: { type: "string" } }, responsibilities: { type: "array", items: { type: "string" } }, technologies: { type: "array", items: { type: "string" } }, summary: { type: ["string", "null"] }, originalJobDescription: { type: ["string", "null"] } } },
    metadata: { type: "object", additionalProperties: false, required: ["source", "sourceUrl", "linkedinJobId", "extractedAt"], properties: { source: { type: "string", enum: ["linkedin"] }, sourceUrl: { type: "string" }, linkedinJobId: { type: ["string", "null"] }, extractedAt: { type: "string" } } },
    warnings: { type: "array", items: { type: "string" } }
  }
} as const;

export class OpenAiLinkedinJobNormalizer implements LinkedinJobNormalizer {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY, private readonly model = process.env.OPENAI_MODEL ?? "gpt-4o-mini") {}

  async normalize(input: LinkedinJobImportInput) {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is required for LinkedIn job import.");

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const timer = createTimer("llm", "openai linkedin job import", { model: this.model, attempt });
      try {
        const output = await this.createStructuredOutput(input);
        const parsed = normalizedLinkedinJobSchema.parse(JSON.parse(output));
        timer.end({ source: "linkedin", attempt });
        return {
          ...parsed,
          metadata: {
            source: "linkedin" as const,
            sourceUrl: input.sourceUrl,
            linkedinJobId: input.linkedinJobId ?? null,
            extractedAt: input.extractedAt
          }
        };
      } catch (error) {
        lastError = error;
        timer.fail(error instanceof Error ? error : new Error("Invalid LinkedIn import JSON"), { attempt });
      }
    }

    throw new Error(lastError instanceof Error && lastError.message.startsWith("OpenAI LinkedIn import failed")
      ? lastError.message
      : "LinkedIn import LLM returned invalid JSON or schema-incompatible data.");
  }

  private async createStructuredOutput(input: LinkedinJobImportInput) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: ["Normalize visible LinkedIn job page data into a job-search CRM opportunity.", "Preserve factual information from the job post only; do not invent missing fields.", "Use null for missing scalar fields and empty arrays for missing list fields.", "Extract company name carefully. Separate must-have requirements from nice-to-have requirements.", "Extract technologies, tools, frameworks, and platforms when mentioned.", "Produce a concise opportunity summary. Preserve the original job description when present.", "Return valid JSON only."].join("\n") },
          { role: "user", content: JSON.stringify(input) }
        ],
        response_format: { type: "json_schema", json_schema: { name: "linkedin_job_import", strict: true, schema: linkedinJobImportJsonSchema } }
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI LinkedIn import failed: ${response.status} ${await response.text()}`);
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const output = payload.choices?.[0]?.message?.content;
    if (!output) throw new Error("OpenAI LinkedIn import returned no text output.");
    return output;
  }
}

export type LinkedinJobImportDependencies = {
  normalizer?: LinkedinJobNormalizer;
  findDuplicate?: (input: LinkedinJobImportInput, ownerEmail: string) => Promise<{ id: string; companyName?: string | null; sourceUrl?: string | null; jobUrl?: string | null; linkedinJobId?: string | null } | null>;
  createOpportunity?: (input: OpportunityInput, ownerEmail: string) => Promise<{ id: string; companyName?: string | null; sourceUrl?: string | null; jobUrl?: string | null; linkedinJobId?: string | null }>;
};

export class LinkedinJobImportService {
  private readonly normalizer: LinkedinJobNormalizer;
  private readonly findDuplicateRecord: NonNullable<LinkedinJobImportDependencies["findDuplicate"]>;
  private readonly createOpportunityRecord: NonNullable<LinkedinJobImportDependencies["createOpportunity"]>;

  constructor(dependencies: LinkedinJobImportDependencies = {}) {
    this.normalizer = dependencies.normalizer ?? new OpenAiLinkedinJobNormalizer();
    this.findDuplicateRecord = dependencies.findDuplicate ?? this.findDuplicate;
    this.createOpportunityRecord = dependencies.createOpportunity ?? createOpportunity;
  }

  async importFromLinkedin(rawInput: unknown, ownerEmail: string) {
    const input = linkedinJobImportInputSchema.parse(rawInput);
    const existing = await this.findDuplicateRecord(input, ownerEmail);
    if (existing) return this.toResult(existing, false, true, input, []);

    const normalized = await this.normalizer.normalize(input);
    const notes = [
      normalized.opportunity.summary,
      normalized.opportunity.employmentType ? `Employment type: ${normalized.opportunity.employmentType}` : null,
      normalized.opportunity.seniority ? `Seniority: ${normalized.opportunity.seniority}` : null,
      normalized.opportunity.workplaceType ? `Workplace type: ${normalized.opportunity.workplaceType}` : null,
      normalized.opportunity.description,
      normalized.opportunity.responsibilities.length ? `Responsibilities:\n- ${normalized.opportunity.responsibilities.join("\n- ")}` : null,
      normalized.opportunity.requirements.length ? `Requirements:\n- ${normalized.opportunity.requirements.join("\n- ")}` : null,
      normalized.opportunity.niceToHave.length ? `Nice to have:\n- ${normalized.opportunity.niceToHave.join("\n- ")}` : null,
      normalized.opportunity.originalJobDescription ? `Original job description:\n${normalized.opportunity.originalJobDescription}` : input.descriptionText
    ].filter(Boolean).join("\n\n");

    const opportunity = await this.createOpportunityRecord({
      companyName: normalized.company.name,
      companySearchName: normalized.company.name,
      roleTitle: normalized.opportunity.title,
      pipelineType: "POTENTIAL",
      status: "RESEARCH_LEAD",
      priority: "MEDIUM",
      source: "linkedin",
      jobUrl: normalized.metadata.sourceUrl,
      sourceUrl: normalized.metadata.sourceUrl,
      linkedinUrl: normalized.company.linkedinUrl ?? undefined,
      linkedinJobId: normalized.metadata.linkedinJobId ?? undefined,
      location: normalized.opportunity.location ?? input.location ?? undefined,
      companyDescription: normalized.company.description ?? undefined,
      productDescription: normalized.company.industry ? `Industry: ${normalized.company.industry}` : undefined,
      techStack: normalized.opportunity.technologies.join(", ") || undefined,
      notes: notes || undefined,
      nextStep: "Review imported LinkedIn job details",
      domainIds: []
    }, ownerEmail);

    return this.toResult(opportunity, true, false, input, normalized.warnings);
  }

  private async findDuplicate(input: LinkedinJobImportInput, ownerEmail: string) {
    const where = input.linkedinJobId
      ? { ownerEmail, source: "linkedin", linkedinJobId: input.linkedinJobId }
      : { ownerEmail, source: "linkedin", sourceUrl: input.sourceUrl };
    return prisma.jobOpportunity.findFirst({ where });
  }

  private toResult(opportunity: { id: string; companyName?: string | null; sourceUrl?: string | null; jobUrl?: string | null; linkedinJobId?: string | null }, created: boolean, duplicate: boolean, input: LinkedinJobImportInput, warnings: string[]) {
    return { opportunity, opportunityId: opportunity.id, companyName: opportunity.companyName ?? undefined, created, duplicate, source: "linkedin" as const, sourceUrl: opportunity.sourceUrl ?? opportunity.jobUrl ?? input.sourceUrl, linkedinJobId: opportunity.linkedinJobId ?? input.linkedinJobId ?? null, warnings };
  }
}
