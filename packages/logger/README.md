# `@interviews-tracker/logger`

Reusable logging abstraction for the Interviews Tracker monorepo.

## Architecture

Application code depends on the `Logger` interface exported by this package, not on a concrete vendor SDK. Logs are written through a `LogAdapter`:

```
backend code -> Logger interface -> LogAdapter -> provider destination
```

The default adapter is `ConsoleLogAdapter`, which writes structured logs to the console. A future Datadog, CloudWatch, OpenTelemetry, Sentry, or Elasticsearch integration should be implemented as a new adapter while leaving backend application code unchanged.

## Configuration

The default console logger reads these environment variables:

- `LOG_SERVICE_NAME` - service name attached to each log entry.
- `LOG_LEVEL` - minimum level: `debug`, `info`, `operational`, `warn`, or `error`.
- `LOG_FORMAT` - `json` for machine-readable logs or `pretty` for local development output.

## How to add logs

Import the backend logger wrapper and log a concise, searchable event name with metadata:

```ts
import { logger } from "../lib/logger.js";

logger.info("api_listening", { port });
logger.operational("interaction_added", { opportunityId, interactionId });
logger.error("create_opportunity_failed", error, { opportunityId });
```

Do not call `console.log`, `console.error`, vendor SDKs, or provider-specific APIs from backend code.

## Operational log convention

Operational events should be lowercase `snake_case`, describe a business or system event, and avoid free-form sentences. Prefer stable names that are easy to search later, for example:

- `create_opportunity_called`
- `create_opportunity_started`
- `create_opportunity_completed`
- `opportunity_updated`
- `interaction_added`
- `interaction_deleted`
- `email_sent`
- `webhook_received`
- `webhook_processed`
- `authentication_failed`

Use metadata for IDs and dimensions instead of interpolating them into the event name.

## Error logging best practices

Use `logger.error(message, error, metadata)` so the logger can capture the error message and stack trace:

```ts
try {
  await sendEmail(input);
} catch (error) {
  logger.error("email_send_failed", error, { opportunityId, provider: "gmail" });
  throw error;
}
```

Always rethrow unless the failure is intentionally recoverable. Do not log passwords, bearer tokens, refresh tokens, API keys, secrets, or raw request bodies.

## API request logging

The API server installs request logging middleware that records every request with:

- HTTP method
- route without query string
- status code
- duration in milliseconds
- request ID from `x-request-id` / `x-correlation-id`, or a generated one

The middleware intentionally avoids headers, bodies, query strings, and auth tokens.

## Replacing the logging provider

Create a new class that implements `LogAdapter`:

```ts
import type { LogAdapter, LogEntry } from "@interviews-tracker/logger";

export class DatadogLogAdapter implements LogAdapter {
  write(entry: LogEntry) {
    // Send `entry` to Datadog here.
  }
}
```

Then change only the logger composition point (currently the backend logger wrapper) to instantiate `AdapterLogger` with the new adapter. Application code continues calling the same `logger.debug`, `logger.info`, `logger.warn`, `logger.error`, and `logger.operational` methods.
