import type { JobSearchQuery, JobSearchResult } from "@interviews-tracker/integrations";

import { createJobSearchProvider } from "./job-search-provider.js";

export function getJobSearchService() {
  const provider = createJobSearchProvider();

  return {
    async search(query: JobSearchQuery): Promise<JobSearchResult[]> {
      return provider.search(query);
    },

    async getJobDetails(jobUrl: string): Promise<JobSearchResult> {
      return provider.getJobDetails(jobUrl);
    },
  };
}
