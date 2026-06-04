import "dotenv/config";
import cors from "cors";
import express from "express";
import { aiRouter } from "./routes/ai.js";
import { compensationRouter } from "./routes/compensation.js";
import { companiesRouter } from "./routes/companies.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { importGoogleSheetsRouter } from "./routes/import-google-sheets.js";
import { interactionsRouter } from "./routes/interactions.js";
import { notesRouter } from "./routes/notes.js";
import { opportunitiesRouter } from "./routes/opportunities.js";
import { optionsRouter } from "./routes/options.js";
import { tasksRouter } from "./routes/tasks.js";
import { errorHandler } from "./lib/http.js";

const app = express();
const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"];
const frontendOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...frontendOrigins, ...localOrigins]);

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
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => response.json({ ok: true, service: "api" }));
app.get("/api/health", (_request, response) => response.json({ ok: true, service: "api" }));
app.use("/api/dashboard", dashboardRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/interactions", interactionsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/notes", notesRouter);
app.use("/api/compensation", compensationRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/options", optionsRouter);
app.use("/api/import/google-sheets", importGoogleSheetsRouter);
app.use("/api/ai", aiRouter);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
