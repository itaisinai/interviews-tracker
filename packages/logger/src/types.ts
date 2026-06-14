export type LogLevel = "debug" | "info" | "warn" | "error" | "operational";

export type LogMetadata = Record<string, unknown>;

export interface LogContext extends LogMetadata {
  requestId?: string;
  service?: string;
  route?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  context?: LogContext;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  service: string;
}

export interface LogAdapter {
  write(entry: LogEntry): void;
}

export interface Logger {
  debug(message: string, metadata?: LogMetadata, context?: LogContext): void;
  info(message: string, metadata?: LogMetadata, context?: LogContext): void;
  warn(message: string, metadata?: LogMetadata, context?: LogContext): void;
  operational(message: string, metadata?: LogMetadata, context?: LogContext): void;
  error(message: string, error?: unknown, metadata?: LogMetadata, context?: LogContext): void;
  child(context: LogContext): Logger;
}

export interface LoggerConfig {
  adapter: LogAdapter;
  serviceName: string;
  minLevel?: LogLevel;
}
