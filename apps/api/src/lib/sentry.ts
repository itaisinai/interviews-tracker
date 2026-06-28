/**
 * Sentry error tracking initialization
 * Must be imported as early as possible in the application
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger.js";

/**
 * Initialize Sentry error tracking
 * Safe to call even if SENTRY_DSN is not configured
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  // Skip initialization if DSN is not configured
  if (!dsn) {
    logger.info("sentry_not_configured", {
      message: "SENTRY_DSN not set, error tracking disabled"
    });
    return;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";

  try {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: environment === "production" ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: environment === "production" ? 0.1 : 1.0,
    });

    logger.info("sentry_initialized", {
      environment,
      dsn: dsn.substring(0, 30) + "..." // Log partial DSN for verification
    });
  } catch (error) {
    logger.error("sentry_init_failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// Export Sentry for middleware and error capture
export { Sentry };

// Export middleware functions
export {
  requestHandler,
  errorHandler as sentryErrorHandler,
  tracingHandler
} from "@sentry/node";
