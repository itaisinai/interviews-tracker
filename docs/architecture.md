# Architecture

## Goal

Interviews Tracker is being shaped as a production-grade personal CRM. The codebase should keep business logic, HTTP wiring, persistence, and external integrations separated so the product can grow without route files turning into monoliths.

## Target layers

### apps/api

- `routes/`: HTTP wiring only. Register endpoints and pass work to handlers.
- `controllers/`: Parse requests, validate inputs, call services, map results to responses.
- `services/`: Business orchestration. Owns use-case flow and cross-repository coordination.
- `repositories/`: Prisma reads/writes only. No HTTP or integration logic.
- `integrations/`: Auth0, Gmail, OpenAI, Exa, and other external clients.
- `mappers/`: Translate DB/domain objects into API DTOs and vice versa when needed.
- `lib/`: Shared technical utilities such as auth, logging, error handling, and schema exports.

### packages/

- `@interviews-tracker/core`: CRM domain primitives, enums, and shared DTO schemas.
- `@interviews-tracker/ai`: AI contracts, prompt builders, parser schemas.
- `@interviews-tracker/integrations`: Gmail and enrichment DTOs plus pure helpers.
- `@interviews-tracker/api-client`: Browser-safe typed API client.

### apps/web

- Route pages, composed components, and UI primitives.
- React Query for data access.
- No direct Prisma, server, or integration code.

## Boundaries

- Routes must not contain Prisma queries or business orchestration.
- Services should not know about Express objects.
- Repositories should not know about request/response semantics.
- Integrations should not know about Prisma.
- UI should not duplicate domain enums when a shared label map exists.

## Data direction

- HTTP request -> controller -> service -> repository -> Prisma
- External events -> integration -> service -> repository
- DB model -> mapper -> API DTO -> client -> UI

## Current progress

The first implemented slice is:

- Opportunities
- Interactions
- Options caching
- React Query defaults

These are examples of the target shape, not the final destination.

## Nx task graph and build discipline

The repository uses Yarn 4 workspaces for dependency installation and Nx for monorepo task orchestration, dependency ordering, and build caching. Each app and package has a `project.json` target definition, and `nx.json` tells Nx that each `build` depends on upstream `build` targets. This means commands such as `yarn build:api` run `nx build api`, and Nx builds `core`, `ai`, `integrations`, and `logger` before compiling the API.

### Build vs start vs dev

- `build` produces the JavaScript and declaration artifacts required to run or deploy the app.
- `start` only runs already-built JavaScript artifacts. Runtime start scripts must never compile TypeScript or build workspace packages.
- `dev` runs source/watch tooling for local development.
- CI runs typecheck, build, smoke, Storybook, and visual validation through the same Nx-backed scripts used locally.

If `yarn start:api` cannot find compiled API output, it fails with a clear message asking you to run `yarn build:api` first. This prevents production from hiding missing build artifacts by compiling packages at runtime.

### Runtime package exports

Any workspace package imported by the API at runtime must compile to `dist` and export built files from `package.json`:

- `types`: `./dist/index.d.ts`
- `default`: `./dist/index.js`

Runtime packages must not export `./src/*.ts`. The `yarn check:runtime-exports` script validates the API runtime package manifests and is included in typecheck/build/CI flows.

### Adding a new package

1. Add the package under `packages/<name>` with a `package.json`, `tsconfig.json`, and `src/index.ts`.
2. Add `packages/<name>/project.json` with at least `build`, `typecheck`, and `dev` targets.
3. Declare Nx dependencies with `implicitDependencies` when the package or app depends on another internal project.
4. If the API imports the package at runtime, ensure the package emits `dist/index.js` and `dist/index.d.ts`, points exports to those files, and add it to `scripts/check-runtime-package-exports.mjs`.
5. Add the package to the appropriate root script project lists when it should be part of package-only commands.

### Common commands

- `yarn build` builds all Nx projects.
- `yarn build:api` builds the API and its required package dependencies.
- `yarn build:web` builds the web app for Vercel output in `dist/web`.
- `yarn build:packages` builds shared package projects.
- `yarn typecheck` typechecks all Nx projects and validates runtime exports.
- `yarn dev` starts local API and web dev processes.
