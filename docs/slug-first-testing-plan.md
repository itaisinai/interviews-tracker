# Slug-First Architecture Testing Plan

## Overview

Testing strategy for the slug-first architecture migration, ensuring backward compatibility and zero data loss during rollout.

## Migration Phases

### Phase 1: Backend Accepts Slugs ✅ COMPLETE
- [x] Backend routes accept both `opportunitySlug` and `jobOpportunityId`
- [x] Slug resolvers implemented for all entities
- [x] Database queries support slugOrId lookups
- [x] Person entity generates slugs on creation

### Phase 2: Frontend Uses Slugs ✅ COMPLETE
- [x] API client updated to send slugs instead of IDs
- [x] Frontend state simplified (single slug variable)
- [x] Interaction components prefer nested opportunity.slug

### Phase 3: Remove IDs from Responses (FUTURE)
- [ ] Apply public DTO transformers
- [ ] Remove ID fields from API responses
- [ ] Update TypeScript types to reflect slug-only contract

### Phase 4: Remove ID Support (FUTURE)
- [ ] Remove ID-based request handling
- [ ] Remove backward compatibility code

## Test Cases

### 1. Entity Creation with Slug Generation

**Opportunity Creation**
```bash
# Test: Create opportunity and verify slug generation
POST /opportunities
{
  "companyName": "Acme Corp",
  "roleTitle": "Senior Engineer"
}

# Expected: Returns opportunity with slug = "acme-corp-senior-engineer"
# Verify: slug is unique per ownerEmail
# Verify: slug collision handling (acme-corp-senior-engineer-2, etc.)
```

**Interaction Creation**
```bash
# Test: Create interaction using opportunitySlug
POST /interactions
{
  "opportunitySlug": "acme-corp-senior-engineer",
  "date": "2026-07-06T10:00:00Z",
  "type": "Phone Screen"
}

# Expected: Resolves slug to ID internally, creates interaction
# Verify: jobOpportunityId FK points to correct opportunity
```

**Person Creation**
```bash
# Test: Create person with opportunitySlug
POST /people
{
  "name": "John Doe",
  "email": "john@example.com",
  "opportunitySlug": "acme-corp-senior-engineer"
}

# Expected: Generates slug = "john-doe"
# Verify: slug unique per ownerEmail
# Verify: jobOpportunityId FK resolved from slug
```

### 2. Slug-Based Lookups

**GET by Slug**
```bash
# Test: Fetch opportunity by slug
GET /opportunities/acme-corp-senior-engineer

# Expected: Returns opportunity data
# Verify: Works same as ID-based lookup
```

**GET by ID (Backward Compatibility)**
```bash
# Test: Fetch opportunity by database ID
GET /opportunities/clxxxxx123

# Expected: Still works, returns opportunity data
# Verify: Backward compatibility maintained
```

### 3. Slug Collision Handling

**Test: Create duplicate slugs**
```bash
# Step 1: Create first opportunity
POST /opportunities { "companyName": "Test Co", "roleTitle": "Engineer" }
# Returns slug: "test-co-engineer"

# Step 2: Create second opportunity with same name
POST /opportunities { "companyName": "Test Co", "roleTitle": "Engineer" }
# Expected slug: "test-co-engineer-2"

# Step 3: Create third
POST /opportunities { "companyName": "Test Co", "roleTitle": "Engineer" }
# Expected slug: "test-co-engineer-3"
```

### 4. Owner Isolation

**Test: Slug uniqueness is per-owner**
```bash
# User A creates opportunity
POST /opportunities { "companyName": "Acme Corp", "roleTitle": "Engineer" }
# Slug: "acme-corp-engineer"

# User B creates opportunity with same name (different owner)
POST /opportunities { "companyName": "Acme Corp", "roleTitle": "Engineer" }
# Slug: "acme-corp-engineer" (no collision, different ownerEmail)

# User A tries to access User B's opportunity
GET /opportunities/acme-corp-engineer (as User A)
# Expected: Returns User A's opportunity, not User B's
```

### 5. Foreign Key Operations

**Test: Create interaction with slug FK**
```bash
# Verify opportunity exists
GET /opportunities/acme-corp-engineer

# Create interaction using slug
POST /interactions
{
  "opportunitySlug": "acme-corp-engineer",
  "type": "Technical Interview",
  "date": "2026-07-10T14:00:00Z"
}

# Verify FK resolved correctly
GET /interactions/{interaction-slug}
# Expected: interaction.jobOpportunityId points to correct DB ID
# Expected: interaction.jobOpportunity.slug = "acme-corp-engineer"
```

**Test: Invalid slug FK**
```bash
POST /interactions
{
  "opportunitySlug": "nonexistent-slug",
  "type": "Phone Screen",
  "date": "2026-07-10T14:00:00Z"
}

# Expected: 404 NotFoundError "Opportunity 'nonexistent-slug' not found"
```

### 6. Update Operations with Slug Changes

**Test: Renaming opportunity updates slug**
```bash
# Initial state
GET /opportunities/acme-corp-engineer

# Rename company
PUT /opportunities/acme-corp-engineer
{
  "companyName": "Acme Corporation",
  "roleTitle": "Senior Engineer"
}

# Expected: New slug generated "acme-corporation-senior-engineer"
# Verify: Old URL /opportunities/acme-corp-engineer returns 404
# Verify: New URL /opportunities/acme-corporation-senior-engineer works
# Verify: Interactions still linked (FK uses DB ID, unaffected by slug change)
```

### 7. Migration from ID to Slug

**Test: Old frontend code (sends jobOpportunityId)**
```bash
POST /interactions
{
  "jobOpportunityId": "clxxxxx123",  # Legacy ID
  "type": "Phone Screen",
  "date": "2026-07-10T14:00:00Z"
}

# Expected: Still works (backward compatibility)
# Verify: Creates interaction successfully
```

**Test: New frontend code (sends opportunitySlug)**
```bash
POST /interactions
{
  "opportunitySlug": "acme-corp-engineer",
  "type": "Phone Screen",
  "date": "2026-07-10T14:00:00Z"
}

# Expected: Works, uses slug resolver
```

**Test: Both provided (slug takes precedence)**
```bash
POST /interactions
{
  "opportunitySlug": "correct-slug",
  "jobOpportunityId": "wrong-id",  # Legacy, ignored
  "type": "Phone Screen",
  "date": "2026-07-10T14:00:00Z"
}

# Expected: Uses opportunitySlug, ignores jobOpportunityId
```

### 8. Person Slug Generation

**Test: Person created from existing data**
```bash
# Run migration on existing Person records
yarn prisma migrate deploy

# Verify all persons have slugs
SELECT id, name, slug, "ownerEmail" FROM "Person" LIMIT 10;

# Expected: All records have non-null slug
# Expected: Slugs follow pattern: "first-last" or "first-last-2"
# Expected: Unique constraint (ownerEmail, slug) satisfied
```

**Test: New person creation generates slug**
```bash
POST /people
{
  "name": "Jane Smith",
  "email": "jane@example.com"
}

# Expected: slug = "jane-smith"
```

## Rollback Scenarios

### Scenario 1: Frontend breaks, need to revert

**Rollback steps:**
1. Revert frontend deployment to previous version
2. Backend continues supporting both slug and ID
3. No database changes needed (slugs remain, unused by old frontend)

**Verification:**
- Old frontend works with ID-based API calls
- No data loss
- Can retry slug migration after fixes

### Scenario 2: Slug generation bug found

**Example:** Collision handling broken, duplicate slugs created

**Rollback steps:**
1. Pause new entity creation (if critical)
2. Fix slug generation logic
3. Run data fix script to regenerate slugs
4. Re-deploy with fix

**Prevention:**
- Unique constraints prevent duplicate slugs (DB-level protection)
- Fix script:
  ```sql
  -- Find duplicates
  SELECT "ownerEmail", slug, COUNT(*)
  FROM "Person"
  GROUP BY "ownerEmail", slug
  HAVING COUNT(*) > 1;

  -- Regenerate slugs with collision handling
  -- (Use migration script logic)
  ```

### Scenario 3: Performance issue with slug lookups

**Symptoms:** Slow queries on slug-based lookups

**Investigation:**
```sql
EXPLAIN ANALYZE
SELECT * FROM "JobOpportunity"
WHERE "ownerEmail" = 'user@example.com' AND slug = 'acme-corp-engineer';
```

**Fix:**
- Verify index exists: `CREATE UNIQUE INDEX "JobOpportunity_ownerEmail_slug_key" ON "JobOpportunity"("ownerEmail", "slug");`
- Check query planner using index
- Add caching if needed (slug → ID resolution cache)

## Performance Benchmarks

### Baseline (ID-based lookup)
```sql
SELECT * FROM "JobOpportunity" WHERE id = 'clxxxxx123';
-- Expected: < 1ms (primary key lookup)
```

### Slug-based lookup
```sql
SELECT * FROM "JobOpportunity"
WHERE "ownerEmail" = 'user@example.com' AND slug = 'acme-corp-engineer';
-- Expected: < 2ms (compound index lookup)
```

### Acceptable Thresholds
- Single entity lookup: < 5ms
- List queries: < 50ms
- Slug resolution (slug → ID): < 2ms

## Data Integrity Checks

### Pre-Migration Validation
```sql
-- Check for persons without ownerEmail source
SELECT COUNT(*) FROM "Person"
WHERE "jobOpportunityId" IS NULL;

-- If > 0, these are orphaned records - require manual review
```

### Post-Migration Validation
```sql
-- Verify all persons have slugs
SELECT COUNT(*) FROM "Person" WHERE slug IS NULL;
-- Expected: 0

-- Verify slug uniqueness per owner
SELECT "ownerEmail", slug, COUNT(*)
FROM "Person"
GROUP BY "ownerEmail", slug
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Verify all slugs are valid (no empty, no special chars except hyphen)
SELECT id, slug FROM "Person"
WHERE slug ~ '[^a-z0-9-]' OR slug = '';
-- Expected: 0 rows
```

## Monitoring & Alerts

### Metrics to Track

**API Metrics:**
- Count of requests using `opportunitySlug` vs `jobOpportunityId`
- 404 rate on slug-based lookups
- Average response time for slug resolution

**Database Metrics:**
- Slug lookup query performance
- Index usage on (ownerEmail, slug) indexes
- Unique constraint violations (should be 0)

**Application Metrics:**
- Slug generation failures
- Slug collision rate
- NotFoundError rate

### Alerts

**Critical:**
- Unique constraint violations on (ownerEmail, slug)
- Slug generation failures > 1% of creates
- Slug lookup 404 rate > 5%

**Warning:**
- Slug resolution time > 5ms p95
- High collision rate (> 10% of creates)

## Success Criteria

### Phase 1 Complete When:
- [x] All backend routes accept slugs
- [x] Slug resolvers implemented and tested
- [x] Person migration successfully deployed
- [x] Zero unique constraint violations

### Phase 2 Complete When:
- [x] Frontend exclusively sends slugs in new code
- [x] Zero ID-based API calls from frontend (except responses)
- [x] UI works correctly with slug-based routing

### Phase 3 Complete When:
- [ ] API responses no longer include `id` fields
- [ ] Frontend TypeScript types updated (no ID fields)
- [ ] Zero TypeScript errors in frontend

### Phase 4 Complete When:
- [ ] Backend no longer accepts `jobOpportunityId`
- [ ] Slug-only contract enforced
- [ ] Documentation updated

## Current Status

**Completed:**
- ✅ Task 1: Identifier audit (302 references)
- ✅ Task 2: API contract design
- ✅ Task 3: Person slug generation
- ✅ Task 4: Company strategy (virtual entity)
- ✅ Task 5: Backend slug acceptance
- ✅ Task 6: DTO infrastructure (ready for Phase 3)
- ✅ Task 7: Frontend API client uses slugs
- ✅ Task 8: Frontend ID tracking cleaned up
- ✅ Task 9: Database slug lookups

**Next Steps:**
- Manual testing of key flows
- Deploy to staging
- Monitor for issues
- Proceed to Phase 3 (remove IDs from responses)

---

**Last Updated:** 2026-07-06
