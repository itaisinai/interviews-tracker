-- AddPersonSlug
-- Add slug and ownerEmail fields to Person table for slug-first architecture

-- Step 1: Add ownerEmail column (nullable initially for existing rows)
ALTER TABLE "Person" ADD COLUMN "ownerEmail" TEXT;

-- Step 2: Add slug column (nullable initially for existing rows)
ALTER TABLE "Person" ADD COLUMN "slug" TEXT;

-- Step 3: Backfill ownerEmail from linked JobOpportunity
UPDATE "Person"
SET "ownerEmail" = "JobOpportunity"."ownerEmail"
FROM "JobOpportunity"
WHERE "Person"."jobOpportunityId" = "JobOpportunity"."id"
  AND "Person"."ownerEmail" IS NULL;

-- Step 4: For orphaned Person records (no jobOpportunityId), we cannot determine owner
-- These will need to be handled manually or deleted
-- For now, mark them with a placeholder (admin should review)
UPDATE "Person"
SET "ownerEmail" = 'orphaned@interviews-tracker.local'
WHERE "ownerEmail" IS NULL;

-- Step 5: Generate slugs for existing Person records
-- Format: {first-name}-{last-name}-{counter}
-- This is a simplified version; production might need more sophisticated logic
WITH numbered_people AS (
  SELECT
    id,
    name,
    "ownerEmail",
    ROW_NUMBER() OVER (
      PARTITION BY "ownerEmail", LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
      ORDER BY "createdAt"
    ) as row_num
  FROM "Person"
)
UPDATE "Person"
SET slug = LOWER(
  REGEXP_REPLACE(numbered_people.name, '[^a-zA-Z0-9]+', '-', 'g') ||
  CASE WHEN numbered_people.row_num > 1 THEN '-' || numbered_people.row_num::text ELSE '' END
)
FROM numbered_people
WHERE "Person".id = numbered_people.id;

-- Step 6: Make ownerEmail and slug NOT NULL now that they're populated
ALTER TABLE "Person" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Person" ALTER COLUMN "slug" SET NOT NULL;

-- Step 7: Add unique constraint for (ownerEmail, slug)
CREATE UNIQUE INDEX "Person_ownerEmail_slug_key" ON "Person"("ownerEmail", "slug");

-- Step 8: Drop old indexes that might conflict (if any exist)
-- (None to drop in this case)
