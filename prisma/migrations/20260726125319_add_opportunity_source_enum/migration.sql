-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('GMAIL', 'TELEGRAM', 'LINKEDIN', 'MANUAL', 'API', 'CHATBOT', 'OTHER');

-- Convert existing string values to enum values
-- Update known values first
UPDATE "JobOpportunity"
SET source = CASE
  WHEN source ILIKE '%gmail%' THEN 'GMAIL'
  WHEN source ILIKE '%telegram%' THEN 'TELEGRAM'
  WHEN source ILIKE '%linkedin%' THEN 'LINKEDIN'
  WHEN source ILIKE '%ai%parsed%' OR source ILIKE '%manual%' THEN 'MANUAL'
  WHEN source = 'api' THEN 'API'
  WHEN source IS NOT NULL THEN 'OTHER'
  ELSE NULL
END;

-- AlterTable: Change column type to enum
ALTER TABLE "JobOpportunity"
  ALTER COLUMN "source" DROP DEFAULT,
  ALTER COLUMN "source" TYPE "OpportunitySource" USING (source::"OpportunitySource");
