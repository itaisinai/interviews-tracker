ALTER TABLE "JobOpportunity"
ADD COLUMN "slug" TEXT;

DO $$
DECLARE
  opportunity_record RECORD;
  candidate_slug TEXT;
  suffix_index INTEGER;
BEGIN
  CREATE TEMP TABLE "TemporaryOpportunitySlugs" (
    "slug" TEXT PRIMARY KEY
  ) ON COMMIT DROP;

  FOR opportunity_record IN
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
    ORDER BY "createdAt", "id"
  LOOP
    candidate_slug := opportunity_record.base_slug;
    suffix_index := 2;

    WHILE EXISTS (
      SELECT 1
      FROM "TemporaryOpportunitySlugs"
      WHERE "slug" = candidate_slug
    ) LOOP
      candidate_slug := opportunity_record.base_slug || '-' || suffix_index::text;
      suffix_index := suffix_index + 1;
    END LOOP;

    INSERT INTO "TemporaryOpportunitySlugs" ("slug") VALUES (candidate_slug);

    UPDATE "JobOpportunity"
    SET "slug" = candidate_slug
    WHERE "id" = opportunity_record."id";
  END LOOP;
END $$;

ALTER TABLE "JobOpportunity"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "JobOpportunity_slug_key" ON "JobOpportunity"("slug");
