/**
 * Sentry instrumentation entrypoint
 * This file must be imported BEFORE any other application code
 * to ensure auto-instrumentation can hook into Express and other modules
 */

import "dotenv/config";

import { initSentry } from "./lib/sentry.js";

initSentry();
