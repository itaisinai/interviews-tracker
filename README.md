# Job Search CRM

[![CI](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml)

A full-stack personal CRM for managing a senior software engineering job search. It tracks potential companies, active interview processes, calls, interviews, notes, prep tasks, company research, compensation, and follow-ups.

## For AI Assistants

This repository has a comprehensive Claude Code operating system to ensure consistency across sessions:

- **[.claude/CLAUDE.md](.claude/CLAUDE.md)** - Primary context: product philosophy, UX architecture, engineering principles, design system governance, and required workflows
- **[.claude/skills/](.claude/skills/)** - Specialized validation skills:
  - `architecture-guardian` - Detect duplication, validate layering, check boundaries
  - `design-system-enforcer` - Identify reusable patterns, enforce token usage
  - `product-owner` - Protect product direction, optimize workflows
  - `ai-workflow-optimizer` - Ensure AI features follow best practices
  - `system-improvement-reviewer` - Comprehensive pre-commit quality check

**Start every session by reading `.claude/CLAUDE.md`**

See also:
- `docs/product-philosophy.md` - Core product decisions
- `docs/ux-patterns.md` - Component usage matrix and workflow patterns
- `docs/engineering-decisions.md` - Architectural decision records
- `docs/architecture.md` - Technical layering and boundaries
- `docs/design-system.md` - Component structure and tokens

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

The API runs on `http://localhost:4000/api` and the web app runs on `http://localhost:5173`.

## Health & Monitoring Endpoints

### Frontend Health Check

The Vite frontend (deployed on Vercel) has a static health endpoint:

**GET /health**

Returns:
```json
{
  "ok": true,
  "service": "web"
}
```

**Production URL:** https://interviews-tracker.vercel.app/health

**UptimeRobot Configuration:**
- Monitor URL: `https://interviews-tracker.vercel.app/health`
- Monitor type: Keyword
- Keyword to monitor: `"service":"web"`

This endpoint returns a static JSON file (not the SPA index.html) to verify the Vercel deployment is serving files correctly.

---

### API Health Endpoints

The API provides multiple health endpoints for different monitoring needs:

### `/health` - Basic Health Check

Lightweight endpoint for uptime monitoring (e.g., UptimeRobot, Pingdom).

- **Always fast** (< 5ms)
- **No database queries**
- **Always returns 200** when API is running

```sh
curl http://localhost:4000/health
curl http://localhost:4000/api/health
```

Response:
```json
{
  "ok": true,
  "service": "api",
  "version": "0.1.0",
  "uptimeSeconds": 12345,
  "timestamp": "2026-06-28T...",
  "environment": "production"
}
```

**Use for:** External uptime monitoring, deployment health checks

### `/health/deep` - Deep Health Check

Verifies database connectivity and system readiness.

- **Performs database query** (`SELECT 1`)
- **Returns 200** if healthy, **503** if database is down
- **Includes latency metrics**

```sh
curl http://localhost:4000/health/deep
curl http://localhost:4000/api/health/deep
```

Success response (200):
```json
{
  "ok": true,
  "database": "up",
  "latencyMs": 15
}
```

Failure response (503):
```json
{
  "ok": false,
  "database": "down",
  "latencyMs": 5000,
  "error": "Database unavailable"
}
```

**Use for:** Infrastructure monitoring, alerting on database issues

### `/ready` - Readiness Check

Kubernetes/load balancer readiness probe.

- **Returns 200** only if API is fully operational
- **Returns 503** if not ready to serve traffic
- **Checks database connectivity**

```sh
curl http://localhost:4000/ready
curl http://localhost:4000/api/ready
```

Success response (200):
```json
{
  "ready": true,
  "database": "up"
}
```

Failure response (503):
```json
{
  "ready": false,
  "database": "down"
}
```

**Use for:** Load balancer health checks, orchestration readiness probes

### Recommended Monitoring Setup

| Service | Tool | Endpoint | Purpose |
|---------|------|----------|---------|
| **Frontend** | UptimeRobot | `https://interviews-tracker.vercel.app/health` | Vercel deployment uptime (keyword: `"service":"web"`) |
| **API** | UptimeRobot | `https://api.example.com/health` | API uptime monitoring |
| **API** | Datadog/New Relic | `https://api.example.com/health/deep` | Infrastructure health & alerting |
| **API** | Kubernetes/ECS | `https://api.example.com/ready` | Readiness probes |
| **API** | GitHub Actions | `http://localhost:4000/health` | Deployment verification |

## Local Environment Setup

Use the repository root `.env` file for local development. The API reads that file through `dotenv/config`, and the Vite frontend reads the same root file through `envDir` in `apps/web/vite.config.ts`.

Do not use `apps/web/.env` unless you intentionally want to override the normal setup. The frontend only sees `VITE_*` variables, while non-`VITE_*` variables are backend-only.

Run `yarn env:check` after editing env vars. Restart `yarn dev` after env changes so both processes reload the updated values.

### Local Database Setup

For local development (especially with dev mode), run PostgreSQL locally using Docker:

```sh
# Start local database
docker compose up -d

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with test data
npx prisma db seed
```

The local database runs on `localhost:5433` with credentials from `docker-compose.yml`. Update your `.env`:

```env
DATABASE_URL=postgresql://jobcrm:jobcrm@localhost:5433/jobcrm
```

To stop the database:

```sh
docker compose down
```

To reset the database (deletes all data):

```sh
docker compose down -v
docker compose up -d
npx prisma migrate deploy
```

## Development Mode (Authentication Bypass)

For local development and testing, you can bypass Auth0 authentication and use a test user.

**⚠️ WARNING**: This should ONLY be used in local development. Never enable in production.

### Enabling Dev Mode

Add these variables to your root `.env` file:

```env
DEV_MODE_BYPASS_AUTH=true
DEV_MODE_USER_EMAIL=dev@local.test

VITE_DEV_MODE_BYPASS_AUTH=true
VITE_DEV_MODE_USER_EMAIL=dev@local.test
```

Then start the app:

```sh
yarn dev
```

When dev mode is enabled:
- ✅ No Auth0 configuration needed
- ✅ Automatic "dev@local.test" user for all requests
- ✅ Separate data from your production user
- ✅ Prominent visual indicator (yellow banner)
- ✅ Console warnings for awareness

### Safety Features

Dev mode includes multiple safeguards:
- Only works with local databases (localhost, 127.0.0.1, docker)
- Server refuses to start if DATABASE_URL points to production
- Server refuses to start if NODE_ENV=production
- Logs all dev mode authentications
- Shows prominent warnings in console and UI

### Switching Back to Auth0

Simply set `DEV_MODE_BYPASS_AUTH=false` (or remove it) from `.env`, then restart `yarn dev`.

### Use Cases

Dev mode is ideal for:
- AI assistants testing the app without Auth0 setup
- Rapid local development without login flows
- Testing data isolation with multiple users
- Running automated tests

### Data Isolation

All data created in dev mode is associated with the dev user email (`dev@local.test`). This is completely separate from your production data (`itai.sinai@gmail.com`). You can switch between dev mode and Auth0 mode to see the data separation in action.

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

The API serves routes under `/api`, so the production API base URL for the frontend is:

```text
https://interviews-api.trackylab.com/api
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
VITE_API_BASE_URL=https://interviews-api.trackylab.com/api
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://interviews-tracker-api
VITE_ALLOWED_EMAIL=you@example.com
```

After the Vercel URL is known, update the API's `FRONTEND_ORIGIN` environment variable to that exact origin, without a trailing path.

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


## Telegram Opportunity Import

The API exposes two unauthenticated-by-Auth0 webhook endpoints protected by shared-secret headers:

- `POST /webhooks/telegram`: receives Telegram bot updates. Telegram should send the `X-Telegram-Bot-Api-Secret-Token` header, and the value must match `TELEGRAM_WEBHOOK_SECRET_TOKEN`.
- `POST /webhooks/opportunities/telegram`: receives normalized opportunity text from the Telegram handler. Callers must send `X-Opportunity-Webhook-Secret`, and the value must match `OPPORTUNITY_WEBHOOK_SECRET`.

When a Telegram text message arrives, the Telegram webhook forwards the message text to `TELEGRAM_BACKEND_WEBHOOK_URL`. The backend webhook validates the body, parses the free text with the existing OpenAI job parser, maps the parsed result into the existing opportunity input schema, and creates the record through the same create-opportunity service used by `POST /api/opportunities`. The bot replies in Telegram with a success or failure message.

Set these environment variables in the repository root `.env` and in production:

```env
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
TELEGRAM_WEBHOOK_SECRET_TOKEN=random-telegram-secret-token
TELEGRAM_BACKEND_WEBHOOK_URL=http://localhost:4000/webhooks/opportunities/telegram
OPPORTUNITY_WEBHOOK_SECRET=random-shared-backend-secret
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

For local manual testing, start the API and post directly to the backend webhook:

```sh
curl -X POST http://localhost:4000/webhooks/opportunities/telegram \
  -H 'Content-Type: application/json' \
  -H "X-Opportunity-Webhook-Secret: $OPPORTUNITY_WEBHOOK_SECRET" \
  -d '{"text":"Recruiter reached out from ExampleCo for a Senior Backend Engineer role. Stack Node.js and PostgreSQL. Next step is to reply with availability."}'
```

To connect Telegram, expose the API publicly and register the bot webhook with Telegram using the same secret token:

```sh
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'Content-Type: application/json' \
  -d "{\"url\":\"https://your-api.example.com/webhooks/telegram\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET_TOKEN\"}"
```

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

`invalid_grant` means Google rejected the stored refresh token. Common causes are the user revoked access, the Google OAuth client changed, the app was in testing mode and the token aged out, the account password/security posture changed, or the refresh token was superseded. When this happens during token refresh, the backend marks the connection as `needsReconnect`, maps the error to `GMAIL_RECONNECT_REQUIRED`, and the UI shows “Your Gmail connection expired or was revoked. Please reconnect Gmail.” with a `Reconnect Gmail` button instead of making retry the primary action. Reconnecting restarts the OAuth consent flow and must replace the stored refresh token when the connection is already marked reconnect-required. If Google omits `refresh_token` during reconnect, the callback fails instead of clearing `needsReconnect` and continuing to use a revoked token. If Google omits `refresh_token` for an otherwise healthy same-account callback, the backend first verifies that the preserved refresh token still refreshes successfully before clearing any error state.

Settings → Integrations → Gmail shows the current connection state: “🟢 Connected” with last activity, `Reconnect`, and `Disconnect` controls when healthy, or “🔴 Connection expired” with `Reconnect Gmail` when authorization has expired. Disconnect deletes the per-user stored Gmail connection; reconnecting does not require manual database edits.

To verify a real production `invalid_grant` root cause end-to-end, inspect the failing user's safe refresh logs and Google Cloud OAuth client before changing data manually:

1. Confirm the stored token decrypts with the current `GMAIL_TOKEN_ENCRYPTION_KEY`; if decryption fails, the encryption key changed.
2. Refresh the stored token once with the current `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`; `invalid_client` indicates bad client credentials, while `invalid_grant` means Google rejected that refresh token for this client.
3. Verify `GMAIL_REDIRECT_URI` exactly matches an authorized redirect URI on the same Google OAuth client. Redirect mismatch usually fails during callback code exchange, not later refresh, but it prevents reconnect recovery.
4. Start reconnect from the app and confirm the authorization URL includes `access_type=offline`, `prompt=consent`, and `include_granted_scopes=true`.
5. Complete reconnect, confirm Google returned a new `refresh_token` in the callback, then import Gmail again.
6. Simulate or force `invalid_grant` by revoking app access from the Google account, run a Gmail action, verify the UI shows `Reconnect Gmail`, reconnect, and verify import works again without database edits.

## Error Tracking with Sentry

The API integrates Sentry for error tracking and performance monitoring in production.

### Configuration

Set these environment variables in `.env`:

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

- **SENTRY_DSN**: Your Sentry project DSN (optional, error tracking disabled if not set)
- **SENTRY_ENVIRONMENT**: Environment name (defaults to NODE_ENV if not set)

The API will start successfully even if `SENTRY_DSN` is not configured.

### Testing Sentry Integration

In non-production environments, a debug endpoint is available:

```sh
curl http://localhost:4000/debug/sentry
```

This endpoint throws a test error to verify Sentry is capturing exceptions correctly. It is **automatically disabled in production**.

### How It Works

- Sentry is initialized as early as possible in `server.ts` (after dotenv)
- `Sentry.setupExpressErrorHandler(app)` captures unhandled exceptions
- Performance tracing samples 10% of requests in production
- Existing error handlers and API responses work unchanged
- No secrets are exposed to Sentry

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
