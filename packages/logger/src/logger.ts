import type { LogAdapter, LogContext, LogEntry, Logger, LoggerConfig, LogLevel, LogMetadata } from "./types.js";

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  operational: 25,
  warn: 30,
  error: 40,
};

function normalizeError(error: unknown): LogEntry["error"] | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

export class AdapterLogger implements Logger {
  private readonly adapter: LogAdapter;
  private readonly serviceName: string;
  private readonly minLevel: LogLevel;
  private readonly baseContext?: LogContext;

  constructor(config: LoggerConfig, baseContext?: LogContext) {
    this.adapter = config.adapter;
    this.serviceName = config.serviceName;
    this.minLevel = config.minLevel ?? "debug";
    this.baseContext = baseContext;
  }

  debug(message: string, metadata?: LogMetadata, context?: LogContext) {
    this.write("debug", message, metadata, context);
  }

  info(message: string, metadata?: LogMetadata, context?: LogContext) {
    this.write("info", message, metadata, context);
  }

  warn(message: string, metadata?: LogMetadata, context?: LogContext) {
    this.write("warn", message, metadata, context);
  }

  operational(message: string, metadata?: LogMetadata, context?: LogContext) {
    this.write("operational", message, metadata, context);
  }

  error(message: string, error?: unknown, metadata?: LogMetadata, context?: LogContext) {
    this.write("error", message, metadata, context, error);
  }

  child(context: LogContext): Logger {
    return new AdapterLogger(
      { adapter: this.adapter, serviceName: this.serviceName, minLevel: this.minLevel },
      { ...this.baseContext, ...context }
    );
  }

  private write(level: LogLevel, message: string, metadata?: LogMetadata, context?: LogContext, error?: unknown) {
    if (levelWeights[level] < levelWeights[this.minLevel]) {
      return;
    }

    this.adapter.write({
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      metadata,
      context: {
        ...this.baseContext,
        ...context,
        service: context?.service ?? this.baseContext?.service ?? this.serviceName,
      },
      error: normalizeError(error),
    });
  }
}
