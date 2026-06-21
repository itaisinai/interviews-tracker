# Scripts Directory Cleanup - Migration Summary

## Overview
Reduced script count from **15 to 3 scripts** (80% reduction) by:
- Migrating from `tsc` to `tsup` bundler
- Replacing custom validation with `publint`
- Removing all Playwright visual tests (were all skipped)
- Removing completed one-time migration scripts

## Scripts Eliminated (12 total)

### One-Time/Debugging Scripts (3)
- ❌ `migrate-with-owner-email.mjs` - One-time data migration (already completed)
- ❌ `debug-yarn-env.mjs` - Debugging utility (not in workflows)
- ❌ `test-visual.mjs` - Duplicate/draft of test-visual-ci.mjs

### Build Cleanup Scripts (3)
- ❌ `clean-api-build.mjs` - No longer needed (tsup has `clean: true`)
- ❌ `clean-package-js.mjs` - No longer needed (tsup outputs only to dist)
- ❌ `copy-package-assets.mjs` - No longer needed (tsup handles CSS with `loader`)

### Validation Scripts (1)
- ❌ `check-runtime-package-exports.mjs` - Replaced with `publint` (better validation)

### Visual Test Scripts (4)
- ❌ `test-visual-ci.mjs` - Removed (tests were all skipped)
- ❌ `visual-docker.mjs` - Removed (tests were all skipped)
- ❌ `check-playwright-image.mjs` - Removed (no longer using Playwright)
- ❌ `playwright-image.mjs` - Removed (no longer using Playwright)

### Simplified Script (1)
- ✅ `start-api.mjs` - Simplified (predictable output path with tsup)

## Scripts Remaining (3)

1. **`env-check.mjs`** - Environment variable validation
   - **Keep**: Useful for onboarding and debugging
   - **Usage**: `yarn env:check`

2. **`smoke-api.mjs`** - API health check for CI
   - **Keep**: Essential for CI validation
   - **Usage**: `yarn smoke:api` (in CI)

3. **`start-api.mjs`** - Start production API build
   - **Keep**: Essential for production-like testing
   - **Usage**: `yarn start:api`
   - **Simplified**: Now uses predictable `dist/api/server.mjs` path

## What Was Removed

### Test Infrastructure
- `apps/web/tests/visual/` directory (30 skipped tests + snapshots)
- `apps/web/playwright.visual.config.ts`
- Playwright and test-runner dependencies

### Why Visual Tests Were Removed
All 30 tests in `ui.stories.spec.ts` used `test.skip()`, meaning:
- They never actually ran in CI or locally
- They gave a false sense of test coverage
- They required maintenance with zero value

## Key Changes

### Package Builds
**Before:** `tsc` + 3 cleanup scripts  
**After:** Just `tsup`

### API Build
**Before:** 4 scripts chained together  
**After:** `yarn prisma:generate && tsup`

### Visual Tests
**Before:** 30 skipped tests + Docker + custom scripts  
**After:** Removed entirely (Storybook still available for development)

## Dependencies

**Added:**
- `tsup` - Modern TypeScript bundler
- `publint` - Package validation

**Removed:**
- `@playwright/test`
- `@storybook/test-runner`

## Benefits

✅ 80% fewer scripts to maintain  
✅ Faster builds (tsup > tsc)  
✅ Simpler CI (no Docker container)  
✅ Standard tooling (easier onboarding)  
✅ No misleading "tests" that don't run  
✅ Predictable output paths  
✅ Better tree-shaking and bundling  

## Verification

All workflows verified working:
- ✅ `yarn build` - Full build succeeds
- ✅ `yarn typecheck` - Type checking passes
- ✅ `yarn smoke:api` - API health check works
- ✅ Package validation with `publint`

## Summary

**Before:** 15 scripts, 30 skipped tests, complex CI, custom orchestration  
**After:** 3 scripts, clean CI, standard tooling

**Scripts reduced by 80%. Complexity reduced by even more.**
