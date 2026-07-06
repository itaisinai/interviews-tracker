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
-- Format: {normalized-name} or {normalized-name}-{counter}
-- Use full name for partitioning to handle "Alice" vs "Alice 2" correctly
WITH numbered_people AS (
  SELECT
    id,
    name,
    "ownerEmail",
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) as normalized_name,
    ROW_NUMBER() OVER (
      PARTITION BY "ownerEmail", name  -- Partition by original name, not normalized
      ORDER BY "createdAt"
    ) as row_num
  FROM "Person"
)
UPDATE "Person"
SET slug = numbered_people.normalized_name ||
  CASE WHEN numbered_people.row_num > 1 THEN '-' || numbered_people.row_num::text ELSE '' END
FROM numbered_people
WHERE "Person".id = numbered_people.id;

-- Step 5b: De-duplicate any slugs that collided after normalization
-- For example: "Alice" and "Alice 2" both normalize to "alice", then get suffixed
-- This ensures uniqueness by adding counters to duplicates within same owner
WITH slug_counts AS (
  SELECT
    "ownerEmail",
    slug,
    COUNT(*) as count
  FROM "Person"
  GROUP BY "ownerEmail", slug
  HAVING COUNT(*) > 1
),
ranked_duplicates AS (
  SELECT
    p.id,
    p."ownerEmail",
    p.slug,
    ROW_NUMBER() OVER (
      PARTITION BY p."ownerEmail", p.slug
      ORDER BY p."createdAt"
    ) as dup_num
  FROM "Person" p
  INNER JOIN slug_counts sc ON p."ownerEmail" = sc."ownerEmail" AND p.slug = sc.slug
)
UPDATE "Person"
SET slug = ranked_duplicates.slug || '-' || ranked_duplicates.dup_num::text
FROM ranked_duplicates
WHERE "Person".id = ranked_duplicates.id
  AND ranked_duplicates.dup_num > 1;

-- Step 6: Make ownerEmail and slug NOT NULL now that they're populated
ALTER TABLE "Person" ALTER COLUMN "ownerEmail" SET NOT NULL;
ALTER TABLE "Person" ALTER COLUMN "slug" SET NOT NULL;

-- Step 7: Add unique constraint for (ownerEmail, slug)
CREATE UNIQUE INDEX "Person_ownerEmail_slug_key" ON "Person"("ownerEmail", "slug");

-- Step 8: Drop old indexes that might conflict (if any exist)
-- (None to drop in this case)
