# Company Entity Migration - Big Bang Plan

## Decisions Locked In

1. ✅ **Contacts → Company-level** (Person.companyId)
2. ✅ **Domains → Both levels** (Company and Opportunity both have domains)
3. ✅ **Deletion → Restrict** (Can't delete company with opportunities)
4. ✅ **Migration → Big Bang** (2 phases, breaking changes)

---

## Phase 1: Schema + Backend (Breaking Changes)

### 1.1 Update Prisma Schema

**Add Company model:**
```prisma
model Company {
  id                   String              @id @default(cuid())
  ownerEmail           String
  slug                 String
  name                 String
  searchName           String?
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
  isWatchlisted        Boolean             @default(false)
  watchlistReason      String?
  lastResearchedAt     DateTime?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  
  employeesRange       CompanySizeOption?  @relation(fields: [employeesRangeId], references: [id])
  companyStage         CompanyStageOption? @relation(fields: [companyStageId], references: [id])
  domains              CompanyDomain[]
  opportunities        JobOpportunity[]
  notesList            Note[]
  tasks                Task[]
  contacts             Person[]
  
  @@unique([ownerEmail, slug])
  @@unique([ownerEmail, name])
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

**Update JobOpportunity:**
- Add `companyId String` (required)
- Add `company Company @relation(...)`
- Remove: `companyName`, `companySearchName`, `employeesRangeId`, `companyStageId`, `location`, `funding`, `companyDescription`, `productDescription`, `customersTraction`, `techStack`, `backendFrontendSplit`
- Keep: `workModelId` (role-specific), `notes` (role-specific), `compensationNotes` (role-specific)
- Update unique constraint: `@@unique([ownerEmail, companyId, roleTitle])`

**Update Person:**
- Remove `jobOpportunityId`, `jobOpportunity` relation
- Add `companyId String?`, `company Company? @relation(...)`
- Remove `company String?` field (redundant with relation)

**Update Note and Task:**
- Add `companyId String?`
- Add `company Company? @relation(...)`

### 1.2 Create Data Migration Script

**Script: `prisma/migrations/[timestamp]_add_company_entity/migration.sql`**

Steps:
1. Create Company table
2. Create CompanyDomain table
3. Migrate data from JobOpportunity to Company (group by ownerEmail + companyName)
4. Update JobOpportunity with companyId foreign keys
5. Update Person to link to Company instead of JobOpportunity
6. Update Note and Task to support companyId
7. Drop old columns from JobOpportunity

**Script: `scripts/migrate-to-company-entity.ts`**
- TypeScript script for complex data migration logic
- Handle slug generation for companies
- Handle domain migration
- Verify data integrity

### 1.3 Update Core Types

**`packages/core/src/domain/contracts.ts`:**
- Add `Company`, `CompanyDetail`, `CompanySummary` types
- Update `JobOpportunity` type to include `companyId` and remove company fields
- Update `Person` type to use `companyId` instead of `jobOpportunityId`

### 1.4 Update Backend Repositories

**New: `apps/api/src/repositories/company-repository.ts`**
- `createCompany()`
- `findCompanyBySlug()`
- `findCompaniesByOwner()`
- `updateCompany()`
- `deleteCompany()` (with restrict check)

**Update: `apps/api/src/repositories/opportunity-repository.ts`**
- Remove company-field logic
- Add company join to queries
- Update serialization

**Update: `apps/api/src/repositories/person-repository.ts`**
- Update to use `companyId` instead of `jobOpportunityId`

### 1.5 Update Backend Services

**New: `apps/api/src/services/companies/company-service.ts`**
- Company CRUD operations
- Watchlist management
- Company research workflow

**Update: `apps/api/src/services/opportunities/opportunity-service.ts`**
- Remove company creation logic
- Require `companyId` for opportunity creation
- Update to work with Company entity

**Update: `apps/api/src/services/companies/company-research-service.ts`**
- Apply research to Company entity
- Propagate to all opportunities

### 1.6 Update Backend Routes

**Update: `apps/api/src/routes/companies.ts`**
- Change from virtual aggregation to Company CRUD
- `GET /companies` - list companies (with watchlist filter)
- `GET /companies/:slug` - get company detail
- `POST /companies` - create company
- `PATCH /companies/:slug` - update company
- `DELETE /companies/:slug` - delete company (with restrict check)
- `POST /companies/:slug/research` - research company
- `POST /companies/:slug/research/apply` - apply research to company

**Update: `apps/api/src/routes/opportunities.ts`**
- Update creation to require `companyId` or auto-create company from `companyName`
- Update responses to include company data

**Update: `apps/api/src/routes/persons.ts`**
- Update to use `companyId`

### 1.7 Update Serializers

**Update: `apps/api/src/lib/serializers.ts`**
- Add `serializeCompany()`
- Update `serializeOpportunity()` to include company
- Update `serializePerson()` to include company

---

## Phase 2: Frontend Updates

### 2.1 Update API Client

**`packages/api-client/src/client.ts`:**
- Update company endpoints to match new CRUD API
- Update opportunity endpoints to accept `companyId`

### 2.2 Update Types

**`packages/core/src/domain/contracts.ts`:**
- Ensure Company types match backend
- Update Opportunity type

### 2.3 Update UI Components

**New: Company creation flow**
- `apps/web/src/components/company-form.tsx`
- `apps/web/src/components/add-company-modal.tsx`

**Update: Opportunity creation**
- `apps/web/src/components/add-opportunity-modal.tsx`
  - Add company selector (existing companies)
  - OR company name input (auto-creates company)

**Update: Company pages**
- `apps/web/src/pages/companies-page.tsx` - now shows real companies
- `apps/web/src/pages/company-detail-page.tsx` - updated to use Company entity

**Update: Opportunity pages**
- `apps/web/src/pages/opportunity-page.tsx` - read from `opportunity.company.*`
- `apps/web/src/pages/opportunities-page.tsx` - include company data

**Update: Person/Contact components**
- Link to company instead of opportunity

### 2.4 Update Routing

**No changes needed** - routes stay the same (`/companies/:slug`, `/opportunities/:slug`)

---

## Implementation Order

### Phase 1 (Backend) - ~3-4 days
1. ✅ Update Prisma schema
2. ✅ Generate migration SQL
3. ✅ Create data migration script
4. ✅ Update core types (`packages/core`)
5. ✅ Create company repository
6. ✅ Update opportunity repository
7. ✅ Update person repository
8. ✅ Create company service
9. ✅ Update opportunity service
10. ✅ Update company routes
11. ✅ Update opportunity routes
12. ✅ Update person routes
13. ✅ Update serializers
14. ✅ Run migration script
15. ✅ Test API endpoints

### Phase 2 (Frontend) - ~2-3 days
1. ✅ Update API client
2. ✅ Update types
3. ✅ Create company creation UI
4. ✅ Update opportunity creation UI
5. ✅ Update company pages
6. ✅ Update opportunity pages
7. ✅ Update person/contact components
8. ✅ Test all flows
9. ✅ Fix regressions

---

## Testing Checklist

### Backend Tests
- [ ] Company CRUD works
- [ ] Can't delete company with opportunities
- [ ] Opportunity creation with companyId works
- [ ] Opportunity creation with companyName auto-creates company
- [ ] Company research applies to all opportunities
- [ ] Person links to company correctly
- [ ] Company-level notes and tasks work

### Frontend Tests
- [ ] Can create company without opportunity (watchlist)
- [ ] Can create opportunity from existing company
- [ ] Can create opportunity with new company name
- [ ] Company page shows all opportunities
- [ ] Opportunity page shows company data
- [ ] Person/contact shows company link

### Migration Tests
- [ ] All existing opportunities have companyId
- [ ] No data loss from migration
- [ ] Slugs are unique
- [ ] Company data correctly consolidated
- [ ] Domains migrated correctly

---

## Rollback Plan

If migration fails:
1. Restore database backup
2. Revert schema changes
3. Revert code changes
4. Investigate failure
5. Fix migration script
6. Retry

**Critical:** Take database backup before running migration!

---

## Timeline

- **Phase 1 (Backend):** 3-4 days
- **Phase 2 (Frontend):** 2-3 days
- **Total:** 5-7 days

---

## Success Criteria

✅ Company is a physical entity in database  
✅ All opportunities linked to a company  
✅ Can create company without opportunity  
✅ Can create multiple opportunities from one company  
✅ Company research applies to all opportunities  
✅ Contacts link to company, shared across opportunities  
✅ No data loss from migration  
✅ All frontend flows work with new structure  

---

## Next: Start Implementation

Ready to begin Phase 1: Schema + Backend changes.
