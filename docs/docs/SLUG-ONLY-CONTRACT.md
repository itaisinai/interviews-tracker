# Slug-Only Contract: Frontend ↔ Backend

## Core Principle

**The frontend NEVER sends or receives internal database IDs.**

All communication between frontend and backend uses human-readable slugs:
- `acme-senior-engineer` (not `clxxxxx123`)
- `reevol-technical-interview` (not `cm58abc123`)
- `john-doe` (not `clu7xyz789`)

---

## API Contract

### Entity Identifiers

| Entity | Public Identifier (Frontend) | Internal ID (Backend Only) |
|--------|------------------------------|----------------------------|
| Opportunity | `slug: "acme-senior-engineer"` | `id: "clxxxxx123"` |
| Interaction | `slug: "acme-technical-interview"` | `id: "cm58abc123"` |
| Person | `slug: "john-doe"` | `id: "clu7xyz789"` |
| Company | `companyName: "Acme Corp"` | (virtual entity, no table) |

### Request Format

**Frontend sends slugs:**
```typescript
// Create interaction
POST /interactions
{
  "opportunitySlug": "acme-senior-engineer",  // ✅ Slug
  "type": "Technical Interview",
  "date": "2026-07-10T14:00:00Z"
}

// Create person
POST /people
{
  "name": "John Doe",
  "email": "john@example.com",
  "opportunitySlug": "acme-senior-engineer"  // ✅ Slug
}

// Get opportunity
GET /opportunities/acme-senior-engineer  // ✅ Slug in URL
```

**Backend resolves internally:**
```typescript
// 1. Receive slug from frontend
const { opportunitySlug } = request.body;

// 2. Resolve to internal ID
const opportunityId = await resolveOpportunitySlug(
  opportunitySlug, 
  request.auth.email
);
// opportunityId = "clxxxxx123"

// 3. Use ID for database FK
await prisma.interaction.create({
  data: {
    jobOpportunityId: opportunityId,  // Internal ID
    // ... other fields
  }
});
```

### Response Format

**Current (Phase 2):**
```typescript
// Backend still includes IDs (backward compatibility)
{
  "id": "clxxxxx123",              // ⚠️ Still present
  "slug": "acme-senior-engineer",  // ✅ Public identifier
  "companyName": "Acme Corp"
}
```

**Target (Phase 3):**
```typescript
// Backend will remove IDs entirely
{
  "slug": "acme-senior-engineer",  // ✅ Only public identifier
  "companyName": "Acme Corp"
  // NO "id" field
}
```

**Frontend behavior:**
```typescript
// Frontend ALWAYS uses slug
const opportunity = await api.opportunity("acme-senior-engineer");

// Even if response has ID, frontend ignores it
console.log(opportunity.slug);  // ✅ Used everywhere
console.log(opportunity.id);    // ⚠️ Ignored (will be removed in Phase 3)
```

---

## Complete API Examples

### 1. Opportunity Operations

```typescript
// Create
const opportunity = await api.createOpportunity({
  companyName: "Acme Corp",
  roleTitle: "Senior Engineer"
});
// Returns: { slug: "acme-corp-senior-engineer", ... }

// Read
const opportunity = await api.opportunity("acme-corp-senior-engineer");

// Update
await api.updateOpportunity("acme-corp-senior-engineer", {
  roleTitle: "Staff Engineer"
});
// New slug: "acme-corp-staff-engineer"

// Delete
await api.deleteOpportunity("acme-corp-senior-engineer");

// List interactions
const interactions = await api.listOpportunityInteractions(
  "acme-corp-senior-engineer"
);
```

### 2. Interaction Operations

```typescript
// Create (via opportunity)
const interaction = await api.createInteraction(
  "acme-corp-senior-engineer",  // ✅ opportunitySlug
  {
    type: "Technical Interview",
    date: "2026-07-10T14:00:00Z"
  }
);
// Returns: { slug: "acme-corp-technical-interview", ... }

// Create (global)
const interaction = await api.createGlobalInteraction({
  opportunitySlug: "acme-corp-senior-engineer",  // ✅ slug in body
  type: "Phone Screen",
  date: "2026-07-06T10:00:00Z"
});

// Read
const interaction = await api.interaction("acme-corp-technical-interview");

// Update
await api.updateInteraction("acme-corp-technical-interview", {
  outcome: "Went well, moving forward"
});

// Delete
await api.deleteInteraction("acme-corp-technical-interview");
```

### 3. Person Operations

```typescript
// Create
const person = await api.createPerson({
  name: "John Doe",
  email: "john@example.com",
  opportunitySlug: "acme-corp-senior-engineer"  // ✅ slug
});
// Returns: { slug: "john-doe", ... }

// Read
const person = await api.getPerson("john-doe");

// Update
await api.updatePerson("john-doe", {
  title: "Engineering Manager"
});

// Delete
await api.deletePerson("john-doe");

// Get contacts for opportunity
const contacts = await api.getOpportunityContacts(
  "acme-corp-senior-engineer"  // ✅ opportunitySlug
);
```

### 4. Gmail Operations

```typescript
// Search emails
const results = await api.gmailSearch("acme-corp-senior-engineer");

// Parse email
const parsed = await api.gmailParseEmail(
  "acme-corp-senior-engineer",  // ✅ opportunitySlug
  { messageId: "gmail-msg-123" }
);

// Hide email
await api.gmailHideEmail(
  "acme-corp-senior-engineer",  // ✅ opportunitySlug
  "gmail-msg-123"
);

// Attach email to interaction
await api.attachEmailToInteraction(
  "acme-corp-technical-interview",  // ✅ interactionSlug
  "gmail-msg-456"
);
```

---

## URL Patterns

All URLs use slugs, never IDs:

```
✅ Good:
/opportunities/acme-corp-senior-engineer
/opportunities/reevol-staff-engineer
/interactions/acme-technical-interview

❌ Never:
/opportunities/clxxxxx123
/interactions/cm58abc123
```

---

## Frontend State Management

**Before (confusing):**
```typescript
// Tracked multiple IDs per entity
const opportunityRouteId = data?.slug ?? data?.id ?? slugOrId;
const opportunityApiId = data?.slug ?? data?.id ?? slugOrId;
const opportunityDbId = data?.id ?? slugOrId;

// Different uses for different IDs
api.updateOpportunity(opportunityApiId, updates);        // API calls
api.createPerson({ jobOpportunityId: opportunityDbId }); // FK writes
navigate(`/opportunities/${opportunityRouteId}`);        // Routing
```

**After (simple):**
```typescript
// Single identifier everywhere
const opportunitySlug = data.slug;

// Same slug for everything
api.updateOpportunity(opportunitySlug, updates);
api.createPerson({ opportunitySlug });
navigate(`/opportunities/${opportunitySlug}`);
```

---

## Slug Generation Rules

### Opportunity Slugs
**Format:** `{company-name}-{role-title}`

**Examples:**
- Company: "Acme Corp", Role: "Senior Engineer" → `acme-corp-senior-engineer`
- Company: "AI Startup", Role: "ML Lead" → `ai-startup-ml-lead`

**Collisions:**
- First: `acme-corp-senior-engineer`
- Second: `acme-corp-senior-engineer-2`
- Third: `acme-corp-senior-engineer-3`

### Interaction Slugs
**Format:** `{company-name}-{interaction-title}`

**Examples:**
- Company: "Acme Corp", Type: "Technical Interview" → `acme-corp-technical-interview`
- Company: "Reevol", Type: "Phone Screen", Stage: "Final" → `reevol-phone-screen-final`

### Person Slugs
**Format:** `{full-name}`

**Examples:**
- Name: "John Doe" → `john-doe`
- Name: "Jane Smith" → `jane-smith`

**Collisions:**
- First: `john-doe`
- Second: `john-doe-2`

---

## Uniqueness & Scope

### Slugs are Unique Per Owner

Two different users can have the same slug:

**User A:**
```
/opportunities/acme-corp-engineer  →  User A's opportunity
```

**User B:**
```
/opportunities/acme-corp-engineer  →  User B's opportunity
```

Database constraint: `UNIQUE(ownerEmail, slug)`

### Backend Enforces Ownership

```typescript
// User A requests User B's slug
GET /opportunities/acme-corp-engineer
Authorization: Bearer <user-a-token>

// Backend queries:
SELECT * FROM "JobOpportunity"
WHERE "ownerEmail" = 'user-a@example.com'  // From token
  AND "slug" = 'acme-corp-engineer';

// Returns User A's opportunity only
```

---

## Backward Compatibility (Current Phase)

### Backend Still Accepts IDs

For smooth migration, backend temporarily accepts both:

```typescript
// New frontend (sends slug)
POST /interactions { opportunitySlug: "acme-corp-engineer" }
✅ Works

// Old frontend (sends ID)
POST /interactions { jobOpportunityId: "clxxxxx123" }
✅ Still works (deprecated, but supported)

// Both provided (slug wins)
POST /interactions {
  opportunitySlug: "acme-corp-engineer",
  jobOpportunityId: "clxxxxx123"
}
✅ Uses slug, ignores ID
```

**Will be removed in Phase 4.**

### Backend Still Returns IDs

Responses currently include both:

```typescript
{
  "id": "clxxxxx123",              // ⚠️ For backward compatibility
  "slug": "acme-corp-engineer",    // ✅ Primary identifier
  "companyName": "Acme Corp"
}
```

**Frontend behavior:**
- ✅ **Use:** `opportunity.slug`
- ❌ **Ignore:** `opportunity.id`

**Will be removed in Phase 3.**

---

## Error Handling

### Slug Not Found

```typescript
GET /opportunities/nonexistent-slug

Response: 404 Not Found
{
  "error": "Opportunity 'nonexistent-slug' not found"
}
```

### Invalid Foreign Key Slug

```typescript
POST /interactions
{
  "opportunitySlug": "invalid-slug",
  "type": "Phone Screen"
}

Response: 404 Not Found
{
  "error": "Opportunity 'invalid-slug' not found"
}
```

### Slug Collision (Database Level)

```typescript
// Should never happen (backend handles collisions)
// But if it does:

Response: 500 Internal Server Error
{
  "error": "Unique constraint violation on (ownerEmail, slug)"
}
```

---

## Migration Path Summary

### Phase 1: Backend Ready ✅
- Backend accepts `opportunitySlug`, `interactionSlug`, `personSlug`
- Slug resolvers implemented
- Still accepts IDs (deprecated)

### Phase 2: Frontend Migrated ✅
- Frontend sends only slugs
- No more ID-based requests from new code
- Backend still returns IDs in responses

### Phase 3: Clean Responses (NEXT)
- Backend stops returning IDs
- Responses include only slugs
- TypeScript types updated

### Phase 4: Remove ID Support (FUTURE)
- Backend stops accepting IDs
- Slug-only contract enforced
- Backward compatibility code removed

---

## Benefits

### 1. Simpler Code
**One identifier type, not three.**

### 2. Human-Readable URLs
```
/opportunities/acme-corp-senior-engineer
/people/john-doe
```
vs
```
/opportunities/clxxxxx123
/people/clu7xyz789
```

### 3. Better Security
Internal database structure not exposed.

### 4. Consistent Pattern
All entities use same pattern: `GET /{entity}/{slug}`

### 5. Easier Debugging
Logs show readable slugs, not opaque IDs:
```
[2026-07-06] Creating interaction for opportunity: acme-corp-senior-engineer
```

---

## Quick Reference

### Frontend Always Uses Slugs

```typescript
// ✅ Correct
api.opportunity(opportunitySlug)
api.createInteraction(opportunitySlug, data)
api.createPerson({ opportunitySlug })

// ❌ Never do this
api.opportunity(opportunityId)          // Wrong!
api.createPerson({ jobOpportunityId })  // Wrong!
```

### Backend Resolves Internally

```typescript
// Frontend sends
{ opportunitySlug: "acme-corp-engineer" }

// Backend resolves
const id = await resolveOpportunitySlug("acme-corp-engineer", ownerEmail);
// id = "clxxxxx123"

// Backend uses ID for database
await prisma.create({ data: { jobOpportunityId: id } })
```

### URLs Always Use Slugs

```typescript
navigate(`/opportunities/${opportunitySlug}`)
navigate(`/interactions/${interactionSlug}`)
navigate(`/people/${personSlug}`)
```

---

**Current Status:** Phase 2 Complete ✅  
**Next Milestone:** Phase 3 - Remove IDs from responses
