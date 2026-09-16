import type { JobSearchProvider } from "@interviews-tracker/integrations";

import { ExaJobSearchProvider } from "./exa-job-search-provider.js";

export function createJobSearchProvider(): JobSearchProvider {
  const provider = (process.env.JOB_SEARCH_PROVIDER ?? "exa").trim().toLowerCase();

  if (provider === "exa") {
    return new ExaJobSearchProvider();
  }

  throw new Error(`Unsupported job search provider: ${provider}`);
}
