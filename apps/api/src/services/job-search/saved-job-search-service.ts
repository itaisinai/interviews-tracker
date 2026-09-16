import { prisma } from "../../lib/prisma.js";

export type SavedJobSearch = {
  id: string;
  name: string;
  query: string;
  location: string | null;
  remoteOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSavedJobSearchInput = {
  name: string;
  query: string;
  location?: string;
  remoteOnly?: boolean;
};

export function getSavedJobSearchService() {
  return {
    async create(ownerEmail: string, input: CreateSavedJobSearchInput): Promise<SavedJobSearch> {
      const savedSearch = await prisma.savedJobSearch.create({
        data: {
          ownerEmail,
          name: input.name,
          query: input.query,
          location: input.location ?? null,
          remoteOnly: input.remoteOnly ?? false,
        },
      });

      return savedSearch;
    },

    async list(ownerEmail: string): Promise<SavedJobSearch[]> {
      const searches = await prisma.savedJobSearch.findMany({
        where: { ownerEmail },
        orderBy: { createdAt: "desc" },
      });

      return searches;
    },

    async delete(ownerEmail: string, id: string): Promise<void> {
      await prisma.savedJobSearch.deleteMany({
        where: {
          id,
          ownerEmail,
        },
      });
    },
  };
}
