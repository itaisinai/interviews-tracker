type LogContext = Record<string, string | number | boolean | null | undefined>;

const useColors = process.stdout.isTTY && process.env.NO_COLOR !== "1";

const ansi = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  blue: "\u001b[34m",
  gray: "\u001b[90m"
} as const;

function paint(text: string, color: keyof typeof ansi) {
  return useColors ? `${ansi[color]}${text}${ansi.reset}` : text;
}

function formatContext(context?: LogContext) {
  if (!context) {
    return "";
  }

  const parts = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.length > 0)
    .map(([key, value]) => `${key}=${value}`);

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function logInfo(scope: string, message: string, context?: LogContext) {
  console.info(`${paint(new Date().toISOString(), "dim")} ${paint(`[${scope}]`, "blue")} ${paint(message, "blue")}${formatContext(context)}`);
}

export function logError(scope: string, message: string, context?: LogContext) {
  console.error(`${paint(new Date().toISOString(), "dim")} ${paint(`[${scope}]`, "blue")} ${paint(message, "red")}${formatContext(context)}`);
}

export function createTimer(scope: string, message: string, context?: LogContext) {
  const startedAt = Date.now();
  logInfo(scope, `${message} start`, context);

  return {
    end(extraContext?: LogContext) {
      logInfo(scope, `${message} done`, { ...context, ...extraContext, durationMs: Date.now() - startedAt });
    },
    fail(error: unknown, extraContext?: LogContext) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logError(scope, `${message} failed`, { ...context, ...extraContext, durationMs: Date.now() - startedAt, error: errorMessage });
    }
  };
}
