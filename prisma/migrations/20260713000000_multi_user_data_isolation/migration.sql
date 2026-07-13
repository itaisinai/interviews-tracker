-- Multi-user data isolation fixes
-- 1. Update Person unique constraints to be scoped per user
-- 2. Add ownerEmail to WrongPersonCandidate for proper isolation

-- Drop existing global unique constraints on Person
DROP INDEX IF EXISTS "Person_email_key";
DROP INDEX IF EXISTS "Person_linkedinUrl_key";

-- Add user-scoped unique constraints on Person
CREATE UNIQUE INDEX "Person_ownerEmail_email_key" ON "Person"("ownerEmail", "email");
CREATE UNIQUE INDEX "Person_ownerEmail_linkedinUrl_key" ON "Person"("ownerEmail", "linkedinUrl");

-- Add ownerEmail to WrongPersonCandidate
ALTER TABLE "WrongPersonCandidate" ADD COLUMN "ownerEmail" TEXT;

-- Update existing WrongPersonCandidate records with ownerEmail from their opportunity
-- This assumes all existing wrong candidates belong to the first user in the system
UPDATE "WrongPersonCandidate"
SET "ownerEmail" = (
  SELECT "ownerEmail"
  FROM "JobOpportunity"
  WHERE "JobOpportunity"."id" = "WrongPersonCandidate"."opportunityId"
  LIMIT 1
);

-- Make ownerEmail required
ALTER TABLE "WrongPersonCandidate" ALTER COLUMN "ownerEmail" SET NOT NULL;

-- Add index for ownerEmail on WrongPersonCandidate
CREATE INDEX "WrongPersonCandidate_ownerEmail_idx" ON "WrongPersonCandidate"("ownerEmail");
