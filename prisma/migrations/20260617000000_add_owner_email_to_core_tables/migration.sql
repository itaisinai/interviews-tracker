-- Add ownerEmail column to all core tables with default value
-- Using your email: itai.sinai@gmail.com
ALTER TABLE "JobOpportunity" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;
ALTER TABLE "Interaction" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;
ALTER TABLE "Note" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;
ALTER TABLE "Task" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;
ALTER TABLE "Compensation" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;
ALTER TABLE "JobOpportunityDomain" ADD COLUMN "ownerEmail" TEXT DEFAULT 'itai.sinai@gmail.com' NOT NULL;

-- Remove the default after backfilling (new rows should set ownerEmail explicitly)
ALTER TABLE "JobOpportunity" ALTER COLUMN "ownerEmail" DROP DEFAULT;
ALTER TABLE "Interaction" ALTER COLUMN "ownerEmail" DROP DEFAULT;
ALTER TABLE "Note" ALTER COLUMN "ownerEmail" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "ownerEmail" DROP DEFAULT;
ALTER TABLE "Compensation" ALTER COLUMN "ownerEmail" DROP DEFAULT;
ALTER TABLE "JobOpportunityDomain" ALTER COLUMN "ownerEmail" DROP DEFAULT;

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
