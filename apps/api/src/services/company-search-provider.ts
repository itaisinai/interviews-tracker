import { ExaCompanySearchProvider } from "./exa-company-search-provider.js";

export type SearchResult = {
  title: string;
  url: string;
  publishedDate: string | null;
  author: string | null;
  text: string | null;
  highlights: string[];
};

export interface CompanySearchProvider {
  search(query: string): Promise<SearchResult[]>;
}

export function createCompanySearchProvider(): CompanySearchProvider {
  const provider = (process.env.COMPANY_RESEARCH_PROVIDER ?? "exa").trim().toLowerCase();

  if (provider === "exa") {
    return new ExaCompanySearchProvider();
  }

  throw new Error(`Unsupported company research provider: ${provider}`);
}
