ALTER TABLE "Interaction" ADD COLUMN "slug" TEXT;

CREATE TEMPORARY TABLE "TemporaryInteractionSlugs" (
  "slug" TEXT PRIMARY KEY
) ON COMMIT DROP;

DO $$
DECLARE
  interaction_record RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix_index INTEGER;
BEGIN
  FOR interaction_record IN
    SELECT i."id", i."ownerEmail", i."type", i."stage", j."companyName"
    FROM "Interaction" i
    JOIN "JobOpportunity" j ON j."id" = i."jobOpportunityId"
    ORDER BY i."createdAt", i."id"
  LOOP
    base_slug := lower(regexp_replace(trim(coalesce(interaction_record."companyName", '') || ' ' || coalesce(interaction_record."type", '') || ' ' || coalesce(interaction_record."stage", '')), '[^[:alnum:]]+', '-', 'g'));
    base_slug := regexp_replace(regexp_replace(base_slug, '-{2,}', '-', 'g'), '(^-|-$)', '', 'g');
    IF base_slug = '' THEN
      base_slug := 'interaction';
    END IF;

    candidate_slug := base_slug;
    suffix_index := 1;

    WHILE EXISTS (
      SELECT 1 FROM "Interaction"
      WHERE "ownerEmail" = interaction_record."ownerEmail"
        AND "slug" = candidate_slug
        AND "id" <> interaction_record."id"
    ) OR EXISTS (
      SELECT 1 FROM "TemporaryInteractionSlugs"
      WHERE "slug" = interaction_record."ownerEmail" || ':' || candidate_slug
    ) LOOP
      suffix_index := suffix_index + 1;
      candidate_slug := base_slug || '-' || suffix_index::text;
    END LOOP;

    INSERT INTO "TemporaryInteractionSlugs" ("slug") VALUES (interaction_record."ownerEmail" || ':' || candidate_slug);
    UPDATE "Interaction" SET "slug" = candidate_slug WHERE "id" = interaction_record."id";
  END LOOP;
END $$;

ALTER TABLE "Interaction" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Interaction_ownerEmail_slug_key" ON "Interaction"("ownerEmail", "slug");
