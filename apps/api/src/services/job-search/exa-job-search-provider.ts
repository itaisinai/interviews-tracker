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
    const results: JobSearchResult[] = [];

    for (const result of payload.results ?? []) {
      if (!result.url || !result.title) {
        continue;
      }

      const jobId = this.extractJobId(result.url);
      const { companyName, title, location } = this.parseTitle(result.title);

      results.push({
        id: jobId,
        title: title || result.title,
        companyName: companyName || "Unknown Company",
        location: this.cleanLocation(location),
        workModel: null,
        postedDate: result.publishedDate ?? null,
        url: result.url,
        snippet: result.highlights?.join(" ") || result.text?.substring(0, 200) || null,
        fullDescription: result.text || null,
      });
    }

    return results;
  }

  private cleanLocation(location: string | null): string | null {
    if (!location) return null;
    // Remove leading pipe and whitespace
    return location.replace(/^\|\s*/, "").trim() || null;
  }

  private parseJobDetail(result: any, url: string): JobSearchResult {
    if (!result) {
      throw new Error("No job details found");
    }

    const jobId = this.extractJobId(url);
    const { companyName, title, location } = this.parseTitle(result.title || "");

    return {
      id: jobId,
      title: title || result.title || "Unknown Position",
      companyName: companyName || "Unknown Company",
      location: this.cleanLocation(location),
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

  private parseTitle(title: string): { companyName: string | null; title: string; location: string | null } {
    // Remove common suffixes
    const cleaned = title
      .replace(/\s+LinkedIn$/i, "")
      .replace(/\s+\|\s+LinkedIn$/i, "")
      .replace(/\s+-\s+LinkedIn$/i, "")
      .trim();

    // Pattern 0: "Company hiring Job Title in Location"
    // Example: "Sage Intacct, Inc. hiring Senior Full-Stack Engineer in Tel Aviv-Yafo"
    const hiringPattern = /^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)(?:\s*\.\.\.)?$/i;
    const hiringMatch = cleaned.match(hiringPattern);
    if (hiringMatch) {
      const [, company, jobTitle, location] = hiringMatch;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: location.trim(),
      };
    }

    // Pattern 0b: "Job Title - Company -" (trailing dash)
    // Example: "Senior Full stack developer - HUNTHEAD -"
    const dashCompanyPattern = /^(.+?)\s+-\s+([A-Z][A-Za-z0-9\s&.]+)\s+-\s*$/;
    const dashCompanyMatch = cleaned.match(dashCompanyPattern);
    if (dashCompanyMatch) {
      const [, jobTitle, company] = dashCompanyMatch;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: null,
      };
    }

    // Pattern 1: Hebrew "at" pattern with location
    // Example: "Senior Full Stack Developer ב FINQ ISRAEL -" or "Job Title ב Company — Location"
    const hebrewAtPattern = /^(.+?)\s+ב\s+(.+?)(?:\s+[—–-]\s+(.+?))?$/;
    const hebrewMatch = cleaned.match(hebrewAtPattern);
    if (hebrewMatch) {
      const [, jobTitle, companyPart, locationPart] = hebrewMatch;
      // Clean trailing dash from company
      const company = companyPart.replace(/\s*-\s*$/, "").trim();
      return {
        companyName: company,
        title: jobTitle.trim(),
        location: locationPart?.trim() || null,
      };
    }

    // Pattern 2: "at/in Location ב Company — Location"
    // Example: "Senior Full Stack Engineer at Israel ב Vonage — Tel Aviv-Yafo"
    const atLocationPattern = /^(.+?)\s+(?:at|in)\s+[^\s]+\s+ב\s+(.+?)\s+[—–-]\s+(.+?)$/i;
    const atLocationMatch = cleaned.match(atLocationPattern);
    if (atLocationMatch) {
      const [, jobTitle, company, location] = atLocationMatch;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: location.trim(),
      };
    }

    // Pattern 3: "Company גיוס Job Title at/עובדים Location"
    // Example: "surense גיוס Senior Full-Stack Engineerעובדים at Modiin-Maccabim-Reut"
    const recruitmentPattern = /^(.+?)\s+גיוס\s+(.+?)(?:עובדים|at)\s+(?:at\s+)?(.+?)$/;
    const recruitmentMatch = cleaned.match(recruitmentPattern);
    if (recruitmentMatch) {
      const [, company, jobTitle, location] = recruitmentMatch;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: location.trim(),
      };
    }

    // Pattern 4: "Company גיוס Job Title at Location"
    // Example: "Fairmatic גיוס Senior Software Engineer at Fullstackעובדים"
    const recruitmentPattern2 = /^(.+?)\s+גיוס\s+(.+?)\s+at\s+(.+?)(?:עובדים)?$/;
    const recruitmentMatch2 = cleaned.match(recruitmentPattern2);
    if (recruitmentMatch2) {
      const [, company, jobTitle, location] = recruitmentMatch2;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: location.replace(/עובדים$/, "").trim(),
      };
    }

    // Pattern 5: "Company גיוס Job Titleעובדים at Location"
    // Example: "Obol גיוס Senior Full Stack Developerעובדים at Tel"
    const recruitmentPattern3 = /^(.+?)\s+גיוס\s+(.+?)עובדים\s+at\s+(.+?)$/;
    const recruitmentMatch3 = cleaned.match(recruitmentPattern3);
    if (recruitmentMatch3) {
      const [, company, jobTitle, location] = recruitmentMatch3;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: location.trim(),
      };
    }

    // Pattern 6: "Job Title at Company -"
    // Example: "Senior Full-stack Developer at The5ers.com -"
    const atPattern = /^(.+?)\s+at\s+(.+?)(?:\s+-)?$/i;
    const atMatch = cleaned.match(atPattern);
    if (atMatch) {
      const [, jobTitle, company] = atMatch;
      return {
        companyName: company.trim(),
        title: jobTitle.trim(),
        location: null,
      };
    }

    // Pattern 7: Just the title or unclear format - return as-is
    return {
      companyName: null,
      title: cleaned.trim() || title.trim(),
      location: null,
    };
  }
}
