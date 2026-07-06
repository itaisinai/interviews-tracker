# Slug-First Architecture Refactor Plan

## Executive Summary

**Goal:** Eliminate internal database IDs from the frontend. Use human-readable slugs everywhere.

**Why:** 
- Simpler frontend code (one identifier type, not 3-4)
- Better security (don't expose internal IDs)
- Smaller payloads (don't send IDs over wire)
- No more "which ID do I use?" confusion
- Consistent URL routing and API calls

---

## Current State (Problems)

### Frontend Tracks Multiple Identifiers Per Entity
```typescript
// Opportunity page - confusing!
const opportunityRouteId = data?.slug ?? data?.id ?? slugOrId;
const opportunityApiId = data?.slug ?? data?.id ?? slugOrId;  // For API calls
const opportunityDbId = data?.id ?? slugOrId;                // For FK writes
const canonicalSlug = data?.slug ?? null;
```

### Backend Exposes Internal IDs
```typescript
// API Response
{
  "id": "cm58abc123",           // ❌ Internal DB ID exposed
  "slug": "reevol-senior-dev",  // ✅ User-facing identifier
  "companyName": "Reevol"
}
```

### FK Operations Require IDs
```typescript
// Frontend must track DB ID just for this
api.createPerson({ 
  jobOpportunityId: opportunityDbId  // ❌ Requires DB ID
})

// Backend expects ID
await prisma.person.create({
  data: { jobOpportunityId }  // FK constraint
})
```

---

## Target State (Solution)

### Frontend: Slugs Only
```typescript
// One identifier everywhere
const opportunitySlug = "reevol-senior-dev"

api.createPerson({ 
  jobOpportunitySlug: "reevol-senior-dev"  // ✅ Slug
})
```

### Backend: Accept Slugs, Resolve Internally
```typescript
// API Route
POST /opportunities/:opportunitySlug/people

// Backend resolves slug → ID
const opportunity = await findBySlug(opportunitySlug, ownerEmail)
await prisma.person.create({
  data: { jobOpportunityId: opportunity.id }  // Internal only
})
```

### API Response: No IDs
```typescript
{
  "slug": "reevol-senior-dev",    // ✅ Only public identifier
  "companyName": "Reevol",
  "interactions": [
    { "slug": "reevol-phone-screen" }  // ✅ Nested slugs
  ]
}
```

---

## Entity Audit

| Entity | Has Slug? | Slug Format | Needs Work |
|--------|-----------|-------------|------------|
| **Opportunity** | ✅ Yes | `{company}-{role}-{counter}` | Refactor FK operations |
| **Interaction** | ✅ Yes | `{opportunity}-{type}-{counter}` | Refactor FK operations |
| **Person** | ❌ No | Need: `{name}-{counter}` | **Add slug generation** |
| **Company** | ⚠️ Virtual | Uses `companyName` | Verify strategy |

### Person Entity - Missing Slugs
**Current:** Only has `id` (UUID)
**Needed:** Add `slug` column
- Format: `eliyahu-katzav-1`, `roy-ygael-1`
- Unique per owner
- Migration to backfill existing records

### Company Entity - Virtual
**Current:** No dedicated Company table, derived from `Opportunity.companyName`
**Strategy:** Use `companyName` as identifier (already human-readable)
- Company views: `/companies/{companyName}`
- Already works like a slug

---

## Implementation Tasks

### Phase 1: Foundation (Weeks 1-2)

#### ✅ Task 1: Audit Current Usage
- Document all places using IDs vs slugs
- Map FK operations requiring IDs
- List API endpoints by identifier type

#### ✅ Task 2: Add Person Slugs
- Database migration: `ALTER TABLE Person ADD COLUMN slug TEXT`
- Slug generation logic in PersonRepository
- Backfill existing Person records
- Add unique constraint: `UNIQUE(ownerEmail, slug)`

#### ✅ Task 3: Verify Company Strategy
- Confirm `companyName` as identifier works
- Test `/companies/{companyName}` routes
- Ensure case-sensitivity handling

### Phase 2: Backend API (Weeks 3-4)

#### ✅ Task 4: Update API Routes for FK Operations
**Change:**
```diff
- POST /opportunities/:opportunityId/interactions
+ POST /opportunities/:opportunitySlug/interactions

- POST /people { jobOpportunityId }
+ POST /people { jobOpportunitySlug }

- POST /interactions/:interactionId/emails
+ POST /interactions/:interactionSlug/emails
```

**Add Slug Resolver Middleware:**
```typescript
async function resolveOpportunitySlug(
  slug: string, 
  ownerEmail: string
): Promise<string> {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: { ownerEmail_slug: { ownerEmail, slug } }
  })
  if (!opportunity) throw new NotFoundError()
  return opportunity.id  // Return ID for FK writes
}
```

#### ✅ Task 5: Remove IDs from API Responses
**Update serializers to exclude:**
- `Opportunity.id`
- `Interaction.id`
- `Interaction.jobOpportunityId`
- `Person.id`
- `Person.jobOpportunityId` (if exists)

**Keep only slugs:**
```typescript
{
  slug: string,
  // ... other fields, but NO id
}
```

### Phase 3: Frontend (Weeks 5-6)

#### ✅ Task 6: Update API Client
**@interviews-tracker/api-client changes:**
```typescript
// Before
createPerson(data: { jobOpportunityId: string })
createInteraction(opportunityId: string, draft)

// After
createPerson(data: { jobOpportunitySlug: string })
createInteraction(opportunitySlug: string, draft)
```

#### ✅ Task 7: Clean Up Frontend Code
**Remove:**
```typescript
const opportunityDbId = data?.id ?? slugOrId
const opportunityApiId = data?.slug ?? data?.id
```

**Keep:**
```typescript
const opportunitySlug = data.slug  // Only one identifier!
```

**Update React Query keys:**
```diff
- ["opportunity", opportunityId]
+ ["opportunity", opportunitySlug]
```

#### ✅ Task 8: Update Frontend Types
```typescript
// Remove id fields
export type Opportunity = {
  // id: string;  ❌ Remove
  slug: string;   // ✅ Only public identifier
  // ...
}
```

### Phase 4: Database Optimization (Week 7)

#### ✅ Task 9: Add Indexes for Slug Lookups
```sql
-- Ensure fast slug-based queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_owner_slug 
  ON job_opportunities(owner_email, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_interaction_owner_slug 
  ON interactions(owner_email, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_person_owner_slug 
  ON people(owner_email, slug);
```

**Performance testing:**
- Benchmark slug lookups vs ID lookups
- Should be identical with proper indexes

### Phase 5: Testing & Migration (Week 8)

#### ✅ Task 10: Migration Strategy
**Support both during transition:**
```typescript
// Accept both ID and slug temporarily
findOpportunity(identifier: string, ownerEmail: string) {
  // Try slug first
  let opp = await findBySlug(identifier, ownerEmail)
  if (!opp) {
    // Fallback to ID for old clients
    opp = await findById(identifier, ownerEmail)
  }
  return opp
}
```

**Feature flag:** `ENABLE_SLUG_ONLY_API`
- Gradual rollout
- Easy rollback if issues

#### ✅ Task 11: Documentation
- Update API docs
- ADR document explaining decision
- Update CLAUDE.md guidelines
- TypeScript branded types:
  ```typescript
  type OpportunitySlug = string & { __brand: 'OpportunitySlug' }
  type OpportunityId = string & { __brand: 'OpportunityId' }
  ```

---

## Migration Timeline

| Phase | Duration | Tasks | Deliverable |
|-------|----------|-------|-------------|
| **1. Foundation** | 2 weeks | 1-3 | Person slugs, audit complete |
| **2. Backend API** | 2 weeks | 4-5 | API accepts slugs, returns no IDs |
| **3. Frontend** | 2 weeks | 6-8 | Frontend uses slugs only |
| **4. Database** | 1 week | 9 | Optimized slug queries |
| **5. Testing** | 1 week | 10-11 | Tested, documented, deployed |
| **Total** | **8 weeks** | | Slug-first architecture ✅ |

---

## Success Metrics

### Code Simplicity
- **Before:** 4 identifier variables per entity
- **After:** 1 slug variable per entity

### Type Safety
- **Before:** Easy to mix ID and slug
- **After:** TypeScript branded types prevent mixing

### Security
- **Before:** Internal DB IDs exposed in URLs, API
- **After:** Only human-readable slugs exposed

### Performance
- **Before:** ID-based queries
- **After:** Slug-based queries (same speed with indexes)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slug uniqueness conflicts | Medium | Proper unique constraints + counter suffix |
| Performance regression | Medium | Add indexes, benchmark before/after |
| Breaking existing integrations | High | Support both ID and slug during transition |
| Migration data issues | Medium | Thorough testing, rollback plan |

---

## Rollback Plan

If issues arise:
1. **Keep feature flag OFF** - Old API still works
2. **No breaking changes** - Backward compatible during transition
3. **Gradual rollout** - Deploy to staging first, then production
4. **Monitor** - Watch for 404s, FK constraint errors

---

## Questions to Resolve

### ❓ Person Slug Format
- Use full name: `eliyahu-katzav-1`?
- Or abbreviated: `e-katzav-1`?
- How to handle duplicates?

**Decision:** Use full name with counter for uniqueness.

### ❓ Company Identifier
- Keep using `companyName` as-is?
- Or normalize to slug format: `reevol` instead of `Reevol`?

**Decision:** TBD - Need to verify case-sensitivity handling in company routes.

### ❓ Migration Cutover
- Big bang deployment?
- Or gradual migration with dual support?

**Decision:** Gradual migration with feature flag for safety.

---

## Next Steps

1. **Review this plan** - Get team alignment
2. **Start Phase 1** - Audit and Person slug generation
3. **Create feature branch** - `refactor/slug-first-architecture`
4. **Weekly check-ins** - Track progress, adjust timeline

---

**Author:** Claude Code (with Itai)  
**Date:** 2026-07-06  
**Status:** Planning Phase  
**Estimated Effort:** 8 weeks
