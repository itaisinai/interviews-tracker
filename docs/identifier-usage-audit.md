# Entity Identifier Usage Audit

**Date:** 2026-07-06  
**Status:** Task #1 - Complete Audit

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Opportunity identifier references in frontend | 210 |
| Interaction identifier references in frontend | 65 |
| Person identifier references in frontend | 27 |
| **Total identifier references** | **302** |

---

## Entity Analysis

### 1. Opportunity

#### Database Schema (Prisma)
```prisma
model JobOpportunity {
  id                     String    @id @default(cuid())
  ownerEmail             String
  slug                   String    ✅ HAS SLUG
  companyName            String
  // ...
}
```

#### Type Definition
```typescript
export type Opportunity = {
  id: string;           // ❌ Exposed to frontend
  slug: string;         // ✅ Already has slug
  ownerEmail: string;
  // ...
}
```

#### Frontend Usage Pattern (opportunity-detail-page.tsx)
```typescript
const opportunityRouteId = data?.slug ?? data?.id ?? slugOrId;
const opportunityApiId = data?.slug ?? data?.id ?? slugOrId;  // For API calls
const opportunityDbId = data?.id ?? slugOrId;                 // For FK writes
const canonicalSlug = data?.slug ?? null;
```

**Problem:** 4 different variables to track one entity!

#### Current Issues
- ❌ Frontend tracks 4 identifier variables per opportunity
- ❌ DB ID exposed in API responses
- ❌ Confusion about which identifier to use where
- ❌ FK operations require `jobOpportunityId` (DB ID)

**Occurrences:** ~210 references across frontend

---

### 2. Interaction

#### Database Schema (Prisma)
```prisma
model Interaction {
  id               String      @id @default(cuid())
  ownerEmail       String
  slug             String      ✅ HAS SLUG
  jobOpportunityId String      // FK to Opportunity
  // ...
}
```

#### Type Definition
```typescript
export type Interaction = {
  id: string;              // ❌ Exposed to frontend
  slug: string;            // ✅ Already has slug
  jobOpportunityId: string; // ❌ FK ID exposed
  // ...
}
```

#### Frontend Usage Pattern
```typescript
// Common pattern
const interactionId = interaction.id;         // Used for API calls
const interactionSlug = interaction.slug;     // Used for routing
```

#### Current Issues
- ❌ Both `id` and `slug` tracked
- ❌ `jobOpportunityId` (FK) exposed to frontend
- ❌ API calls mix ID and slug usage

**Occurrences:** ~65 references across frontend

---

### 3. Person

#### Database Schema (Prisma)
```prisma
model Person {
  id               String    @id @default(cuid())
  name             String
  // NO SLUG FIELD ❌
  jobOpportunityId String?   // FK to Opportunity
  // ...
}
```

#### Type Definition
```typescript
export type Person = {
  id: string;              // ❌ Only has ID, no slug
  name: string;
  // ...
}
```

#### Frontend Usage Pattern
```typescript
// Only ID available
const personId = person.id;
```

#### Current Issues
- ❌ **NO SLUG FIELD** - Must be added!
- ❌ Only ID available (not user-friendly)
- ❌ `jobOpportunityId` FK exposed

**Occurrences:** ~27 references across frontend

**Action Required:** Add slug generation to Person entity

---

### 4. Company (Virtual Entity)

#### Database Schema
```prisma
// NO dedicated Company table
// Derived from JobOpportunity.companyName
```

#### Frontend Usage
```typescript
// Company views use companyName as identifier
const companyName = opportunity.companyName;
// Routes: /companies/{companyName}
```

#### Current State
- ✅ Already uses human-readable identifier (`companyName`)
- ✅ No separate Company entity means no ID confusion
- ⚠️ Case-sensitivity might be an issue

**Status:** Works like a slug already, minimal changes needed

---

## FK Operation Analysis

### Where IDs Are Required Today

#### 1. Creating Person
```typescript
// Frontend
api.createPerson({
  name: "John Doe",
  jobOpportunityId: opportunityDbId  // ❌ Requires DB ID
})

// Backend
await prisma.person.create({
  data: {
    jobOpportunityId: id  // FK constraint
  }
})
```

#### 2. Creating Interaction
```typescript
// Frontend
api.createInteraction(opportunityId, draft)  // Uses slug OR id

// Backend (opportunities-controller.ts)
return createInteractionRecord({ 
  ...input, 
  jobOpportunityId: opportunity.id  // ❌ Converts to ID
}, ownerEmail);
```

#### 3. Attaching Emails to Interaction
```typescript
// Frontend
api.attachEmailToInteraction(interactionSlug, emailId)

// Backend
await prisma.interactionEmail.create({
  data: {
    interactionId: interaction.id  // ❌ FK requires ID
  }
})
```

---

## API Endpoint Audit

### Opportunity Endpoints

| Endpoint | Param Type | FK Operations |
|----------|-----------|---------------|
| `GET /opportunities/:slugOrId` | Slug or ID | None |
| `PATCH /opportunities/:slugOrId` | Slug or ID | None |
| `DELETE /opportunities/:slugOrId` | Slug or ID | Cascades |
| `POST /opportunities/:id/interactions` | **ID only** ❌ | Uses `jobOpportunityId` |

### Interaction Endpoints

| Endpoint | Param Type | FK Operations |
|----------|-----------|---------------|
| `GET /interactions/:slug` | Slug | None |
| `PATCH /interactions/:slug` | Slug | None |
| `DELETE /interactions/:slug` | Slug | Cascades |
| `POST /interactions/:slug/emails` | Slug | Resolves to `interactionId` |

### Person Endpoints

| Endpoint | Param Type | FK Operations |
|----------|-----------|---------------|
| `GET /people/:id` | **ID only** ❌ | None |
| `POST /people` | Body: `jobOpportunityId` ❌ | Uses `jobOpportunityId` FK |
| `DELETE /people/:id` | **ID only** ❌ | None |

---

## Pain Points Discovered

### 1. Identifier Proliferation
**Problem:** Multiple variables to track same entity
```typescript
// opportunity-detail-page.tsx
const opportunityRouteId = data?.slug ?? data?.id ?? slugOrId;
const opportunityApiId = data?.slug ?? data?.id ?? slugOrId;
const opportunityDbId = data?.id ?? slugOrId;
const canonicalSlug = data?.slug ?? null;
```

**Impact:** Confusing, error-prone, unnecessary complexity

### 2. Mixed Identifier Types in API
**Problem:** Some endpoints accept slugs, others require IDs
```typescript
// Works with slug
api.opportunity("reevol-senior-dev")

// Requires ID ❌
api.createPerson({ jobOpportunityId: "cm58abc123" })
```

**Impact:** Frontend must track both ID and slug

### 3. FK IDs Exposed to Frontend
**Problem:** Internal database IDs in API responses
```json
{
  "id": "cm58abc123",           // ❌ Internal
  "slug": "reevol-senior-dev",  // ✅ Public
  "interactions": [
    {
      "id": "cm58def456",              // ❌ Internal
      "slug": "reevol-phone-screen",   // ✅ Public
      "jobOpportunityId": "cm58abc123" // ❌ FK exposed
    }
  ]
}
```

**Impact:** 
- Larger payloads
- Security concern (exposing internal IDs)
- Encourages ID-based code

### 4. Person Has No Slug
**Problem:** Person entity only has ID
```typescript
// Can't do this today:
<Link to={`/people/${person.slug}`}>  // ❌ No slug

// Must do this:
<Link to={`/people/${person.id}`}>    // ❌ Ugly URL
```

**Impact:** Inconsistent with other entities

---

## Index Analysis

### Current Database Indexes
```sql
-- JobOpportunity
@@unique([ownerEmail, slug])  ✅ Good for slug lookups

-- Interaction  
@@unique([ownerEmail, slug])  ✅ Good for slug lookups

-- Person
// NO slug index ❌
```

**Performance:** Slug lookups are already optimized for Opportunity and Interaction

---

## Code Hotspots (High-Impact Files)

### Files with Most ID Confusion

1. **apps/web/src/pages/opportunity-detail-page.tsx** (~40 references)
   - Tracks 4 different identifier variables
   - Passes different IDs to different components
   
2. **apps/web/src/components/interactions-drawer/** (~25 references)
   - Mixed interactionId and interactionSlug usage
   
3. **packages/api-client/src/client.ts** (~15 references)
   - API methods inconsistent (some use slug, some use ID)

4. **apps/api/src/controllers/opportunities-controller.ts** (~10 references)
   - FK operations require ID conversion

---

## Migration Complexity Estimate

| Entity | Frontend Changes | Backend Changes | Database Changes | Risk |
|--------|------------------|-----------------|------------------|------|
| **Opportunity** | Medium (210 refs) | Medium (slug→ID resolver) | Low (slug exists) | Medium |
| **Interaction** | Low (65 refs) | Low (already uses slugs) | Low (slug exists) | Low |
| **Person** | Medium (27 refs) | High (add slug generation) | **High (migration needed)** | High |
| **Company** | Low (virtual entity) | Low (already uses name) | None | Low |

---

## Key Findings

### ✅ Good News
1. Opportunity and Interaction already have slugs in database
2. Slug-based lookups already indexed and performant
3. Many API endpoints already accept slugs
4. Company entity already uses human-readable identifier

### ❌ Challenges
1. **Person entity needs slug implementation** (highest priority)
2. 302 identifier references across frontend to clean up
3. FK operations deeply embedded in backend
4. Risk of breaking existing integrations during migration

### 🎯 Recommendations
1. **Start with Person slug generation** - unblocks other work
2. **Create slug resolver middleware** - centralizes slug→ID conversion
3. **Migrate gradually** - support both ID and slug during transition
4. **Use feature flag** - easy rollback if issues arise

---

## Next Steps

1. ✅ **Task 1 Complete** - Audit finished
2. ➡️ **Task 3** - Add slug generation for Person entity (highest priority)
3. ➡️ **Task 4** - Verify Company strategy (quick win)
4. ➡️ **Task 2** - Design slug-first API contract based on findings

---

**Audit completed:** 2026-07-06  
**Total time:** ~30 minutes  
**Files analyzed:** 50+  
**Patterns identified:** 5 major pain points
