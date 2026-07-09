import { PrismaClient } from "@prisma/client";

/**
 * Lazy Prisma Client initialization
 *
 * The client is created on first access, not at import time.
 * This ensures DATABASE_URL is loaded from environment before Prisma connects.
 */
let _prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];

    // Bind methods to the client instance
    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});
