# Refactor Roadmap

## Phase 1: Backend layering

Status: in progress

Scope:

- Move Opportunities and Interactions to route/controller/service/repository layering
- Keep behavior unchanged
- Remove direct Prisma access from those route files
- Add lightweight performance defaults on the web client

Risk:

- Low. Changes are structural and do not alter API contracts.

## Phase 2: Package boundaries

Scope:

- Keep `@interviews-tracker/core`, `@interviews-tracker/ai`, `@interviews-tracker/integrations`, and `@interviews-tracker/api-client` as the stable shared packages
- Avoid generic shared or table-per-package splits
- Keep apps depending on packages, not the other way around

Risk:

- Medium. Package movement can create import churn if done too quickly.

## Phase 3: Data model proposal

Scope:

- Introduce first-class `User`, `Company`, `Contact`, and `EmailImport` concepts
- Reference `userId` and `companyId` where appropriate
- Add indexes for the list and interaction-heavy flows
- Keep the current schema until an explicit migration is approved

Risk:

- Medium. Schema changes affect application behavior and existing data.

## Phase 4: API contract cleanup

Scope:

- Separate DTOs from DB models
- Return ISO dates consistently
- Standardize errors and request IDs

Risk:

- Medium. Response contracts may need coordinated frontend updates.

## Phase 5: Performance

Scope:

- Keep opportunity lists lightweight
- Cache option lists in memory
- Add pagination where needed
- Use stable React Query defaults
- Benchmark local vs remote database latency

Risk:

- Low to medium. Caching and pagination can change perceived freshness.

## Phase 6: Gmail import robustness

Scope:

- Keep Gmail search, classification, extraction, review, and save separate
- Preserve source traceability
- Use calendar data before asking AI to infer dates

Risk:

- Medium. This is user-visible and touches the highest-entropy input flow.

## Phase 7: Frontend quality

Scope:

- Reusable UI primitives
- Consistent loading/error/empty states
- Accessibility improvements
- Progressive simplification of the form-heavy flows

Risk:

- Low to medium. Mostly visual, but still needs careful regression checks.
