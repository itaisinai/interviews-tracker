-- Add ownerEmail column to all core tables (nullable first for data backfill)
ALTER TABLE "JobOpportunity" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Interaction" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Note" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Task" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Compensation" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "JobOpportunityDomain" ADD COLUMN "ownerEmail" TEXT;

-- Backfill existing data with the production user's email
-- This reads from the ALLOWED_EMAIL environment variable that must be set
UPDATE "JobOpportunity" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;
UPDATE "Interaction" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;
UPDATE "Note" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;
UPDATE "Task" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;
UPDATE "Compensation" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;
UPDATE "JobOpportunityDomain" SET "ownerEmail" = current_setting('app.allowed_email', false) WHERE "ownerEmail" IS NULL;

-- Make ownerEmail NOT NULL now that data is backfilled
ALTER TABLE "JobOpportunity" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Interaction" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Note" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Compensation" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "JobOpportunityDomain" ALTER COLUMN "ownerEmail" SET NOT NULL;

-- Drop old unique constraints on JobOpportunity
DROP INDEX IF EXISTS "JobOpportunity_slug_key";
DROP INDEX IF EXISTS "JobOpportunity_companyName_roleTitle_key";

-- Create new compound unique constraints with ownerEmail
CREATE UNIQUE INDEX "JobOpportunity_ownerEmail_slug_key" ON "JobOpportunity"("ownerEmail", "slug");
CREATE UNIQUE INDEX "JobOpportunity_ownerEmail_companyName_roleTitle_key" ON "JobOpportunity"("ownerEmail", "companyName", "roleTitle");

-- Add indexes for performance (ownerEmail will be in almost every WHERE clause)
CREATE INDEX "JobOpportunity_ownerEmail_idx" ON "JobOpportunity"("ownerEmail");
CREATE INDEX "Interaction_ownerEmail_idx" ON "Interaction"("ownerEmail");
CREATE INDEX "Note_ownerEmail_idx" ON "Note"("ownerEmail");
CREATE INDEX "Task_ownerEmail_idx" ON "Task"("ownerEmail");
CREATE INDEX "Compensation_ownerEmail_idx" ON "Compensation"("ownerEmail");
CREATE INDEX "JobOpportunityDomain_ownerEmail_idx" ON "JobOpportunityDomain"("ownerEmail");

-- Add composite indexes for common query patterns
CREATE INDEX "JobOpportunity_ownerEmail_pipelineType_idx" ON "JobOpportunity"("ownerEmail", "pipelineType");
CREATE INDEX "JobOpportunity_ownerEmail_status_idx" ON "JobOpportunity"("ownerEmail", "status");
CREATE INDEX "Interaction_ownerEmail_date_idx" ON "Interaction"("ownerEmail", "date");
CREATE INDEX "Task_ownerEmail_status_idx" ON "Task"("ownerEmail", "status");
