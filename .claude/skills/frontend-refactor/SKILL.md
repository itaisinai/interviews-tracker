---
name: frontend-refactor
description: Use when refactoring frontend React/TypeScript files for readability without behavior changes. Guides safe component, hook, helper, and constant extraction while preserving UI logic and app behavior.
---

# Frontend Refactor Skill

## Purpose

Refactor frontend code for readability, maintainability, and best practices without changing behavior.

## Workflow

1. Identify oversized or mixed-responsibility files with `wc -l`, dependency scans, and local code review.
2. Preserve logic first: avoid rewrites, new control flow, data shape changes, or styling changes unless required by extraction.
3. Extract by responsibility:
   - Pure formatting/transformation helpers into colocated `*-utils.ts` files.
   - Presentational subcomponents into colocated `.tsx` files.
   - Reusable types into colocated `*-types.ts` files when shared across extracted files.
   - Hooks only when state/effects form a clear lifecycle unit.
4. Keep public component props explicit and typed. Prefer narrow prop types over passing large objects when only a few fields are used.
5. Maintain existing import direction and package boundaries. Frontend code must not import backend-only modules or Prisma.
6. Validate with typecheck/build and focused tests where available.

## Guardrails

- Do not change user-visible copy, CSS classes, ordering, API calls, query keys, validation rules, or saved payloads unless the user explicitly requests behavior changes.
- Do not wrap imports in `try/catch`.
- Keep extracted components colocated with their parent feature unless used by at least three separate features.
- Prefer small, reviewable extractions over broad rewrites.
