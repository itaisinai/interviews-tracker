/**
 * Health check service
 * Provides lightweight and deep health checks for monitoring
 */

import { prisma } from "../../lib/prisma.js";
import { logError } from "../../lib/logger.js";

const startTime = Date.now();

/**
 * Basic health check - always fast, no external dependencies
 */
export function getBasicHealth() {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return {
    ok: true,
    service: "api",
    version: "0.1.0",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  };
}

/**
 * Deep health check - verifies database connectivity
 * Returns health status with latency metrics
 */
export async function getDeepHealth(): Promise<{
  ok: boolean;
  database: "up" | "down";
  latencyMs?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple database connectivity check
    await prisma.$queryRaw`SELECT 1`;

    const latencyMs = Date.now() - startTime;

    return {
      ok: true,
      database: "up",
      latencyMs
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    logError("health", "Deep health check failed - database unavailable", {
      error: error instanceof Error ? error.message : "Unknown error",
      latencyMs
    });

    return {
      ok: false,
      database: "down",
      latencyMs,
      error: "Database unavailable"
    };
  }
}

/**
 * Readiness check - for load balancers and orchestration
 * Returns 200 only if API is fully operational
 */
export async function checkReadiness(): Promise<{
  ready: boolean;
  database: "up" | "down";
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      ready: true,
      database: "up"
    };
  } catch (error) {
    logError("health", "Readiness check failed - database unavailable", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return {
      ready: false,
      database: "down"
    };
  }
}
