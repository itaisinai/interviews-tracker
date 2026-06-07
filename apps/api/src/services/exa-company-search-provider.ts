import type { SearchResult, CompanySearchProvider } from "./company-search-provider.js";
import { createTimer } from "../lib/logger.js";

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
  statuses?: Array<{
    id: string;
    status: "success" | "error";
    error?: {
      tag?: string;
      httpStatusCode?: number;
    };
  }>;
};

export class ExaCompanySearchProvider implements CompanySearchProvider {
  constructor(private readonly apiKey = process.env.EXA_API_KEY) {}

  async search(query: string): Promise<SearchResult[]> {
    if (!this.apiKey) {
      throw new Error("EXA_API_KEY is required for company research.");
    }

    const timer = createTimer("search", "exa company search", { query });
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        query,
        type: "auto",
        category: "company",
        numResults: 5,
        text: true
      })
    });

    if (!response.ok) {
      timer.fail(new Error(`Exa search failed: ${response.status}`), { query });
      throw new Error(`Exa search failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as ExaSearchResponse;

    const results = (payload.results ?? [])
      .map((result) => {
        if (!result.url || !result.title) {
          return null;
        }

        return {
          title: result.title,
          url: result.url,
          publishedDate: result.publishedDate ?? null,
          author: result.author ?? null,
          text: result.text ?? null,
          highlights: Array.isArray(result.highlights) ? result.highlights.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
        };
      })
      .filter((result): result is SearchResult => result !== null);

    const hydrated = await this.hydrateMissingContents(results, query);
    timer.end({ results: hydrated.length });
    return hydrated;
  }

  private async hydrateMissingContents(results: SearchResult[], query: string) {
    const missing = results.filter((result) => !result.text || result.text.trim().length === 0 || result.highlights.length === 0);

    if (missing.length === 0) {
      return results;
    }

    const contentsTimer = createTimer("search", "exa contents", { query, urls: missing.length });
    const response = await fetch("https://api.exa.ai/contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey as string
      },
      body: JSON.stringify({
        urls: missing.map((result) => result.url),
        text: true,
        highlights: {
          query,
          numSentences: 3,
          highlightsPerUrl: 3
        },
        livecrawl: "fallback"
      })
    });

    if (!response.ok) {
      contentsTimer.fail(new Error(`Exa contents failed: ${response.status}`), { query });
      return results;
    }

    const payload = (await response.json()) as ExaContentsResponse;
    const merged = new Map(results.map((result) => [result.url, result]));

    for (const content of payload.results ?? []) {
      const url = content.url ?? content.id;

      if (!url || !merged.has(url)) {
        continue;
      }

      const current = merged.get(url);

      if (!current) {
        continue;
      }

      merged.set(url, {
        ...current,
        title: content.title ?? current.title,
        publishedDate: content.publishedDate ?? current.publishedDate,
        author: content.author ?? current.author,
        text: content.text ?? current.text,
        highlights: content.highlights?.length ? content.highlights : current.highlights
      });
    }

    contentsTimer.end({ hydrated: missing.length });
    return [...merged.values()];
  }
}
