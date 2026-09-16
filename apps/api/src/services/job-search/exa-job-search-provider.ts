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
    const patterns = [
      / - (.+?)(?:\s+\||\s+-\s+LinkedIn|\s+hiring|$)/i,
      / at (.+?)(?:\s+\||\s+-\s+LinkedIn|$)/i,
      /^(.+?) - (.+?)(?:\s+\||$)/,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          companyName: match[2]?.trim() || null,
          title: match[1]?.trim() || title,
        };
      }
    }

    return {
      companyName: null,
      title: title.trim(),
    };
  }
}
