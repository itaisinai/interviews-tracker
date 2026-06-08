import { ExaCompanySearchProvider } from "./exa-company-search-provider.js";
import type { CompanySearchProvider } from "@interviews-tracker/integrations";

export type { SearchResult, CompanySearchProvider } from "@interviews-tracker/integrations";

export function createCompanySearchProvider(): CompanySearchProvider {
  const provider = (process.env.COMPANY_RESEARCH_PROVIDER ?? "exa").trim().toLowerCase();

  if (provider === "exa") {
    return new ExaCompanySearchProvider();
  }

  throw new Error(`Unsupported company research provider: ${provider}`);
}
