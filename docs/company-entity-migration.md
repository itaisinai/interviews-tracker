# Company Entity Migration Plan

## Context

**Current state:** Company is a virtual entity derived from `JobOpportunity.companyName`

**New requirements:**
1. Create multiple opportunities from a single company
2. Track companies before specific opportunities exist (watchlist)
3. Research automation to find careers at tracked companies

**Decision:** Introduce a physical `Company` model as a first-class entity.

---

## Proposed Schema Changes

### New `Company` model

```prisma
model Company {
  id                   String              @id @default(cuid())
  ownerEmail           String
  slug                 String              // URL-friendly identifier
  name                 String              // Display name
  searchName           String?             // Normalized for matching
  linkedinUrl          String?
  websiteUrl           String?
  location             String?
  funding              String?
  employeesRangeId     String?
  companyStageId       String?
  description          String?
  productDescription   String?
  customersTraction    String?
  techStack            String?
  backendFrontendSplit String?
  notes                String?
  
  // Watchlist/tracking metadata
  isWatchlisted        Boolean             @default(false)
  watchlistReason      String?             // Why tracking this company
  lastResearchedAt     DateTime?
  
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  
  employeesRange       CompanySizeOption?  @relation(fields: [employeesRangeId], references: [id])
  companyStage         CompanyStageOption? @relation(fields: [companyStageId], references: [id])
  domains              CompanyDomain[]
  opportunities        JobOpportunity[]    // One-to-many
  notesList            Note[]              // Company-level notes
  tasks                Task[]              // Company-level tasks (e.g., "Research careers page")
  
  @@unique([ownerEmail, slug])
  @@unique([ownerEmail, name])  // One company name per owner
  @@index([ownerEmail])
  @@index([ownerEmail, isWatchlisted])
}

model CompanyDomain {
  ownerEmail String
  companyId  String
  domainId   String
  company    Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  domain     DomainOption @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@id([companyId, domainId])
  @@index([ownerEmail])
}
```

### Updated `JobOpportunity` model

```prisma
model JobOpportunity {
  id                   String                 @id @default(cuid())
  ownerEmail           String
  slug                 String
  
  // NEW: Foreign key to Company
  companyId            String
  company              Company                @relation(fields: [companyId], references: [id], onDelete: Restrict)
  
  // DEPRECATED: Keep for backward compatibility during migration
  companyName          String?                // Will be removed after migration
  companySearchName    String?                // Will be removed after migration
  
  roleTitle            String
  pipelineType         PipelineType
  status               JobStatus
  priority             Priority
  
  // Role-specific fields (not company-level)
  referrerOrConnection String?
  source               String?
  jobUrl               String?
  linkedinJobId        String?
  sourceUrl            String?
  nextStep             String?
  notes                String?                // Role-specific notes
  
  // MOVED TO COMPANY: these fields will be removed
  // employeesRangeId, companyStageId, workModelId, location, funding,
  // companyDescription, productDescription, customersTraction,
  // techStack, backendFrontendSplit
  
  workModelId          String?                // Role-specific (can vary per role)
  workModel            WorkModelOption?       @relation(fields: [workModelId], references: [id])
  compensationNotes    String?                // Role-specific
  
  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt
  
  domains              JobOpportunityDomain[] // KEEP: Role can have different domains
  interactions         Interaction[]
  notesList            Note[]                 // Role-specific notes
  tasks                Task[]                 // Role-specific tasks
  compensation         Compensation?
  contacts             Person[]               // DISCUSS: Move to Company or keep on Opportunity?

  @@unique([ownerEmail, slug])
  @@unique([ownerEmail, companyId, roleTitle])  // CHANGED: unique on companyId + roleTitle
  @@index([ownerEmail])
  @@index([companyId])
  @@index([ownerEmail, pipelineType])
  @@index([ownerEmail, status])
}
```

### Updated `Note` and `Task` models

```prisma
model Note {
  id               String          @id @default(cuid())
  ownerEmail       String
  companyId        String?         // NEW: Company-level notes
  jobOpportunityId String?
  interactionId    String?
  title            String
  content          String
  category         String
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  
  company          Company?        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  jobOpportunity   JobOpportunity? @relation(fields: [jobOpportunityId], references: [id], onDelete: Cascade)
  interaction      Interaction?    @relation(fields: [interactionId], references: [id], onDelete: Cascade)

  @@index([ownerEmail])
  @@index([companyId])
}

model Task {
  id               String          @id @default(cuid())
  ownerEmail       String
  companyId        String?         // NEW: Company-level tasks
  jobOpportunityId String?
  interactionId    String?
  title            String
  status           TaskStatus
  priority         Priority
  dueDate          DateTime?
  notes            String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  
  company          Company?        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  jobOpportunity   JobOpportunity? @relation(fields: [jobOpportunityId], references: [id], onDelete: Cascade)
  interaction      Interaction?    @relation(fields: [interactionId], references: [id], onDelete: Cascade)

  @@index([ownerEmail])
  @@index([companyId])
  @@index([ownerEmail, status])
}
```

### Updated `Person` model

**Discussion needed:** Should contacts be tied to Company or JobOpportunity?

**Option A: Company-level contacts** (Recommended)
```prisma
model Person {
  // ... existing fields
  companyId        String?
  company          Company?        @relation(fields: [companyId], references: [id], onDelete: SetNull)
  // Remove jobOpportunityId
}
```

**Option B: Keep opportunity-level contacts**
```prisma
model Person {
  // ... existing fields - no change
  jobOpportunityId String?
  jobOpportunity   JobOpportunity? @relation(fields: [jobOpportunityId], references: [id], onDelete: SetNull)
}
```

**Recommendation:** Option A. Contacts are typically company relationships, not role-specific.

---

## Migration Strategy

### Phase 1: Add Company table (backward compatible)

1. **Create Company table** with all fields
2. **Keep companyName in JobOpportunity** (don't break existing code yet)
3. **Add optional companyId to JobOpportunity** (nullable initially)
4. **Data migration script:**
   - For each unique (ownerEmail, companyName) pair:
     - Create a Company record
     - Move company-level data from first opportunity
     - Update all opportunities with companyId
5. **Verify:** All opportunities have companyId populated

### Phase 2: Update API layer (parallel reads)

1. **Update repositories** to join Company
2. **Update serializers** to read from `opportunity.company.*` OR fall back to `opportunity.companyName`
3. **Add Company CRUD endpoints:**
   - `GET /companies` - list all companies (including watchlist)
   - `GET /companies/:slug` - get company detail
   - `POST /companies` - create company (for watchlist)
   - `PATCH /companies/:slug` - update company
   - `DELETE /companies/:slug` - delete company (cascade to opportunities)
4. **Update opportunity endpoints:**
   - `POST /opportunities` - accept `companyId` or `companyName` (auto-create company if name provided)
   - Response includes full `company` object

### Phase 3: Update frontend (parallel reads)

1. **Update types** in `@interviews-tracker/core`
2. **Update API client** to handle new structure
3. **Update UI components** to read from `opportunity.company.*`
4. **Add company creation flow:**
   - "Add Company to Watchlist" button
   - Company research page works on companies without opportunities
5. **Update opportunity creation:**
   - Option 1: "Start from tracked company" (select existing)
   - Option 2: "New company" (creates company + opportunity)

### Phase 4: Remove deprecated fields

1. **Make companyId required** in JobOpportunity
2. **Remove companyName, companySearchName** from JobOpportunity
3. **Remove company-level fields** from JobOpportunity schema (moved to Company)
4. **Update all queries** to join Company
5. **Update unique constraint** to use companyId instead of companyName

---

## New Features Enabled

### 1. Company Watchlist

```typescript
// User can track companies without opportunities
await api.companies.create({
  name: "Anthropic",
  isWatchlisted: true,
  watchlistReason: "Interested in AI safety work",
  domains: ["AI/ML", "Research"]
});
```

### 2. Create Opportunities from Company

```typescript
// User views company page, clicks "Add Opportunity"
const company = await api.companies.get("anthropic");
await api.opportunities.create({
  companyId: company.id,  // Link to existing company
  roleTitle: "Research Engineer",
  // Company data already exists, no need to duplicate
});
```

### 3. Company Research Automation

```typescript
// Periodic job or user-triggered
await api.companies.research({
  companyId: "...",
  sources: ["careers-page", "linkedin-jobs", "hn-hiring"]
});

// Creates tasks for found opportunities
// User reviews and converts tasks to opportunities
```

### 4. Better Data Consistency

```typescript
// Update company data once, applies to all opportunities
await api.companies.update("anthropic", {
  funding: "Series C - $450M",
  employeesRange: "100-500"
});

// All 3 role opportunities at Anthropic now reflect updated data
```

---

## API Design Examples

### Get Companies (with watchlist filter)

```typescript
GET /companies?watchlisted=true

Response:
[
  {
    slug: "anthropic",
    name: "Anthropic",
    isWatchlisted: true,
    watchlistReason: "Interested in AI safety",
    opportunitiesCount: 2,
    activeProcesses: 1,
    lastResearchedAt: "2026-07-01T10:00:00Z"
  },
  {
    slug: "openai",
    name: "OpenAI",
    isWatchlisted: true,
    watchlistReason: "AI research leadership",
    opportunitiesCount: 0,  // Tracked but no opportunities yet
    lastResearchedAt: null
  }
]
```

### Get Company Detail

```typescript
GET /companies/anthropic

Response:
{
  slug: "anthropic",
  name: "Anthropic",
  description: "AI safety and research company",
  funding: "Series C - $450M",
  employees: "100-500",
  domains: ["AI/ML", "Research"],
  isWatchlisted: true,
  
  opportunities: [
    {
      slug: "anthropic-research-engineer",
      roleTitle: "Research Engineer",
      status: "APPLIED",
      priority: "HIGH",
      // ... role-specific data
    },
    {
      slug: "anthropic-ml-engineer",
      roleTitle: "ML Engineer", 
      status: "RESEARCH_LEAD",
      priority: "MEDIUM"
    }
  ],
  
  notes: [...],  // Company-level notes
  tasks: [...]   // Company-level tasks
}
```

### Create Company (Watchlist)

```typescript
POST /companies

{
  name: "Anthropic",
  isWatchlisted: true,
  watchlistReason: "Interested in AI safety work",
  domains: ["AI/ML", "Research"]
}

Response: 201 Created
{
  slug: "anthropic",
  name: "Anthropic",
  isWatchlisted: true,
  opportunitiesCount: 0
}
```

### Create Opportunity from Company

```typescript
POST /opportunities

{
  companyId: "cuid-of-anthropic-company",
  roleTitle: "Research Engineer",
  status: "RESEARCH_LEAD",
  priority: "HIGH"
}

// OR auto-create company if doesn't exist:
{
  companyName: "Anthropic",  // Backend creates company if needed
  roleTitle: "Research Engineer"
}
```

---

## Open Questions

1. **Person/Contact placement:**
   - Should contacts be company-level or opportunity-level?
   - Recommendation: Company-level (contacts are usually company relationships)

2. **Company deletion:**
   - What happens to opportunities when company is deleted?
   - Recommendation: `onDelete: Restrict` - can't delete company with opportunities

3. **Domain assignment:**
   - Keep domains on both Company and Opportunity?
   - Recommendation: Yes - company has general domains, role might be more specific

4. **WorkModel:**
   - Company-level or opportunity-level?
   - Recommendation: Opportunity-level (can vary by role)

5. **Backward compatibility:**
   - How long to maintain `companyName` field?
   - Recommendation: 2 migration phases, remove after frontend fully migrated

6. **Company slug conflicts:**
   - What if user creates "Google" and later "Google Inc"?
   - Recommendation: Fuzzy match warning + merge tool

---

## Timeline Estimate

- **Phase 1 (Schema + Migration):** 2-3 days
- **Phase 2 (API Layer):** 3-4 days  
- **Phase 3 (Frontend):** 4-5 days
- **Phase 4 (Cleanup):** 1-2 days

**Total:** ~2 weeks for full migration

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Keep companyName field until phase 4, rollback script ready |
| API breaking changes | Parallel read/write during phase 2-3, feature flag for new API |
| Frontend regressions | Gradual component updates, backward-compatible serializers |
| Slug conflicts | Validation + merge tool before phase 4 |
| Performance (extra joins) | Index companyId, measure query performance, add caching if needed |

---

## Success Criteria

✅ All existing opportunities linked to a Company record  
✅ No data loss from migration  
✅ User can create company without opportunity  
✅ User can create multiple opportunities from one company  
✅ Company research applies to all opportunities  
✅ Company page shows all opportunities  
✅ No breaking changes to existing frontend during migration  

---

**Next Steps:**
1. Review this proposal with team/stakeholders
2. Decide on open questions (Person placement, domains, etc.)
3. Create migration script for Phase 1
4. Update CLAUDE.md product philosophy to reflect company as first-class entity
