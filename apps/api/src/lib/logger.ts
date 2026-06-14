import { createConsoleLoggerFromEnv, type LogContext, type LogMetadata } from "@interviews-tracker/logger";

export const logger = createConsoleLoggerFromEnv("interviews-tracker-api");

type Timer = {
  end(extraContext?: LogMetadata): void;
  fail(error: unknown, extraContext?: LogMetadata): void;
};

function toEventName(message: string, suffix: "started" | "completed" | "failed") {
  return `${message.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}_${suffix}`;
}

export function logInfo(scope: string, message: string, metadata?: LogMetadata) {
  logger.info(message, metadata, { service: "interviews-tracker-api", scope });
}

export function logError(scope: string, message: string, metadata?: LogMetadata) {
  logger.error(message, undefined, metadata, { service: "interviews-tracker-api", scope });
}

export function createTimer(scope: string, message: string, metadata?: LogMetadata, context?: LogContext): Timer {
  const startedAt = Date.now();
  const baseContext = { service: "interviews-tracker-api", scope, ...context };

  logger.operational(toEventName(message, "started"), metadata, baseContext);

  return {
    end(extraContext?: LogMetadata) {
      logger.operational(toEventName(message, "completed"), { ...metadata, ...extraContext, durationMs: Date.now() - startedAt }, baseContext);
    },
    fail(error: unknown, extraContext?: LogMetadata) {
      logger.error(toEventName(message, "failed"), error, { ...metadata, ...extraContext, durationMs: Date.now() - startedAt }, baseContext);
    }
  };
}
