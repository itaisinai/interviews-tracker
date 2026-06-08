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
