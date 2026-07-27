# Interviews Tracker

A full-stack personal CRM for managing a senior software engineering job search. The app tracks companies, roles, contacts, interviews, notes, tasks, compensation signals, source emails, Telegram-created leads, and LinkedIn imports in one owner-scoped workspace.

## What the app does

- **Opportunity CRM:** maintain potential, active, and archived opportunities with status, priority, source links, company facts, contacts, tasks, notes, compensation, and interaction history.
- **Interview workflow:** schedule and review interactions, attach Gmail messages, add feedback, track follow-ups, and prepare for upcoming calls.
- **AI-assisted ingestion:** parse pasted job descriptions, LinkedIn job pages, Gmail messages, Telegram messages, and person/company research into structured data for user review.
- **Integrations:** Auth0 for app auth, Google OAuth/Gmail for email import, Telegram webhooks for mobile capture and querying, Exa/OpenAI-backed research, PostgreSQL via Prisma, and AWS ECS Fargate for the API.

## Automatic company research

Opportunity creation persists and returns the new opportunity immediately, then enqueues automatic company research
through `companyResearchJobService`. The current queue adapter uses `setImmediate` inside the API process, reloads
owner-scoped company data, skips companies successfully researched in the previous seven days, applies non-empty
research without replacing known values, and records an unread success or failure Notification Center item.

The notification bell polls only the unread count every 25 seconds. The full list is refetched on window focus, when
the bell opens, and when the Notifications page opens. Notification reads and entity links are persisted by the API.

This phase is intentionally best-effort: an in-process job can be lost when the API restarts or is deployed and does
not provide guaranteed delivery. A durable database or external queue can later replace the exported
`companyResearchJobService` adapter while retaining its `enqueue(CompanyResearchJobInput)` boundary and the existing
executor.

## Architecture and operating docs

Start here when you need to understand or change the system:

| Document | Use it for |
| --- | --- |
| [Architecture overview](docs/architecture.md) | System boundaries, runtime flow, package graph, backend layering, and data ownership. |
| [Application workflows](docs/application-workflows.md) | Real product flows: opportunity lifecycle, Gmail import, Telegram bot, LinkedIn extension, company/person research. |
| [AI agent guide](docs/ai-agent-guide.md) | Repo navigation, safe change workflow, architectural checks, and commands for AI coding agents. |
| [Deployment and operations](docs/deployment-and-operations.md) | Local setup, health checks, Docker, ECS/Fargate, secrets, CI/CD, and troubleshooting. |
| [Engineering decisions](docs/engineering-decisions.md) | Accepted architecture decisions and trade-offs. |
| [Design system](docs/design-system.md) | UI token, component, and Storybook conventions. |
| [UX patterns](docs/ux-patterns.md) | Product interaction rules and anti-patterns. |
| [LinkedIn job import](docs/linkedin-job-import.md) | Chrome extension behavior, Auth0 setup, and import contract. |

## Repository map

```text
apps/
  api/                 Express API, controllers, services, repositories, integrations
  web/                 React/Vite app and feature UI
  linkedin-extension/  Chrome extension for importing LinkedIn jobs
packages/
  core/                Shared domain types, enums, and schemas
  ai/                  AI parsing/research contracts and prompt builders
  integrations/        Pure integration DTOs/helpers
  api-client/          Browser-safe typed API client
  design-system/       Reusable UI primitives and tokens
  logger/              Structured logging abstraction
prisma/                Database schema and migrations
infra/                 Terraform for AWS ECS Fargate API deployment
docs/                  Architecture, workflows, operations, and product guidance
```

## Local development

1. Install dependencies and generate the Prisma client:

```sh
yarn install
```

2. Create local environment variables:

```sh
cp .env.example .env
```

3. Start PostgreSQL:

```sh
docker compose up -d
```

4. Apply migrations:

```sh
yarn db:migrate
```

5. Start API and web apps:

```sh
yarn dev
```

Default local URLs:

- Web app: `http://localhost:5173`
- API base: `http://localhost:4000/api`
- API health: `http://localhost:4000/health`

## Common commands

| Command | Purpose |
| --- | --- |
| `yarn dev` | Run API and web locally. |
| `yarn dev:api` / `yarn dev:web` | Run one app. |
| `yarn build` | Build all Nx projects. |
| `yarn build:api` / `yarn build:web` | Build one deployable app and required dependencies. |
| `yarn typecheck` | Typecheck the monorepo. |
| `yarn smoke:api` | Start/verify the built API smoke path. |
| `yarn db:migrate` | Run local Prisma migrations. |
| `yarn db:migrate:deploy` | Apply production migrations. |
| `yarn storybook` | Develop design-system/component stories. |
| `yarn build:storybook` | Build Storybook for CI/visual validation. |

## Package boundaries

Dependency direction is intentionally one-way:

```text
apps -> packages
api-client -> core, ai, integrations
ai -> core
integrations -> core
core -> none
```

Backend business logic belongs in services, database access in repositories, HTTP parsing/response mapping in controllers/routes, and external provider details in integration-specific services. See [Architecture overview](docs/architecture.md) and [AI agent guide](docs/ai-agent-guide.md) before large changes.

## Production shape

- The web app is a Vite build intended for static hosting.
- The API is built with `tsup`, packaged into a Docker image, pushed by GitHub Actions, and deployed to AWS ECS Fargate behind an Application Load Balancer.
- Runtime configuration is provided through environment variables and AWS SSM Parameter Store.
- Health endpoints support uptime checks and load-balancer readiness.

See [Deployment and operations](docs/deployment-and-operations.md) for concrete runbooks.
