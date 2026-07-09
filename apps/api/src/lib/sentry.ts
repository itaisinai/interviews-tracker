/**
 * Sentry error tracking initialization
 * Must be imported as early as possible in the application
 */

import * as Sentry from "@sentry/node";

import { logger } from "./logger.js";

/**
 * Attempt to load profiling integration
 * Returns null if the native module is not available for this Node version
 */
function loadProfilingIntegration() {
  try {
    // Dynamic import to catch native module loading errors
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");
    return nodeProfilingIntegration();
  } catch (error) {
    logger.warn("sentry_profiling_unavailable", {
      message: "Profiling integration not available for this Node version",
      nodeVersion: process.version,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Initialize Sentry error tracking
 * Safe to call even if SENTRY_DSN is not configured
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  // Skip initialization if DSN is not configured
  if (!dsn) {
    logger.info("sentry_not_configured", {
      message: "SENTRY_DSN not set, error tracking disabled",
    });
    return;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";

  try {
    const integrations = [];

    // Add profiling if available
    const profiling = loadProfilingIntegration();
    if (profiling) {
      integrations.push(profiling);
    }

    Sentry.init({
      dsn,
      environment,
      integrations,
      // Performance Monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      // Profiling (only if integration is available)
      profilesSampleRate: profiling ? (environment === "production" ? 0.1 : 1.0) : 0,
    });

    logger.info("sentry_initialized", {
      environment,
      dsn: dsn.substring(0, 30) + "...", // Log partial DSN for verification
      profilingEnabled: !!profiling,
    });
  } catch (error) {
    logger.error("sentry_init_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Export Sentry for error capture
export { Sentry };
