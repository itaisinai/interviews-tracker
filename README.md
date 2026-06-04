# Job Search CRM

A full-stack personal CRM for managing a senior software engineering job search. It tracks potential companies, active interview processes, calls, interviews, notes, prep tasks, company research, compensation, follow-ups, and optional migration from the original Google Sheets tracker.

## Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, React Query, React Hook Form
- Node.js, Express, TypeScript
- PostgreSQL, Prisma
- Google Sheets import abstraction for real sheet data
- OpenAI-backed AI parser abstraction with a local no-key fallback

## Setup

1. Install dependencies:

```sh
yarn install
```

2. Create local environment:

```sh
cp .env.example .env
```

3. Start PostgreSQL:

```sh
docker compose up -d
```

4. Run Prisma migration and seed data:

```sh
yarn db:migrate
yarn db:seed
```

5. Start the app:

```sh
yarn dev
```

The API runs on `http://localhost:4000/api` and the web app runs on `http://localhost:5173`.

## Product Model

The app intentionally does not model the search as one large spreadsheet. The core records are:

- `JobOpportunity`: one company and role opportunity.
- `Interaction`: every call, interview, assignment, follow-up, offer call, or rejection call.
- `Note`: flexible notes attached to an opportunity or interaction.
- `Task`: preparation and follow-up work.
- `Compensation`: optional offer and negotiation details.
- Option tables: editable company sizes, stages, domains, work models, interaction types, and interview stages.

The opportunities table stays compact and scannable with only: Company, Role, Status, Priority, Pipeline, Referrer / Connection, Next Interaction, Next Step, and Updated.

## Seed Data

The seed script includes:

- Notch as an active process, with recruiter-call interaction and prep task.
- Potential companies: Oligo, Buildots, Wiz, CrowdStrike, Amazon / Interets AI, Figma, Unity, AppsFlyer, Gong, Autodesk, Via, Google, and Daylight.
- Default option lists for company sizes, stages, domains, work models, interaction types, and interview stages.

## AI Parsing

Use the `Parse Job Description` page to paste unstructured job/company text. The backend endpoint is:

```http
POST /api/ai/parse-job-description
```

The parser returns a strict structured schema and the frontend shows a review screen before creating an opportunity. Nothing is saved automatically.

By default the backend uses `OpenAiParserService` when `OPENAI_API_KEY` is set. If credentials are missing, it falls back to `MockAiParserService` so local development still works. The parser is behind the `AiParserService` interface in `apps/api/src/services/ai-parser-service.ts`, so a LangChain implementation can replace the OpenAI direct client without changing routes.

Configure AI parsing in `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Available Companies

The `Companies` page aggregates every company mentioned in job opportunities and interactions. It is derived from PostgreSQL records, not demo data. Click a company to view:

- all roles/opportunities for that company
- company profile fields such as size, stage, domains, work model, location, funding, product, traction, and tech stack
- all interactions, notes, tasks, and compensation records connected to that company

The company detail page includes an `Enrich` action. Paste company research, recruiter text, website snippets, or job descriptions, and the backend uses the AI parser to extract structured company details such as office days, tech stack, domain, location, size, funding, and investment rounds. The extracted data is saved back onto all matching opportunities for that company.

## Migrating from Google Sheets

The original manual tracker was this Google Sheet:

https://docs.google.com/spreadsheets/d/1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM/edit

An additional job-links sheet can also be imported:

https://docs.google.com/spreadsheets/d/1-4J-fEjdjHx43xzqpbo8Bqu0gsC4V9t5i8gHuvC0hgo/edit?gid=0#gid=0

This application replaces that sheet with structured, PostgreSQL-backed tracking. Google Sheets is only a migration/import source, not the permanent database.

The Google Sheets import code is isolated in `GoogleSheetsImportService` and exposes:

- `getSpreadsheetMetadata(spreadsheetId)`
- `getSheetRows(spreadsheetId, sheetName)`
- `mapRowsToJobOpportunities(rows)`
- `importJobOpportunitiesFromSheet(spreadsheetId)`

The import page is available at `/import`. It shows whether import is disabled or connected with real credentials. Preview shows mapped opportunities before writing to PostgreSQL when the Google Sheets API is connected. Import skips duplicates with the same `companyName + roleTitle`.

Job posting links are imported into `jobUrl` when the sheet has a column such as `Job URL`, `Job Link`, `Link`, `URL`, `Posting`, `Job Posting`, `Role Link`, or `Application Link`. Cells with `=HYPERLINK("https://...", "label")` formulas are also supported. Imported links are visible in the opportunities table, opportunity detail page, and company detail page.

## Enabling Real Google Sheets Import

The app works without Google credentials, but Google Sheets import requires real service account credentials. If credentials are missing, the import page reports that import is disabled and does not show fabricated sheet rows.

1. In Google Cloud Console, create or select a project.
2. Enable the official Google Sheets API.
3. Create a service account.
4. Create a JSON key for the service account.
5. Share the source Google Sheet with the service account email using viewer access.
6. Update `.env`:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_SHEET_ID=1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM
GOOGLE_JOB_LINKS_SHEET_ID=1-4J-fEjdjHx43xzqpbo8Bqu0gsC4V9t5i8gHuvC0hgo
```

7. Restart the API.
8. Open `/import`, click `Test connection`, then `Preview import`, then `Import opportunities`.

To import the job-links sheet, paste `1-4J-fEjdjHx43xzqpbo8Bqu0gsC4V9t5i8gHuvC0hgo` into the import page spreadsheet ID field, or temporarily set `GOOGLE_SHEET_ID` to that value before running the CLI import.

You can also run:

```sh
yarn import:google-sheets
```

## Scripts

- `yarn dev`: start API and web app.
- `yarn build`: build API and frontend.
- `yarn typecheck`: TypeScript validation.
- `yarn db:migrate`: run Prisma migrations.
- `yarn db:seed`: seed local data.
- `yarn import:google-sheets`: run the import service from the CLI.

## Environment

See `.env.example` for all variables. PostgreSQL remains the source of truth.
