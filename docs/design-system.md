# Design System

This app uses a business-agnostic UI layer for reusable primitives and keeps product-specific composition in pages and feature modules.

The design system now lives in `packages/design-system`.

## Principles

- Primitives must not know about opportunities, interactions, companies, Gmail, or AI.
- Reusable UI belongs in `packages/design-system/src/components/*`.
- Business-specific UIs belong in page/feature components.
- Reusable components must use semantic design tokens, not one-off Tailwind values.
- Each reusable component lives in its own folder and exports through `index.ts`.
- Component folders and files use `kebab-case`.

## Tokens

Semantic tokens live in `packages/design-system/src/styles/tokens.css` and are mapped into Tailwind.

Use token-backed values for:

- background surfaces
- text colors
- borders
- primary / secondary actions
- status colors
- radii
- shadows
- focus rings

Prefer semantic tokens such as:

- `color.background.app`
- `color.background.surface`
- `color.background.muted`
- `color.text.primary`
- `color.text.secondary`
- `color.border.default`
- `color.action.primary`
- `color.status.success`
- `color.status.warning`
- `color.status.danger`

## Component structure

Each reusable primitive has its own folder:

```text
packages/design-system/src/components/button/
  button.tsx
  button.stories.tsx
  index.ts
```

Guidelines:

- Keep one component per folder.
- Put only barrel re-exports in `index.ts`.
- Avoid dumping many unrelated primitives into one file.
- Keep files small and focused.

## Existing primitives

Current primitives include:

- Button
- IconButton
- Badge
- Card
- Input
- Textarea
- Select
- FormField
- Drawer
- DataTable
- LoadingState
- Spinner

## Creating a new primitive

1. Add a new folder under `packages/design-system/src/components/<name>/`.
2. Implement the component in `<name>.tsx`.
3. Export it from `index.ts`.
4. Add a Storybook story file alongside it.
5. Use semantic tokens and shared primitives instead of custom values.

## Storybook

Storybook is configured under `apps/web/.storybook`.

Scripts:

- `yarn storybook`
- `yarn build:storybook`

Write stories that cover:

- default state
- variants
- sizes
- disabled state
- loading state
- error state
- icon usage

## Visual snapshots

Visual regression tests use Storybook screenshots via Playwright inside the same Linux Docker image used in CI.

Scripts:

- `yarn test:visual`
- `yarn test:visual:update`
- `yarn test:visual:local`

`yarn test:visual` and `yarn test:visual:update` are the canonical commands. They run the tests inside the Playwright Docker image automatically. Do not generate or update snapshots directly on macOS if you want the snapshots that CI will use.

`yarn test:visual:local` runs the same Storybook/Playwright test logic without Docker. It is useful for debugging, but it is not the canonical snapshot path and it should not be used to update committed PNGs.

When the visual suite fails in CI, GitHub Actions uploads:

- `test-results/**`
- `playwright-report/**`
- `**/*-actual.png`
- `**/*-expected.png`
- `**/*-diff.png`

Snapshot policy:

- Update snapshots only with `yarn test:visual:update`.
- That command also runs inside Docker automatically.
- Commit the updated PNGs only after reviewing the diffs.

Troubleshooting:

- If Docker is unavailable locally, the runner fails with a clear message.
- If the Playwright Docker image drifts from the installed `@playwright/test` version, CI fails with a version-mismatch error.

## Migration approach

- Replace duplicated primitives first.
- Keep product-specific composition in pages and features.
- Migrate incrementally to avoid risky rewrites.
- Leave backend, API behavior, and data models untouched.
