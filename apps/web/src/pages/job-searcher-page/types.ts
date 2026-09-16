export type JobSearchResult = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  workModel: string | null;
  postedDate: string | null;
  url: string;
  snippet: string | null;
  fullDescription: string | null;
};

export type SearchFilters = {
  query: string;
  location: string;
  remoteOnly: boolean;
};
