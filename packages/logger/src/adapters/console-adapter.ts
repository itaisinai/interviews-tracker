import type { LogAdapter, LogEntry, LogLevel } from "../types.js";

export type ConsoleLogFormat = "json" | "pretty";

export interface ConsoleLogAdapterOptions {
  format?: ConsoleLogFormat;
}

const levelToConsoleMethod: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  debug: "debug",
  info: "info",
  operational: "info",
  warn: "warn",
  error: "error"
};

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefined(entryValue)])
    );
  }

  return value;
}

function formatKeyValue(metadata: Record<string, unknown> | undefined) {
  if (!metadata) {
    return "";
  }

  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.length > 0)
    .map(([key, value]) => `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" ");
}

export class ConsoleLogAdapter implements LogAdapter {
  private readonly format: ConsoleLogFormat;

  constructor(options: ConsoleLogAdapterOptions = {}) {
    this.format = options.format ?? "json";
  }

  write(entry: LogEntry) {
    const method = levelToConsoleMethod[entry.level];
    const payload = removeUndefined(entry);

    if (this.format === "pretty") {
      const context = formatKeyValue(entry.context);
      const metadata = formatKeyValue(entry.metadata);
      const error = entry.error ? ` error=${entry.error.message}${entry.error.stack ? ` stack=${JSON.stringify(entry.error.stack)}` : ""}` : "";
      console[method](`[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.service} ${entry.message}${context ? ` ${context}` : ""}${metadata ? ` ${metadata}` : ""}${error}`);
      return;
    }

    console[method](JSON.stringify(payload));
  }
}
