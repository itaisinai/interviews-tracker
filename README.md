# Job Search CRM

[![CI](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml)

A full-stack personal CRM for managing a senior software engineering job search. It tracks potential companies, active interview processes, calls, interviews, notes, prep tasks, company research, compensation, follow-ups, and optional migration from the original Google Sheets tracker.

## Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, React Query, React Hook Form
- Node.js, Express, TypeScript
- PostgreSQL, Prisma
- Google Sheets import abstraction for real sheet data
- OpenAI-backed AI parser abstraction with a local no-key fallback

## Local Setup

1. Install dependencies. This also runs `prisma generate` through the `postinstall` script:

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

4. Run Prisma migration:

```sh
yarn db:migrate
```

5. Start the app:

```sh
yarn dev
```

The API runs on `http://localhost:4000/api` and the web app runs on `http://localhost:5173`. Health checks are available at:

```sh
curl http://localhost:4000/health
curl http://localhost:4000/api/health
```

## Production Build

Run validation and build:

```sh
yarn typecheck
yarn build
```

`yarn build` regenerates Prisma Client, compiles the Express API to `dist/api`, and builds the Vite frontend to `dist/web`.

For a production database, run migrations with:

```sh
yarn db:migrate:deploy
```

Start the compiled API with:

```sh
yarn start:api
```

The Vite frontend is a static build in `dist/web`. For a local production preview:

```sh
yarn start:web
```

## Moving Existing Data To Neon

This project reads database configuration from `.env`. Shell commands like `psql "$DATABASE_URL"` do not automatically load `.env`, so `$DATABASE_URL` may be empty unless you load it first. Prefer the Yarn scripts below because they load `.env` safely and handle quoted values.

Restore and backup commands use PostgreSQL client tools: `psql` for restore and `pg_dump` for backup. If they are not installed locally, the scripts fall back to the Docker Compose `postgres` service.

1. Configure the original database and Neon target in `.env`:

```env
SOURCE_DATABASE_URL="postgresql://USER:PASSWORD@SOURCE_HOST/source_db"
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

`SOURCE_DATABASE_URL` is the original database containing real data. `DATABASE_URL` is the Neon database target. If the target URL does not include `sslmode=require`, the restore script adds it before connecting.

2. Export existing data from the source database:

```sh
yarn db:backup
```

This creates `backup-data.sql` using:

```sh
pg_dump "$SOURCE_DATABASE_URL" --data-only --no-owner --no-privileges --exclude-table=_prisma_migrations > backup-data.sql
```

The backup script fails if `SOURCE_DATABASE_URL` is missing, if `pg_dump` is unavailable, if the generated file is empty, or if all important application tables are empty. It checks `JobOpportunity`, `CompanySizeOption`, `DomainOption`, and `Interaction` before accepting the backup.

3. Run migrations against Neon:

```sh
yarn db:migrate:deploy
```

4. Restore the data into Neon:

```sh
yarn db:restore
```

By default this restores `backup-data.sql` from the project root using:

```sh
psql "$DATABASE_URL" < backup-data.sql
```

The restore script:

- fails if `.env` is missing
- fails if `DATABASE_URL` is empty or invalid
- fails if the backup file is missing or empty
- fails if the backup file contains `_prisma_migrations`
- prints the target host/database without printing the password
- runs `psql "$DATABASE_URL" < backup-data.sql`
- prints target counts after restore

5. Print source and target record counts:

```sh
yarn db:counts:source
yarn db:counts
```

These commands print counts for all Prisma models, including the `JobOpportunityDomain` join model. Use `yarn db:counts:source` before backup to confirm the source database actually contains data.

6. Verify imported data with Prisma Studio:

```sh
yarn prisma studio
```

7. Run the app against Neon:

```sh
yarn dev
```

The migration is successful when `yarn db:backup` creates a non-empty `backup-data.sql`, `yarn db:migrate:deploy` succeeds against Neon, `yarn db:restore` succeeds, Prisma Studio shows migrated records, and the app displays the same opportunities, notes, tasks, and interactions as before.

### Troubleshooting Neon Migration

If `backup-data.sql` contains `COPY 0` for the application tables, `SOURCE_DATABASE_URL` is probably pointing at the wrong or empty database. Run:

```sh
yarn db:counts:source
```

If the source counts are zero, fix `SOURCE_DATABASE_URL` before running `yarn db:backup` again.

If `yarn db:backup` or `yarn db:restore` reports that `pg_dump` or `psql` is unavailable and Docker fallback is unavailable, install PostgreSQL client tools locally or start the Docker Compose Postgres service.

If restore fails with duplicate `_prisma_migrations` keys, the backup was created by an older command that included Prisma migration metadata. Recreate it with:

```sh
yarn db:backup
```

## Product Model

The app intentionally does not model the search as one large spreadsheet. The core records are:

- `JobOpportunity`: one company and role opportunity.
- `Interaction`: every call, interview, assignment, follow-up, offer call, or rejection call.
- `Note`: flexible notes attached to an opportunity or interaction.
- `Task`: preparation and follow-up work.
- `Compensation`: optional offer and negotiation details.
- Option tables: editable company sizes, stages, domains, work models, interaction types, and interview stages.

The opportunities table stays compact and scannable with only: Company, Role, Status, Priority, Pipeline, Referrer / Connection, Next Interaction, Next Step, and Updated.

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
- `yarn build`: generate Prisma Client, build API, and build frontend.
- `yarn typecheck`: TypeScript validation.
- `yarn prisma:generate`: generate Prisma Client.
- `yarn db:migrate`: run Prisma migrations.
- `yarn db:migrate:deploy`: apply migrations in production/deployment.
- `yarn db:restore`: restore `backup-data.sql` into the configured database.
- `yarn db:backup`: write a SQL backup from `SOURCE_DATABASE_URL`.
- `yarn db:counts:source`: print all Prisma model counts from `SOURCE_DATABASE_URL`.
- `yarn db:counts`: print all Prisma model counts from `DATABASE_URL`.
- `yarn db:verify`: alias for `yarn db:counts`.
- `yarn start:api`: start the compiled API from `dist/api`.
- `yarn start:web`: preview the built frontend from `dist/web`.
- `yarn import:google-sheets`: run the import service from the CLI.

## Environment

See `.env.example` for all variables. PostgreSQL remains the source of truth.
