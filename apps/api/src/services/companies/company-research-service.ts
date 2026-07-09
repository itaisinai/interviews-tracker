import { z } from "zod";

import { createTimer } from "../../lib/logger.js";
import {
  companyResearchExistingDataSchema,
  companyResearchInputSchema,
  companyResearchResultSchema,
} from "../../lib/schemas.js";

import {
  type CompanySearchProvider,
  createCompanySearchProvider,
  type SearchResult,
} from "./company-search-provider.js";

type CompanyResearchExistingData = z.infer<typeof companyResearchExistingDataSchema>;
export type CompanyResearchInput = z.infer<typeof companyResearchInputSchema>;
export type CompanyResearchResult = z.infer<typeof companyResearchResultSchema>;

type ResearchEvidence = {
  query: string;
  results: SearchResult[];
};

type ResearchExtractor = (input: {
  companyName: string;
  roleTitle?: string;
  knownContext?: string;
  linkedinUrl?: string | null;
  existingCompanyData: CompanyResearchExistingData;
  evidence: ResearchEvidence[];
  missingFields: MissingResearchFields;
}) => Promise<CompanyResearchResult>;

type MissingResearchFields = {
  funding: boolean;
  employees: boolean;
  location: boolean;
  traction: boolean;
  descriptions: boolean;
};

const companyResearchResultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "companyName",
    "companySearchName",
    "linkedinUrl",
    "funding",
    "totalRaised",
    "roundsCount",
    "latestRound",
    "investors",
    "investmentRounds",
    "employees",
    "location",
    "domains",
    "customersTraction",
    "companyDescription",
    "productDescription",
    "sourceUrls",
    "confidence",
    "rawImportantNotes",
  ],
  properties: {
    companyName: { type: "string" },
    companySearchName: { type: ["string", "null"] },
    linkedinUrl: { type: ["string", "null"] },
    funding: { type: ["string", "null"] },
    totalRaised: { type: ["string", "null"] },
    roundsCount: { type: ["number", "null"] },
    latestRound: { type: ["string", "null"] },
    investors: { type: "array", items: { type: "string" } },
    investmentRounds: { type: ["string", "null"] },
    employees: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    domains: { type: "array", items: { type: "string" } },
    customersTraction: { type: ["string", "null"] },
    companyDescription: { type: ["string", "null"] },
    productDescription: { type: ["string", "null"] },
    sourceUrls: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    rawImportantNotes: { type: "array", items: { type: "string" } },
  },
} as const;

const companyResearchDraftSchema = companyResearchResultSchema.extend({
  sourceUrls: z.array(z.string()),
});

function isPresent(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function containsHebrew(value: string) {
  return /[\u0590-\u05ff]/.test(value);
}

function normalizeCompanySearchName(inputCompanyName: string, candidate: string | null | undefined) {
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedCandidate) {
    return null;
  }

  const normalizedInput = normalizeText(inputCompanyName);
  if (normalizedCandidate.toLowerCase() === normalizedInput.toLowerCase()) {
    return null;
  }

  return normalizedCandidate;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => normalizeText(value)).filter((value) => value.length > 0))];
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isValidUrl(url: string) {
  try {
    void new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getSourcePriority(url: string) {
  const host = getHostname(url);

  if (host.includes("crunchbase.com")) return 2;
  if (
    host.includes("techcrunch.com") ||
    host.includes("calcalist.co.il") ||
    host.includes("globes.co.il") ||
    host.includes("ctech.com") ||
    host.includes("geektime.com")
  )
    return 3;
  if (host.includes("linkedin.com")) return 5;
  if (
    host.includes("vc") ||
    host.includes("ventures") ||
    host.includes("capital") ||
    host.includes("partners") ||
    host.includes("fund")
  )
    return 4;
  return 6;
}

function sortSearchResults(results: SearchResult[]) {
  return [...results].sort((a, b) => {
    const priorityDelta = getSourcePriority(a.url) - getSourcePriority(b.url);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return a.url.localeCompare(b.url);
  });
}

function extractEmployeesFromText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /\b(1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10000\+)\b/i,
    /\b(?:employees?|headcount|team size)\b[^0-9]{0,40}\b(1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10000\+)\b/i,
    /\b(1-10|11-50|51-200|201-500|501-1000|1001-5000|5001-10000|10000\+)\b[^0-9]{0,20}\b(?:employees?|people|team members?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function inferLinkedinUrlFromEvidence(evidence: ResearchEvidence[]) {
  for (const group of evidence) {
    for (const result of group.results) {
      if (getHostname(result.url).includes("linkedin.com")) {
        return result.url;
      }
    }
  }

  return null;
}

function getSourceUrlEvidence(employeesSource: string | null, sourceUrl: string) {
  return employeesSource ? `${employeesSource} (${sourceUrl})` : null;
}

function inferEmployeesFromEvidence(evidence: ResearchEvidence[]) {
  for (const group of evidence) {
    for (const result of group.results) {
      const sourceText = [result.title, result.text, ...result.highlights].filter(Boolean).join(" ");
      const employees = extractEmployeesFromText(sourceText);

      if (employees) {
        return {
          employees,
          note: getSourceUrlEvidence(`Employees inferred from ${result.title}`, result.url),
        };
      }
    }
  }

  return null;
}

export function getMissingResearchFields(existingCompanyData: CompanyResearchExistingData): MissingResearchFields {
  return {
    funding: !isPresent(existingCompanyData.funding) && !isPresent(existingCompanyData.investmentRounds),
    employees: !isPresent(existingCompanyData.employees),
    location: !isPresent(existingCompanyData.location),
    traction: !isPresent(existingCompanyData.customersTraction),
    descriptions:
      !isPresent(existingCompanyData.companyDescription) || !isPresent(existingCompanyData.productDescription),
  };
}

function buildContextSuffix(roleTitle?: string | null, knownContext?: string | null) {
  return [roleTitle, knownContext]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(" · ");
}

export function buildCompanyResearchQueries(input: CompanyResearchInput) {
  const existing = input.existingCompanyData ?? {};
  const missing = getMissingResearchFields(existing);
  const forceResearch = input.forceResearch ?? false;
  const context = buildContextSuffix(input.roleTitle, input.knownContext);
  const contextSuffix = context.length > 0 ? ` ${context}` : "";
  const linkedinUrl = normalizeText(input.linkedinUrl);
  const queries: string[] = [];

  if (missing.funding) {
    queries.push(`${input.companyName} startup funding investors rounds${contextSuffix}`);
    queries.push(`${input.companyName} Crunchbase funding investors${contextSuffix}`);
    queries.push(`${input.companyName} raised seed series A${contextSuffix}`);
    queries.push(`${input.companyName} company funding investors${contextSuffix}`);
  }

  if (missing.employees) {
    queries.push(`${input.companyName} employees headcount team size${contextSuffix}`);
  }

  if (missing.location) {
    queries.push(`${input.companyName} headquarters office location${contextSuffix}`);
  }

  if (missing.traction || missing.descriptions) {
    queries.push(`${input.companyName} about product customers traction${contextSuffix}`);
    queries.push(`${input.companyName} company website blog${contextSuffix}`);
  }

  if (linkedinUrl.length > 0) {
    queries.push(`${input.companyName} LinkedIn ${linkedinUrl}${contextSuffix}`);
    queries.push(`site:linkedin.com/company ${input.companyName}${contextSuffix}`);
  }

  if (forceResearch && queries.length === 0) {
    queries.push(`${input.companyName} company website blog${contextSuffix}`);
    queries.push(`${input.companyName} about product customers traction${contextSuffix}`);
    queries.push(`${input.companyName} employees headcount team size${contextSuffix}`);
    if (linkedinUrl.length > 0) {
      queries.push(`${input.companyName} LinkedIn ${linkedinUrl}${contextSuffix}`);
    }
  }

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

function mergeValue(existingValue: string | null | undefined, extractedValue: string | null) {
  const normalizedExisting = normalizeText(existingValue);
  return normalizedExisting.length > 0 ? normalizedExisting : extractedValue;
}

function composeFundingSummary(result: CompanyResearchResult) {
  const parts = [
    result.funding,
    result.totalRaised ? `Total raised: ${result.totalRaised}` : null,
    result.roundsCount != null ? `Rounds: ${result.roundsCount}` : null,
    result.latestRound ? `Latest round: ${result.latestRound}` : null,
    result.investors.length > 0 ? `Investors: ${result.investors.join(", ")}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : null;
}

function deriveConfidence(
  result: CompanyResearchResult,
  missing: MissingResearchFields,
  evidenceCount: number
): CompanyResearchResult["confidence"] {
  const signalCount = [
    result.funding,
    result.totalRaised,
    result.latestRound,
    result.investmentRounds,
    result.employees,
    result.location,
    result.customersTraction,
    result.companyDescription,
    result.productDescription,
    result.investors.length > 0 ? "investors" : null,
  ].filter(Boolean).length;

  if (signalCount === 0 && evidenceCount === 0) {
    return "LOW";
  }

  if (
    missing.funding &&
    (result.funding || result.totalRaised || result.latestRound || result.investors.length > 0) &&
    evidenceCount >= 2
  ) {
    return "HIGH";
  }

  if (signalCount >= 3 || evidenceCount >= 3) {
    return "MEDIUM";
  }

  return signalCount > 0 ? "MEDIUM" : "LOW";
}

export function buildResearchNote(result: CompanyResearchResult) {
  const lines = [
    `Company research for ${result.companyName}`,
    result.companySearchName ? `English search name: ${result.companySearchName}` : null,
    result.linkedinUrl ? `LinkedIn URL: ${result.linkedinUrl}` : null,
    result.funding ? `Funding: ${result.funding}` : null,
    result.totalRaised ? `Total raised: ${result.totalRaised}` : null,
    result.roundsCount != null ? `Rounds count: ${result.roundsCount}` : null,
    result.latestRound ? `Latest round: ${result.latestRound}` : null,
    result.investors.length > 0 ? `Investors: ${result.investors.join(", ")}` : null,
    result.investmentRounds ? `Investment rounds: ${result.investmentRounds}` : null,
    result.employees ? `Employees: ${result.employees}` : null,
    result.location ? `Location: ${result.location}` : null,
    result.customersTraction ? `Customers / traction: ${result.customersTraction}` : null,
    result.companyDescription ? `Company: ${result.companyDescription}` : null,
    result.productDescription ? `Product: ${result.productDescription}` : null,
    `Confidence: ${result.confidence}`,
    result.sourceUrls.length > 0 ? `Sources:\n${result.sourceUrls.map((url) => `- ${url}`).join("\n")}` : null,
    result.rawImportantNotes.length > 0
      ? `Notes:\n${result.rawImportantNotes.map((note) => `- ${note}`).join("\n")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

function mergeResearchResult(
  input: CompanyResearchInput,
  extracted: CompanyResearchResult,
  evidenceUrls: string[],
  evidence: ResearchEvidence[]
): CompanyResearchResult {
  const existing = input.existingCompanyData ?? {};
  const linkedinUrl =
    normalizeText(input.linkedinUrl) ||
    normalizeText(extracted.linkedinUrl) ||
    normalizeText(inferLinkedinUrlFromEvidence(evidence));
  const funding = mergeValue(existing.funding, extracted.funding);
  const investmentRounds = mergeValue(existing.investmentRounds, extracted.investmentRounds);
  const inferredEmployees = existing.employees ? null : inferEmployeesFromEvidence(evidence);
  const employees = mergeValue(existing.employees, extracted.employees ?? inferredEmployees?.employees ?? null);
  const location = mergeValue(existing.location, extracted.location);
  const customersTraction = mergeValue(existing.customersTraction, extracted.customersTraction);
  const companyDescription = mergeValue(existing.companyDescription, extracted.companyDescription);
  const productDescription = mergeValue(existing.productDescription, extracted.productDescription);
  const sourceUrls = unique([...evidenceUrls, ...extracted.sourceUrls.filter(isValidUrl)]);
  const result: CompanyResearchResult = {
    ...extracted,
    companyName: normalizeText(extracted.companyName) || normalizeText(input.companyName),
    companySearchName: normalizeCompanySearchName(
      input.companyName,
      existing.companySearchName ?? extracted.companySearchName
    ),
    linkedinUrl: linkedinUrl.length > 0 ? linkedinUrl : null,
    funding,
    investmentRounds,
    employees,
    location,
    customersTraction,
    companyDescription,
    productDescription,
    sourceUrls,
    rawImportantNotes: unique([
      ...extracted.rawImportantNotes,
      linkedinUrl.length > 0 ? `LinkedIn URL: ${linkedinUrl}` : null,
      inferredEmployees?.note ?? null,
      sourceUrls.length > 0 ? `Source URLs: ${sourceUrls.join(", ")}` : null,
    ]),
    confidence: extracted.confidence,
  };

  result.funding = funding ?? composeFundingSummary(result);
  result.confidence =
    sourceUrls.length === 0 && extracted.confidence === "LOW"
      ? "LOW"
      : deriveConfidence(result, getMissingResearchFields(existing), sourceUrls.length);

  return result;
}

function createEvidencePayload(evidence: ResearchEvidence[]) {
  return evidence.map((item) => ({
    query: item.query,
    results: item.results.map((result) => ({
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      text: result.text,
      highlights: result.highlights,
    })),
  }));
}

function createOpenAiResearchExtractor(): ResearchExtractor {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for company research.");
  }

  return async ({
    companyName,
    roleTitle,
    knownContext,
    linkedinUrl,
    existingCompanyData,
    evidence,
    missingFields,
  }) => {
    const timer = createTimer("llm", "extract company research", {
      company: companyName,
      evidenceGroups: evidence.length,
    });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You extract structured company research for a job search CRM.",
                  "Use only the supplied evidence. Do not invent facts, dates, funding amounts, investors, headcount, customers, or product details.",
                  "companyName is the canonical display name from evidence. companySearchName is only an English/Latin search alias for Gmail and web search. Use it when the input company name is Hebrew or non-Latin, or when evidence clearly shows a common English spelling. For example, טוקו can become Toko or Toku if evidence supports it. Return null if no useful alias is supported.",
                  "Prefer the most reliable sources: company site/blog, Crunchbase, TechCrunch, Calcalist, Globes, CTech, Geektime, VC portfolio pages, LinkedIn/company pages.",
                  "If the evidence includes an official LinkedIn company page URL, return it in linkedinUrl.",
                  "If evidence is weak or conflicting, be conservative, return nulls, and mention uncertainty in rawImportantNotes.",
                  "If existing company data is already present, preserve it unless the evidence is clearly more specific.",
                  "If a LinkedIn URL is provided, treat it as a strong identifier and include it in linkedinUrl in the response unless the evidence proves a different official LinkedIn company page.",
                  "For important funding and investor claims, include supporting URLs in rawImportantNotes.",
                  "Return compact but useful CRM data.",
                ].join(" "),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(
                  {
                    companyName,
                    roleTitle: normalizeText(roleTitle),
                    knownContext: normalizeText(knownContext),
                    linkedinUrl: normalizeText(linkedinUrl),
                    missingFields,
                    existingCompanyData,
                    evidence: createEvidencePayload(evidence),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "company_research_result",
            strict: true,
            schema: companyResearchResultJsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      timer.fail(new Error(`OpenAI company research failed: ${response.status}`), { company: companyName });
      throw new Error(`OpenAI company research failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const outputText =
      payload.output_text ??
      payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;

    if (!outputText) {
      timer.fail(new Error("OpenAI company research returned no text output."), { company: companyName });
      throw new Error("OpenAI company research returned no text output.");
    }

    const parsed = companyResearchDraftSchema.parse(JSON.parse(outputText));
    timer.end({ company: companyName });
    return parsed;
  };
}

export class CompanyResearchService {
  constructor(
    private readonly provider: CompanySearchProvider,
    private readonly extractor: ResearchExtractor = createOpenAiResearchExtractor()
  ) {}

  async research(input: CompanyResearchInput): Promise<CompanyResearchResult> {
    const normalizedInput: {
      companyName: string;
      roleTitle?: string;
      knownContext?: string;
      linkedinUrl?: string;
      existingCompanyData: CompanyResearchExistingData;
      forceResearch: boolean;
    } = {
      companyName: normalizeText(input.companyName),
      roleTitle: normalizeText(input.roleTitle) || undefined,
      knownContext: normalizeText(input.knownContext) || undefined,
      linkedinUrl: normalizeText(input.linkedinUrl) || undefined,
      existingCompanyData: input.existingCompanyData ?? {},
      forceResearch: input.forceResearch ?? false,
    };

    const existing = normalizedInput.existingCompanyData ?? {};
    const queries = buildCompanyResearchQueries(normalizedInput);
    const evidence = await this.collectEvidence(queries);

    if (evidence.length === 0) {
      const result = mergeResearchResult(
        normalizedInput,
        {
          companyName: normalizedInput.companyName,
          companySearchName: existing.companySearchName ?? null,
          linkedinUrl: normalizedInput.linkedinUrl ?? null,
          funding: existing.funding ?? null,
          totalRaised: null,
          roundsCount: null,
          latestRound: null,
          investors: [],
          investmentRounds: existing.investmentRounds ?? null,
          employees: existing.employees ?? null,
          location: existing.location ?? null,
          domains: [],
          customersTraction: existing.customersTraction ?? null,
          companyDescription: existing.companyDescription ?? null,
          productDescription: existing.productDescription ?? null,
          sourceUrls: [],
          confidence: "LOW",
          rawImportantNotes: ["No reliable company research results were found."],
        },
        [],
        evidence
      );
      return result;
    }

    const extracted = await this.extractor({
      companyName: normalizedInput.companyName,
      roleTitle: normalizedInput.roleTitle,
      knownContext: normalizedInput.knownContext,
      linkedinUrl: normalizedInput.linkedinUrl,
      existingCompanyData: existing,
      evidence,
      missingFields: getMissingResearchFields(existing),
    });

    const result = mergeResearchResult(
      normalizedInput,
      extracted,
      evidence.flatMap((item) => item.results.map((result) => result.url)),
      evidence
    );
    if (!result.companySearchName && containsHebrew(normalizedInput.companyName)) {
      result.rawImportantNotes = unique([
        ...result.rawImportantNotes,
        "Company name is non-Latin. Add an English company search name if Gmail or web search results are weak.",
      ]);
    }
    return result;
  }

  private async collectEvidence(queries: string[]): Promise<ResearchEvidence[]> {
    const results = await Promise.all(
      queries.map(async (query) => ({
        query,
        results: sortSearchResults(await this.provider.search(query)),
      }))
    );

    return results
      .map((item) => ({
        ...item,
        results: item.results.filter((result) => isPresent(result.url) && isPresent(result.title)),
      }))
      .filter((item) => item.results.length > 0);
  }
}

export function createCompanyResearchService() {
  return new CompanyResearchService(createCompanySearchProvider());
}

let companyResearchServiceInstance: CompanyResearchService | undefined;

export function getCompanyResearchService() {
  companyResearchServiceInstance ??= createCompanyResearchService();
  return companyResearchServiceInstance;
}
