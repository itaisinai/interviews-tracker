import { z } from "zod";

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

export type ResearchSource = {
  url: string;
  title: string | null;
  publishedDate: string | null;
  author: string | null;
  excerpt: string | null;
};

export const researchSourceSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable(),
  publishedDate: z.string().nullable(),
  author: z.string().nullable(),
  excerpt: z.string().nullable()
});
