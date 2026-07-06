# Slug-First API Contract Design

## Overview

This document defines the slug-first API contract where internal database IDs are never exposed to the frontend. All entity references use human-readable slugs instead.

## Entity Identifiers

| Entity | Public Identifier | Format | Uniqueness Scope |
|--------|------------------|--------|-----------------|
| Opportunity | `slug` | `{company}-{role}` | Per ownerEmail |
| Interaction | `slug` | `{company}-{title}` | Per ownerEmail |
| Person | `slug` | `{name}` | Per ownerEmail |
| Company | `companyName` | `{name}` | Virtual entity |

## API Endpoint Patterns

### Current (ID-based) vs Target (Slug-based)

| Operation | Current Pattern | Target Pattern |
|-----------|----------------|----------------|
| Get Opportunity | `GET /opportunities/:id` | `GET /opportunities/:slug` |
| Get Interaction | `GET /interactions/:id` | `GET /interactions/:slug` |
| Get Person | `GET /people/:id` | `GET /people/:slug` |
| Create Interaction | `POST /interactions` with `jobOpportunityId` | `POST /interactions` with `opportunitySlug` |
| Create Person | `POST /people` with `jobOpportunityId` | `POST /people` with `opportunitySlug` |

### Foreign Key Operations

When creating/updating entities with FK relationships, accept slugs and resolve internally:

```typescript
// Current (frontend passes DB IDs)
POST /interactions
{
  jobOpportunityId: "clxxxxx",  // ❌ DB ID
  date: "2026-07-06T10:00:00Z",
  type: "Phone Screen"
}

// Target (frontend passes slugs)
POST /interactions
{
  opportunitySlug: "acme-senior-engineer",  // ✅ Slug
  date: "2026-07-06T10:00:00Z",
  type: "Phone Screen"
}
```

## Response Contract

### Remove ID Fields

API responses should exclude internal database IDs:

```typescript
// Current response
{
  id: "clxxxxx",              // ❌ Remove
  slug: "acme-senior-engineer",
  companyName: "Acme Corp",
  roleTitle: "Senior Engineer",
  // ...
}

// Target response
{
  slug: "acme-senior-engineer", // ✅ Only public identifier
  companyName: "Acme Corp",
  roleTitle: "Senior Engineer",
  // ...
}
```

### Backward Compatibility Strategy

During migration, support both patterns:
1. Accept both `jobOpportunityId` and `opportunitySlug` (prefer slug)
2. Return both `id` and `slug` in responses
3. Log deprecation warnings when `id` is used
4. Remove `id` support after frontend migration

## Implementation Approach

### Phase 1: Backend Slug Resolution Layer

Create middleware/utilities to resolve slugs to IDs at API boundary:

```typescript
// apps/api/src/lib/slug-resolver.ts
export async function resolveOpportunitySlug(
  slug: string,
  ownerEmail: string
): Promise<string> {
  const opportunity = await prisma.jobOpportunity.findUnique({
    where: { ownerEmail_slug: { ownerEmail, slug } },
    select: { id: true }
  });
  
  if (!opportunity) {
    throw new NotFoundError(`Opportunity ${slug} not found`);
  }
  
  return opportunity.id;
}
```

### Phase 2: Update Controllers

Controllers accept slugs, resolve to IDs, call existing services:

```typescript
// Before
export async function createInteractionHandler(request: AuthenticatedRequest) {
  const input = interactionInputSchema.parse(request.body);
  return createInteraction(input, request.auth.email);
}

// After
export async function createInteractionHandler(request: AuthenticatedRequest) {
  const { opportunitySlug, ...input } = interactionInputSchema.parse(request.body);
  const jobOpportunityId = await resolveOpportunitySlug(opportunitySlug, request.auth.email);
  return createInteraction({ ...input, jobOpportunityId }, request.auth.email);
}
```

### Phase 3: Update Response DTOs

Create response transformers to remove `id` fields:

```typescript
export function toOpportunityPublicDTO(opportunity: JobOpportunity) {
  const { id, ...rest } = opportunity;  // Strip internal ID
  return rest;
}
```

### Phase 4: Update Frontend

Update API client to use slugs everywhere, remove ID tracking.

## Migration Checklist

### Backend Changes

- [ ] Create slug-resolver utilities (Task 5)
- [ ] Update Opportunity endpoints to accept opportunitySlug
- [ ] Update Interaction endpoints to accept opportunitySlug
- [ ] Update Person endpoints to accept opportunitySlug
- [ ] Create public DTO transformers (Task 6)
- [ ] Remove `id` from API responses

### Frontend Changes

- [ ] Update API client type definitions (Task 7)
- [ ] Replace `opportunityApiId` with `opportunitySlug`
- [ ] Replace `interactionApiId` with `interactionSlug`
- [ ] Replace `personApiId` with `personSlug`
- [ ] Remove ID state tracking (Task 8)
- [ ] Update URL patterns to use slugs

### Database Changes

- [x] Add Person.slug field and migration
- [x] Add Person.ownerEmail field
- [ ] Verify all entities have unique slug indexes

## Testing Strategy

### Unit Tests
- Slug generation with collision handling
- Slug resolution (found, not found, ownership)
- DTO transformation (ID removal)

### Integration Tests
- Create entity via slug FK (Interaction → Opportunity)
- Get entity by slug
- Slug uniqueness enforcement
- Owner isolation (can't access other user's slugs)

### End-to-End Tests
- Full CRUD flows using only slugs
- URL routing with slugs
- Gmail import with slug-based attachment

## Rollback Plan

If issues arise:
1. Revert frontend to use IDs (keep slug support in backend)
2. Backend continues to support both ID and slug lookups
3. Fix issues in slug layer
4. Re-deploy frontend with slug-only support

Slug fields remain in database, no data loss.

## Performance Considerations

### Index Strategy
All slug lookups use compound indexes:
- `(ownerEmail, slug)` - unique, covers all queries
- Existing ID-based indexes remain for internal FK constraints

### Query Performance
- Slug lookup: `WHERE ownerEmail = ? AND slug = ?` uses index
- ID lookup (internal): `WHERE id = ?` uses primary key
- No performance degradation expected

### Caching
Consider caching slug→ID resolution for hot paths:
- Opportunity slug resolution during bulk operations
- Short TTL (10s) to handle slug changes
- Cache key: `{ownerEmail}:{entityType}:{slug}`

## Open Questions

1. **Slug immutability:** Should slugs be immutable, or can users rename opportunities?
   - **Decision:** Slugs are derived from name fields, regenerated on update with collision handling
   
2. **URL breaking changes:** If opportunity renamed, old URLs with old slug break
   - **Decision:** Accept this - slugs are semantic, breaking URLs is expected when names change
   
3. **Slug validation:** Should we enforce slug format at API layer?
   - **Decision:** No - slugs are server-generated, clients never construct them

4. **Bulk operations:** How to handle bulk FK resolution efficiently?
   - **Decision:** Implement batch slug resolver with single DB query + Map lookup

---

**Status:** Design approved, implementation in progress (Task 5)
**Last Updated:** 2026-07-06
