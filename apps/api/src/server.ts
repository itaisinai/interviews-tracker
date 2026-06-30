// Load environment variables first (with Parameter Store fallback in production)
import { loadEnvironment } from "./config/env-loader.js";
await loadEnvironment();

// Import instrumentation to enable Sentry auto-instrumentation
import "./instrument.js";
import { Sentry } from "./lib/sentry.js";

// Validate environment after loading
import { validateEnvironment } from "./config/env-validation.js";
validateEnvironment();

import cors from "cors";
import express from "express";
import { aiRouter } from "./routes/ai.js";
import { adminRouter } from "./routes/admin.js";
import { companiesRouter } from "./routes/companies.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { gmailRouter } from "./routes/gmail.js";
import { healthRouter } from "./routes/health.js";
import { interactionsRouter } from "./routes/interactions.js";
import { jobImportsRouter } from "./routes/job-imports.js";
import { opportunitiesRouter } from "./routes/opportunities.js";
import { optionsRouter } from "./routes/options.js";
import { peopleRouter } from "./routes/people.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { telegramRouter } from "./routes/telegram.js";
import { requireAuth } from "./lib/auth.js";
import { errorHandler } from "./lib/http.js";
import { apiRequestLogger } from "./lib/request-logging.js";
import { logger } from "./lib/logger.js";
import { completeGmailOAuth } from "./services/gmail/gmail-service.js";
import { validateDevModeOnStartup } from "./lib/dev-mode.js";

// Store start time for diagnostics
process.env.START_TIME = new Date().toISOString();

const app = express();
const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5176", "http://127.0.0.1:5176"];
const productionOrigins = ["https://interviews-tracker.vercel.app"];
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const extensionOrigins = (process.env.CHROME_EXTENSION_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...productionOrigins, ...frontendOrigins, ...extensionOrigins, ...localOrigins]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Opportunity-Webhook-Secret", "X-Telegram-Bot-Api-Secret-Token"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(apiRequestLogger);
app.use(express.json({ limit: "2mb" }));

// Mount health routes (no auth required)
app.use("/health", healthRouter);
app.use("/api/health", healthRouter);

// Also register /ready at root level for load balancers (documented path)
app.get("/ready", async (_request, response) => {
  const { checkReadiness } = await import("./services/health/health-service.js");
  const readiness = await checkReadiness();
  if (readiness.ready) {
    response.status(200).json(readiness);
  } else {
    response.status(503).json(readiness);
  }
});
app.get("/api/ready", async (_request, response) => {
  const { checkReadiness } = await import("./services/health/health-service.js");
  const readiness = await checkReadiness();
  if (readiness.ready) {
    response.status(200).json(readiness);
  } else {
    response.status(503).json(readiness);
  }
});

app.get("/api/gmail/callback", async (request, response, next) => {
  try {
    const code = typeof request.query.code === "string" ? request.query.code : undefined;
    const state = typeof request.query.state === "string" ? request.query.state : undefined;
    const error = typeof request.query.error === "string" ? request.query.error : undefined;
    const frontendOrigin = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").split(",")[0] ?? "http://localhost:5173";

    if (error) {
      const redirect = new URL(frontendOrigin);
      redirect.searchParams.set("gmailError", error);
      response.redirect(redirect.toString());
      return;
    }

    if (!code || !state) {
      const redirect = new URL(frontendOrigin);
      redirect.searchParams.set("gmailError", "Missing Gmail OAuth code or state.");
      response.redirect(redirect.toString());
      return;
    }

    const { redirectTo } = await completeGmailOAuth(code, state);
    response.redirect(redirectTo);
  } catch (caughtError) {
    logger.error("gmail_oauth_callback_failed", caughtError);
    const frontendOrigin = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").split(",")[0] ?? "http://localhost:5173";
    const redirect = new URL(frontendOrigin);
    redirect.searchParams.set("gmailError", caughtError instanceof Error ? caughtError.message : "Gmail connection failed");
    response.redirect(redirect.toString());
  }
});
app.use("/webhooks", webhooksRouter);
app.use("/api", requireAuth);
app.use("/api/admin", adminRouter);
app.use("/api/gmail", gmailRouter);
app.use("/api/integrations/gmail", gmailRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/interactions", interactionsRouter);
app.use("/api/job-imports", jobImportsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/options", optionsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/people", peopleRouter);
app.use("/api/telegram", telegramRouter);

// Debug endpoint for Sentry (non-production only)
if (process.env.NODE_ENV !== "production") {
  app.get("/debug/sentry", (_request, _response) => {
    throw new Error("Sentry test error - this is intentional");
  });
}

// Setup Sentry error handler - must be after all routes and before other error handlers
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

// Validate dev mode configuration before starting server
validateDevModeOnStartup();

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  logger.info("api_listening", { port });
});
