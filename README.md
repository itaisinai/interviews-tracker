# Job Search CRM

[![CI](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/itaisinai/interviews-tracker/actions/workflows/ci.yml)

A full-stack personal CRM for managing a senior software engineering job search. It tracks potential companies, active interview processes, calls, interviews, notes, prep tasks, company research, compensation, and follow-ups.

## Stack

- React, TypeScript, Vite, Tailwind CSS, React Router, React Query, React Hook Form
- Node.js, Express, TypeScript
- PostgreSQL, Prisma
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
- Build command: `yarn install --immutable && yarn build`
- Start command: `yarn start:api`
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

## Scripts

- `yarn dev`: start API and web app.
- `yarn build`: generate Prisma Client, build API, and build frontend.
- `yarn typecheck`: TypeScript validation.
- `yarn prisma:generate`: generate Prisma Client.
- `yarn db:migrate`: run Prisma migrations.
- `yarn db:migrate:deploy`: apply migrations in production/deployment.
- `yarn start:api`: start the compiled API from `dist/api`.
- `yarn start:web`: preview the built frontend from `dist/web`.

## Environment

See `.env.example` for all variables. PostgreSQL remains the source of truth.
