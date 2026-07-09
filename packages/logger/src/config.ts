import { ConsoleLogAdapter, type ConsoleLogFormat } from "./adapters/console-adapter.js";
import { AdapterLogger } from "./logger.js";
import type { Logger, LogLevel } from "./types.js";

const logLevels = new Set<LogLevel>(["debug", "info", "operational", "warn", "error"]);
const logFormats = new Set<ConsoleLogFormat>(["json", "pretty"]);

function readLogLevel(value: string | undefined): LogLevel | undefined {
  return value && logLevels.has(value as LogLevel) ? (value as LogLevel) : undefined;
}

function readLogFormat(value: string | undefined): ConsoleLogFormat | undefined {
  return value && logFormats.has(value as ConsoleLogFormat) ? (value as ConsoleLogFormat) : undefined;
}

export function createConsoleLoggerFromEnv(serviceName = process.env.LOG_SERVICE_NAME ?? "interviews-tracker"): Logger {
  return new AdapterLogger({
    adapter: new ConsoleLogAdapter({ format: readLogFormat(process.env.LOG_FORMAT) ?? "json" }),
    serviceName,
    minLevel: readLogLevel(process.env.LOG_LEVEL) ?? "debug",
  });
}
