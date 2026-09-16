import type { JobSearchProvider, JobSearchQuery, JobSearchResult } from "@interviews-tracker/integrations";

import { createTimer } from "../../lib/logger.js";

type ExaSearchResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    publishedDate?: string | null;
    author?: string | null;
    text?: string | null;
    highlights?: string[];
  }>;
};

type ExaContentsResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    publishedDate?: string | null;
    author?: string | null;
    text?: string | null;
    highlights?: string[];
    id?: string;
  }>;
};

export class ExaJobSearchProvider implements JobSearchProvider {
  constructor(private readonly apiKey = process.env.EXA_API_KEY) {}

  async search(query: JobSearchQuery): Promise<JobSearchResult[]> {
    if (!this.apiKey) {
      throw new Error("EXA_API_KEY is required for job search.");
    }

    const searchQuery = this.buildSearchQuery(query);
    const timer = createTimer("search", "exa job search", { query: searchQuery });

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        query: searchQuery,
        type: "auto",
        includeDomains: ["linkedin.com/jobs"],
        numResults: query.limit ?? 10,
        text: true,
        highlights: { numSentences: 2, highlightsPerUrl: 2 },
      }),
    });

    if (!response.ok) {
      timer.fail(new Error(`Exa job search failed: ${response.status}`), { query: searchQuery });
      throw new Error(`Exa job search failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as ExaSearchResponse;
    const results = this.parseResults(payload);

    timer.end({ results: results.length });
    return results;
  }

  async getJobDetails(jobUrl: string): Promise<JobSearchResult> {
    if (!this.apiKey) {
      throw new Error("EXA_API_KEY is required for job details.");
    }

    const response = await fetch("https://api.exa.ai/contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        urls: [jobUrl],
        text: true,
        livecrawl: "fallback",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job details: ${response.status}`);
    }

    const payload = (await response.json()) as ExaContentsResponse;
    return this.parseJobDetail(payload.results?.[0], jobUrl);
  }

  private buildSearchQuery(query: JobSearchQuery): string {
    let searchQuery = query.query;

    if (query.location) {
      searchQuery += ` ${query.location}`;
    }

    if (query.remoteOnly) {
      searchQuery += " remote";
    }

    return searchQuery;
  }

  private parseResults(payload: ExaSearchResponse): JobSearchResult[] {
    return (payload.results ?? [])
      .map((result) => {
        if (!result.url || !result.title) {
          return null;
        }

        const jobId = this.extractJobId(result.url);
        const { companyName, title } = this.parseTitle(result.title);

        return {
          id: jobId,
          title: title || result.title,
          companyName: companyName || "Unknown Company",
          location: null,
          workModel: null,
          postedDate: result.publishedDate ?? null,
          url: result.url,
          snippet: result.highlights?.join(" ") || result.text?.substring(0, 200) || null,
          fullDescription: result.text || null,
        };
      })
      .filter((result): result is JobSearchResult => result !== null);
  }

  private parseJobDetail(result: any, url: string): JobSearchResult {
    if (!result) {
      throw new Error("No job details found");
    }

    const jobId = this.extractJobId(url);
    const { companyName, title } = this.parseTitle(result.title || "");

    return {
      id: jobId,
      title: title || result.title || "Unknown Position",
      companyName: companyName || "Unknown Company",
      location: null,
      workModel: null,
      postedDate: result.publishedDate ?? null,
      url,
      snippet: result.highlights?.join(" ") || result.text?.substring(0, 200) || null,
      fullDescription: result.text || null,
    };
  }

  private extractJobId(url: string): string {
    const match = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
    return match ? match[1] : url;
  }

  private parseTitle(title: string): { companyName: string | null; title: string } {
    // Remove common suffixes
    const cleaned = title
      .replace(/\s+LinkedIn$/i, "")
      .replace(/\s+\|\s+LinkedIn$/i, "")
      .replace(/\s+-\s+LinkedIn$/i, "")
      .trim();

    // Pattern 1: "Company — Location" or "Company - Location"
    // Example: "Vonage — Tel Aviv-Yafo" or "entrypoint — Herzliya, Tel Aviv"
    const dashPattern = /^(.+?)\s+[—–-]\s+(.+?)(?:\s*,\s*(.+?))?$/;
    const dashMatch = cleaned.match(dashPattern);
    if (dashMatch) {
      const [, company, location] = dashMatch;
      // Check if first part looks like a company (not a full job title)
      if (company && !company.includes("Senior") && !company.includes("Engineer") && company.length < 50) {
        return {
          companyName: company.trim(),
          title: cleaned, // Return full title since we don't have a separate job title
        };
      }
    }

    // Pattern 2: "Job Title | Company Location"
    // Example: "Senior Full-Stack Engineer | עובדים Modiin-Maccabim-Reut"
    const pipePattern = /^(.+?)\s+\|\s+(.+?)(?:\s+(.+?))?$/;
    const pipeMatch = cleaned.match(pipePattern);
    if (pipeMatch) {
      const [, jobTitle, rest] = pipeMatch;
      // Extract company from rest (before location keywords)
      const companyMatch = rest.match(/^([^\s]+(?:\s+[^\s]+)?)\s+(?:ב|in|at|Tel Aviv|Herzliya|Jerusalem)/i);
      if (companyMatch) {
        return {
          companyName: companyMatch[1].trim(),
          title: jobTitle.trim(),
        };
      }
      // If no location found, treat first words as company
      const words = rest.trim().split(/\s+/);
      if (words.length > 0) {
        return {
          companyName: words.slice(0, 2).join(" ").trim(), // Take first 1-2 words as company
          title: jobTitle.trim(),
        };
      }
    }

    // Pattern 3: "Job Title - Company"
    const hyphenPattern = /^(.+?)\s+-\s+(.+?)$/;
    const hyphenMatch = cleaned.match(hyphenPattern);
    if (hyphenMatch) {
      const [, part1, part2] = hyphenMatch;
      // If first part looks like job title (contains keywords), second is company
      if (
        part1.match(/senior|junior|full.?stack|backend|frontend|engineer|developer|lead|architect/i) &&
        part1.length > part2.length
      ) {
        return {
          companyName: part2.trim(),
          title: part1.trim(),
        };
      }
      // Otherwise, first part is company
      if (part1.length < 50 && !part1.match(/senior|engineer|developer/i)) {
        return {
          companyName: part1.trim(),
          title: part2.trim(),
        };
      }
    }

    // Pattern 4: Just the title or unclear format - return as-is
    return {
      companyName: null,
      title: cleaned.trim() || title.trim(),
    };
  }
}
