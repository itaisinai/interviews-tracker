ALTER TABLE "JobOpportunity"
ADD COLUMN "slug" TEXT;

WITH base_slugs AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(trim("companyName" || ' ' || "roleTitle")),
              '[^[:alnum:]]+', '-', 'g'
            ),
            '-+', '-', 'g'
          ),
          '(^-+|-+$)', '', 'g'
        ),
        ''
      ),
      'opportunity'
    ) AS base_slug
  FROM "JobOpportunity"
), numbered_slugs AS (
  SELECT
    "id",
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY "createdAt", "id") AS slug_index
  FROM base_slugs
)
UPDATE "JobOpportunity" AS opportunity
SET "slug" = CASE
  WHEN numbered_slugs.slug_index = 1 THEN numbered_slugs.base_slug
  ELSE numbered_slugs.base_slug || '-' || numbered_slugs.slug_index::text
END
FROM numbered_slugs
WHERE opportunity."id" = numbered_slugs."id";

ALTER TABLE "JobOpportunity"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "JobOpportunity_slug_key" ON "JobOpportunity"("slug");
