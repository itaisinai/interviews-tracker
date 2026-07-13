-- This migration runs AFTER the data migration script
-- It enforces the new schema constraints and removes deprecated fields

-- Make JobOpportunity.companyId required
ALTER TABLE "JobOpportunity" ALTER COLUMN "companyId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key constraints for Note, Task, Person
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Person" ADD CONSTRAINT "Person_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint on JobOpportunity (if exists)
ALTER TABLE "JobOpportunity" DROP CONSTRAINT IF EXISTS "JobOpportunity_ownerEmail_companyName_roleTitle_key";

-- Add new unique constraint
CREATE UNIQUE INDEX "JobOpportunity_ownerEmail_companyId_roleTitle_key" ON "JobOpportunity"("ownerEmail", "companyId", "roleTitle");

-- Drop company-related fields from JobOpportunity (moved to Company)
ALTER TABLE "JobOpportunity" DROP COLUMN "companyName";
ALTER TABLE "JobOpportunity" DROP COLUMN "companySearchName";
ALTER TABLE "JobOpportunity" DROP COLUMN "employeesRangeId";
ALTER TABLE "JobOpportunity" DROP COLUMN "companyStageId";
ALTER TABLE "JobOpportunity" DROP COLUMN "location";
ALTER TABLE "JobOpportunity" DROP COLUMN "funding";
ALTER TABLE "JobOpportunity" DROP COLUMN "companyDescription";
ALTER TABLE "JobOpportunity" DROP COLUMN "productDescription";
ALTER TABLE "JobOpportunity" DROP COLUMN "customersTraction";
ALTER TABLE "JobOpportunity" DROP COLUMN "techStack";
ALTER TABLE "JobOpportunity" DROP COLUMN "backendFrontendSplit";

-- Drop Person fields that moved to Company relation
ALTER TABLE "Person" DROP COLUMN "jobOpportunityId";
ALTER TABLE "Person" DROP COLUMN "company";

-- Drop old Person indexes
DROP INDEX IF EXISTS "Person_name_company_idx";
DROP INDEX IF EXISTS "Person_jobOpportunityId_idx";
DROP INDEX IF EXISTS "Person_name_jobOpportunityId_idx";

-- Update CompanySizeOption and CompanyStageOption
-- Remove the relation to JobOpportunity (no longer needed since these now only relate to Company)
-- No action needed - these relations are already removed in the new schema
