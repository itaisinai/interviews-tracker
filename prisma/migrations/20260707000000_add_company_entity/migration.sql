-- CreateTable: Company
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchName" TEXT,
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "location" TEXT,
    "funding" TEXT,
    "employeesRangeId" TEXT,
    "companyStageId" TEXT,
    "description" TEXT,
    "productDescription" TEXT,
    "customersTraction" TEXT,
    "techStack" TEXT,
    "backendFrontendSplit" TEXT,
    "companyNotes" TEXT,
    "isWatchlisted" BOOLEAN NOT NULL DEFAULT false,
    "watchlistReason" TEXT,
    "lastResearchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CompanyDomain
CREATE TABLE "CompanyDomain" (
    "ownerEmail" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "CompanyDomain_pkey" PRIMARY KEY ("companyId","domainId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerEmail_slug_key" ON "Company"("ownerEmail", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerEmail_name_key" ON "Company"("ownerEmail", "name");

-- CreateIndex
CREATE INDEX "Company_ownerEmail_idx" ON "Company"("ownerEmail");

-- CreateIndex
CREATE INDEX "Company_ownerEmail_isWatchlisted_idx" ON "Company"("ownerEmail", "isWatchlisted");

-- CreateIndex
CREATE INDEX "CompanyDomain_ownerEmail_idx" ON "CompanyDomain"("ownerEmail");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_employeesRangeId_fkey" FOREIGN KEY ("employeesRangeId") REFERENCES "CompanySizeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyStageId_fkey" FOREIGN KEY ("companyStageId") REFERENCES "CompanyStageOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDomain" ADD CONSTRAINT "CompanyDomain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDomain" ADD CONSTRAINT "CompanyDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "DomainOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add companyId to JobOpportunity (nullable for now, will be required after data migration)
ALTER TABLE "JobOpportunity" ADD COLUMN "companyId" TEXT;

-- Add companyId to Note
ALTER TABLE "Note" ADD COLUMN "companyId" TEXT;

-- Add companyId to Task
ALTER TABLE "Task" ADD COLUMN "companyId" TEXT;

-- Update Person: Add companyId
ALTER TABLE "Person" ADD COLUMN "companyId" TEXT;

-- CreateIndex for new foreign keys
CREATE INDEX "JobOpportunity_companyId_idx" ON "JobOpportunity"("companyId");

CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");

CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

CREATE INDEX "Person_companyId_idx" ON "Person"("companyId");

CREATE INDEX "Person_name_companyId_idx" ON "Person"("name", "companyId");

-- NOTE: Data migration will be run via TypeScript script after this SQL migration
-- The script will:
-- 1. Extract unique companies from JobOpportunity
-- 2. Create Company records
-- 3. Update JobOpportunity.companyId
-- 4. Migrate Person.companyId from Person.jobOpportunityId
-- 5. Migrate domains to CompanyDomain

-- After data migration, we'll run another migration to:
-- 1. Make JobOpportunity.companyId required
-- 2. Add foreign key constraint
-- 3. Drop old fields from JobOpportunity (companyName, companySearchName, etc.)
-- 4. Drop Person.jobOpportunityId and Person.company fields
-- 5. Drop old indexes
