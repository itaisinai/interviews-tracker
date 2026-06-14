# Job Search CRM

[![CI](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml)

A full-stack personal CRM for managing a senior software engineering job search. It tracks potential companies, active interview processes, calls, interviews, notes, prep tasks, company research, compensation, and follow-ups.

## Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, React Query, React Hook Form
- Node.js, Express, TypeScript
- PostgreSQL, Prisma
- OpenAI-backed AI parser for job and company ingestion

## Package Boundaries

The repo uses Yarn workspaces with bounded-context packages under `packages/`:

- `@interviews-tracker/core`: CRM domain types, enums, and shared DTOs
- `@interviews-tracker/ai`: job parsing, email parsing, and company research contracts plus prompt/skill builders
- `@interviews-tracker/integrations`: Gmail and web-research DTOs and pure integration helpers
- `@interviews-tracker/api-client`: browser-safe typed API client

Dependency direction is intentionally one-way:

```text
apps -> packages
api-client -> core, ai, integrations
ai -> core
integrations -> core
core -> none
```

The React UI stays in `apps/web`. Reusable UI packages are not extracted unless they are clearly worth the extra boundary.

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

`yarn dev` first builds the internal workspace packages to `packages/*/dist`, then keeps those package builds running in watch mode while `tsx` runs the API and Vite runs the web app. Vite still aliases workspace imports to package source for fast frontend development; the API imports the compiled package outputs that match production Node resolution.

The API runs on `http://localhost:4000/api` and the web app runs on `http://localhost:5173`. Health checks are available at:

```sh
curl http://localhost:4000/health
curl http://localhost:4000/api/health
```

## Local Environment Setup

Use the repository root `.env` file for local development. The API reads that file through `dotenv/config`, and the Vite frontend reads the same root file through `envDir` in `apps/web/vite.config.ts`.

Do not use `apps/web/.env` unless you intentionally want to override the normal setup. The frontend only sees `VITE_*` variables, while non-`VITE_*` variables are backend-only.

Run `yarn env:check` after editing env vars. Restart `yarn dev` after env changes so both processes reload the updated values.

## Visual Testing

Storybook visual regression tests run inside the same Playwright Docker image in local development and CI.

Use these commands:

```sh
yarn test:visual
yarn test:visual:update
```

Both commands automatically launch the Docker-backed runner. Do not update snapshots directly on macOS if you want CI to match local output. For debugging only, there is also:

```sh
yarn test:visual:local
```

CI uploads `test-results/`, `playwright-report/`, and visual diff images when the suite fails.

## Production Build

Run validation and build:

```sh
yarn typecheck
yarn build
```

`yarn build` regenerates Prisma Client, compiles internal workspace packages to `packages/*/dist`, compiles the Express API to `dist/api`, and builds the Vite frontend to `dist/web`. Package exports point at compiled JS and declarations, so production Node does not load `packages/*/src/*.ts`.

For an API-only deployment, `yarn build:api` is safe to run directly: it regenerates Prisma Client, builds the internal workspace packages first, then compiles the Express API.

For a production database, run migrations with:

```sh
yarn db:migrate:deploy
```

Start the compiled API with:

```sh
node scripts/start-api.mjs
```

`yarn start:api` runs the same Node script for local convenience, but Render can call Node directly to avoid a runtime Corepack/Yarn download.

The Vite frontend is a static build in `dist/web`. For a local production preview:

```sh
yarn start:web
```

## Production Deployment

Target deployment:

- Frontend: Vercel
- API: Render
- Database: Neon

### Neon

1. Create a Neon Postgres database.
2. Copy the pooled or direct connection string.
3. Make sure the connection string includes SSL, for example `sslmode=require`.

### Render API

Create a Render Web Service for the Express API.

Recommended Render settings:

- Runtime: Node
- Build command: `yarn install --immutable && yarn build:api`
- Start command: `node scripts/start-api.mjs`
- Health check path: `/health`

Set these Render environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
FRONTEND_ORIGIN=https://interviews-tracker.vercel.app
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://interviews-tracker-api
ALLOWED_EMAIL=you@example.com
```

Run Neon migrations from your machine or from Render before using the API:

```sh
yarn db:migrate:deploy
```

The API serves routes under `/api`, so the production API base URL for the frontend should look like:

```text
https://interviews-tracker-api.onrender.com/api
```

### Vercel Frontend

Create a Vercel project for the Vite app.

Recommended Vercel settings:

- Framework preset: Vite
- Build command: `yarn build:web`
- Output directory: `dist/web`

The repo also ships a root `vercel.json` that pins the install and build commands to Corepack + Yarn 4, so Vercel and CI use the same package manager.

If you need to debug a Yarn/Corepack mismatch locally or in CI, run:

```sh
node scripts/debug-yarn-env.mjs
```

If Vercel ever resolves Yarn 1 again, check the deployment log for the install command. It must invoke `corepack yarn ...` explicitly; `corepack prepare` alone is not enough when the platform has a global Yarn 1 binary on PATH.

Set this Vercel environment variable:

```env
VITE_API_BASE_URL=https://interviews-tracker-api.onrender.com/api
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://interviews-tracker-api
VITE_ALLOWED_EMAIL=you@example.com
```

After the Vercel URL is known, update Render's `FRONTEND_ORIGIN` to that exact origin, without a trailing path.

### Auth0

Create an Auth0 Single Page Application for the Vite frontend and enable the Google social connection for it. Configure these application URLs:

```text
Allowed Callback URLs:
http://localhost:5173, https://interviews-tracker.vercel.app

Allowed Logout URLs:
http://localhost:5173, https://interviews-tracker.vercel.app

Allowed Web Origins:
http://localhost:5173, https://interviews-tracker.vercel.app
```

Create an Auth0 API with the identifier used by `VITE_AUTH0_AUDIENCE` and `AUTH0_AUDIENCE`, for example:

```text
https://interviews-tracker-api
```

The backend validates Auth0 access tokens against that audience and issuer. It also restricts data access to `ALLOWED_EMAIL`. Auth0 access tokens for custom APIs do not always include `email` by default, so add an Auth0 Action that adds a namespaced email claim to the access token:

```js
exports.onExecutePostLogin = async (event, api) => {
  if (event.authorization) {
    api.accessToken.setCustomClaim("https://interviews-tracker/email", event.user.email);
  }
};
```

Set `VITE_ALLOWED_EMAIL` and `ALLOWED_EMAIL` to the same Google account email. The frontend blocks other authenticated users with an Access Denied screen, and the API returns `403` when the token email claim does not match. Requests without a valid bearer token return `401`.

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

The backend always uses `OpenAiParserService`. Set `OPENAI_API_KEY` locally and in deployment. The parser is behind the `AiParserService` interface in `apps/api/src/services/ai-parser-service.ts`, so a different OpenAI-facing implementation can replace the direct client without changing routes.

Configure AI parsing in `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Local environment variables should live in the repository root `.env` file. Vite reads that file through `envDir`, so the frontend can see the `VITE_*` Auth0 variables there without duplicating them under `apps/web`.

## Available Companies

The `Companies` page aggregates every company mentioned in job opportunities and interactions. It is derived from PostgreSQL records, not demo data. Click a company to view:

- all roles/opportunities for that company
- company profile fields such as size, stage, domains, work model, location, funding, product, traction, and tech stack
- all interactions, notes, tasks, and compensation records connected to that company

The company detail page includes a `Research company` tool. It searches public sources for missing company facts and then shows a reviewable result with citations before saving the extracted data back onto matching opportunities for that company.

## Company Research

The company and opportunity detail pages include a `Research company` tool for filling missing company data from public web sources. It uses the Exa search API as the default provider and then asks OpenAI to structure the evidence into reviewable CRM fields.

Set these local environment variables in the repository root `.env`:

```env
COMPANY_RESEARCH_PROVIDER=exa
EXA_API_KEY=...
OPENAI_API_KEY=...
```

The tool only searches fields that are missing. If funding already exists on the record, it skips funding research. When the research run completes, the UI shows the extracted result and source URLs before anything is saved.

## Gmail Interaction Import

The Opportunity page includes an `Add interaction from Gmail` flow. It uses a separate Google OAuth consent screen with read-only Gmail access and does not reuse the Auth0 login token. Gmail connections are per Auth0 email address and are stored in the `GmailConnection` table. The refresh token is encrypted with AES-256-GCM using `GMAIL_TOKEN_ENCRYPTION_KEY`; full tokens and client secrets must never be logged.

Set these local environment variables in the repository root `.env`:

```env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:4000/api/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=...
```

For local development, add `http://localhost:4000/api/gmail/callback` to the Google Cloud OAuth client's authorized redirect URIs. In production, set `GMAIL_REDIRECT_URI` to the deployed API callback, for example `https://api.example.com/api/gmail/callback`, and add that exact URI to the same OAuth client. Enable the Gmail API in Google Cloud.

The flow starts with `POST /api/gmail/connect`, which returns a Google authorization URL with `access_type=offline`, `prompt=consent`, and `include_granted_scopes=true` so reconnects can receive a fresh refresh token. Google redirects back to `GET /api/gmail/callback`, where the API exchanges the code for tokens, fetches the Gmail profile, stores the encrypted refresh token, saves the granted scope string, and clears any previous reconnect-required state. The app checks `GET /api/gmail/status` before Gmail actions; that endpoint returns whether Gmail is configured, connected, needs reconnect, the connected Google email, last error, last connected timestamp, and scopes.

`invalid_grant` means Google rejected the stored refresh token. Common causes are the user revoked access, the Google OAuth client changed, the app was in testing mode and the token aged out, the account password/security posture changed, or the refresh token was superseded. When this happens during token refresh, the backend marks the connection as `needsReconnect`, maps the error to `GMAIL_RECONNECT_REQUIRED`, and the UI shows “Your Gmail connection expired or was revoked. Please reconnect Gmail.” with a `Reconnect Gmail` button instead of making retry the primary action. Reconnecting restarts the OAuth consent flow and replaces the stored refresh token when Google returns one.

## Scripts

- `yarn dev`: start API and web app.
- `yarn build`: generate Prisma Client, build internal packages, build API, and build frontend.
- `yarn build:api`: generate Prisma Client, build internal packages, and compile the API for API-only deploys.
- `yarn build:api:compile`: compile only the API after internal package `dist` outputs already exist.
- `yarn typecheck`: TypeScript validation.
- `yarn prisma:generate`: generate Prisma Client.
- `yarn db:migrate`: run Prisma migrations.
- `yarn db:migrate:deploy`: apply migrations in production/deployment.
- `yarn start:api`: start the compiled API from `dist/api`.
- `yarn start:web`: preview the built frontend from `dist/web`.

## Environment

See `.env.example` for all variables. PostgreSQL remains the source of truth.
