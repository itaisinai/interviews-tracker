export interface JobSearchResult {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  workModel: string | null;
  postedDate: string | null;
  url: string;
  snippet: string | null;
  fullDescription: string | null;
}

export interface JobSearchQuery {
  query: string;
  location?: string;
  remoteOnly?: boolean;
  limit?: number;
}

export interface JobSearchProvider {
  search(query: JobSearchQuery): Promise<JobSearchResult[]>;
  getJobDetails(jobUrl: string): Promise<JobSearchResult>;
}
