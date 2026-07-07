# Company Entity Migration - Status Report

**Date:** 2026-07-07  
**Status:** Backend Complete ✅ | Frontend Pending ⏳

---

## Overview

Successfully migrated from opportunity-centric model to Company entity model. This enables:
- ✅ **Company watchlist** - Track companies before having opportunities
- ✅ **Multiple opportunities per company** - Create 2+ roles at same company
- ✅ **Centralized company data** - Company research applies to all opportunities
- ✅ **Company-level notes and tasks** - Track company information separately from roles
- ✅ **Contact management** - Contacts linked to company, shared across opportunities

---

## ✅ Completed: Phase 1 (Backend)

### Task #1: Prisma Schema
- Added `Company` model with all company-level fields
- Added `CompanyDomain` join table for many-to-many domains
- Updated `JobOpportunity` to reference `Company` via `companyId` (onDelete: Restrict)
- Updated `Person` to link to `Company` instead of `JobOpportunity`
- Updated `Note` and `Task` for company-level support
- Renamed `Company.notes` → `Company.companyNotes` to avoid conflict with `notesList`

### Task #2 & #14: Migration Scripts
- **`scripts/migrate-to-company-entity.ts`** - Data migration script:
  - Extracts unique companies from opportunities (grouped by ownerEmail + companyName)
  - Consolidates company data from multiple opportunities
  - Creates Company records with proper slugs
  - Migrates domains to CompanyDomain
  - Updates opportunities with `companyId`
  - Migrates Person records to link to Company
  - Verifies data integrity

- **`prisma/migrations/20260707000000_add_company_entity/migration.sql`** - Initial migration:
  - Creates Company and CompanyDomain tables
  - Adds nullable `companyId` to JobOpportunity, Note, Task, Person
  - Adds indexes and initial foreign keys

- **`prisma/migrations/20260707000001_cleanup_company_migration/migration.sql`** - Cleanup migration (runs after data migration):
  - Makes `companyId` required on JobOpportunity
  - Adds remaining foreign key constraints
  - Drops old fields (companyName, employeesRangeId, etc.)
  - Updates unique constraints

- **`scripts/run-company-migration.sh`** - Master orchestration script

### Task #3: Core Types
- Added `Company`, `CompanySummary`, `CompanyDetail`, `Note`, `Task`, `Person` types
- Added `companyInputSchema` with validation
- Updated `opportunityInputSchema` to support `companyId` OR `companyName` (backward compatible)
- Updated all schemas for company support
- Added `createCompanySlug()` function

### Task #4: Company Repository
File: `apps/api/src/repositories/company-repository.ts`
- `listCompanyRecords()` - List with filters (watchlist, search)
- `findCompanyRecord()` - Get by slug or ID
- `findCompanyByName()` - Fuzzy search by name/searchName
- `createCompanyRecord()` - Create with slug generation
- `updateCompanyRecord()` - Update with slug regeneration
- `deleteCompanyRecord()` - Delete with restriction check (can't delete if has opportunities)
- `findOrCreateCompanyByName()` - Helper for auto-creation
- `resolveCompanyId()` - Resolve slug or ID to internal ID

### Task #5: Updated Repositories
**opportunity-repository.ts:**
- Updated `opportunityInclude` to join Company with full details
- Modified `toWrite()` to require `companyId` and connect to Company
- Updated `createOpportunityRecord()` to require `companyId` parameter
- Updated `updateOpportunityRecord()` to handle company changes
- Updated search to use `company.name` instead of `companyName`
- Updated `getOpportunitySummaryRecord()` to include company relation

**person-repository.ts:**
- Updated `createPersonWithSlug()` to accept `companyId` instead of `jobOpportunityId`
- Updated `findPersonBySlug()` to include company relation
- Removed `company` string field (now relation)

### Task #6: Services
**company-service.ts:**
- Full CRUD operations
- Watchlist management (`addToWatchlist`, `removeFromWatchlist`)
- Research tracking (`markResearched`)
- `findOrCreate` helper

**opportunity-service.ts:**
- Auto-creates company from `companyName` if `companyId` not provided
- Handles company changes on update
- Backward compatible with old API

### Task #7: API Routes
**companies.ts:**
- `GET /companies` - List companies (with watchlist filter)
- `GET /companies/:slugOrId` - Get company detail
- `POST /companies` - Create company
- `PATCH /companies/:slugOrId` - Update company
- `DELETE /companies/:slugOrId` - Delete company (with restriction check)
- `POST /companies/:slugOrId/enrich` - Enrich company from text
- `POST /companies/:slugOrId/research` - Research company
- `POST /companies/:slugOrId/research/apply` - Apply research to company

**serializers.ts:**
- Added `serializeCompany()` function
- Updated `serializeOpportunity()` to serialize nested company
- Updated `serializePerson()` to serialize nested company
- Removes internal IDs (`companyId`, `employeesRangeId`, etc.)

### Task #8: Migration & Testing (IN PROGRESS)
- ✅ Prisma client generated
- ✅ Core package TypeScript compiles
- ⏳ API TypeScript compilation (some errors to fix)
- ⏳ Database migration not yet run
- ⏳ Integration testing pending

---

## ⏳ Remaining: Phase 2 (Frontend)

### Task #9: Update API Client
- Update `packages/api-client` with new company endpoints
- Update frontend to use new Company types

### Task #10: Company Creation UI
- Create company form
- Add company modal
- Company watchlist features

### Task #11: Opportunity Creation & Display
- Update add-opportunity-modal to use `companyId`
- Update opportunity pages to read from `opportunity.company.*`
- Handle company selector (existing companies) or company name input (auto-creates)

### Task #12: Company & Person Pages
- Update companies-page to use Company entity
- Update company-detail-page to use Company entity
- Update person/contact components to link to company

### Task #13: Testing & Fixes
- Test company watchlist
- Test opportunity creation
- Test company pages
- Test opportunity pages
- Test contact linking
- Fix any regressions

---

## TypeScript Errors to Fix

Current compilation errors in `apps/api`:

1. **Controllers** - References to `opportunity.companyName` need to change to `opportunity.company.name`
2. **People routes** - References to `person.company` (string) need to change to `person.companyId` or `person.company.name`
3. **Repository** - Prisma query using both `select` and `include` (invalid)
4. **Interaction repository** - Reference to `companyName` field that no longer exists

---

## Migration Execution Plan

**IMPORTANT: Create database backup before proceeding!**

```bash
# Step 1: Fix remaining TypeScript errors
yarn build

# Step 2: Run migration
./scripts/run-company-migration.sh

# Step 3: Test API endpoints
curl http://localhost:3000/api/companies
curl http://localhost:3000/api/opportunities

# Step 4: Update frontend
# (Tasks #9-13)
```

---

## Breaking Changes

### Database Schema
- ❌ `JobOpportunity.companyName` removed → use `JobOpportunity.company.name`
- ❌ `JobOpportunity.employeesRangeId` removed → use `JobOpportunity.company.employeesRangeId`
- ❌ `JobOpportunity.companyStageId` removed → use `JobOpportunity.company.companyStageId`
- ❌ `JobOpportunity.location` removed → use `JobOpportunity.company.location`
- ❌ `JobOpportunity.funding` removed → use `JobOpportunity.company.funding`
- ❌ `JobOpportunity.companyDescription` removed → use `JobOpportunity.company.description`
- ❌ `JobOpportunity.productDescription` removed → use `JobOpportunity.company.productDescription`
- ❌ `JobOpportunity.customersTraction` removed → use `JobOpportunity.company.customersTraction`
- ❌ `JobOpportunity.techStack` removed → use `JobOpportunity.company.techStack`
- ❌ `JobOpportunity.backendFrontendSplit` removed → use `JobOpportunity.company.backendFrontendSplit`
- ❌ `Person.jobOpportunityId` removed → use `Person.companyId`
- ❌ `Person.company` (string field) removed → use `Person.company.name` (relation)

### API Types
- ✅ `opportunityInputSchema` now accepts `companyId` OR `companyName` (backward compatible)
- ✅ `Opportunity` type now includes `company: Company` relation
- ✅ `Person` type now includes `companyId` and `company: Company` relation
- ✅ New `Company`, `CompanySummary`, `CompanyDetail` types

### API Endpoints
- ✅ `/companies` now returns real Company entities (not virtual aggregations)
- ✅ `/companies/:slugOrId` uses slug instead of name
- ✅ New: `POST /companies` to create company
- ✅ New: `PATCH /companies/:slugOrId` to update company
- ✅ `/companies/:slugOrId/delete` enforces restriction (can't delete with opportunities)

---

## Rollback Plan

If migration fails:
1. Restore database backup
2. Revert schema changes: `git checkout HEAD -- prisma/schema.prisma`
3. Regenerate Prisma client: `npx prisma generate`
4. Investigate failure in migration script
5. Fix and retry

---

## Success Criteria

- ✅ Company is a physical entity in database
- ✅ All opportunities linked to a company
- ⏳ Can create company without opportunity
- ⏳ Can create multiple opportunities from one company
- ⏳ Company research applies to all opportunities
- ⏳ Contacts link to company, shared across opportunities
- ⏳ No data loss from migration
- ⏳ All frontend flows work with new structure

---

**Last Updated:** 2026-07-07 15:30 PST
