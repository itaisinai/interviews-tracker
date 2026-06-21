-- Deduplicate existing Person records before adding unique constraint
-- Keep the most recent person (by createdAt) for each (name, jobOpportunityId) pair
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name, "jobOpportunityId"
      ORDER BY "createdAt" DESC
    ) as rn
  FROM "Person"
  WHERE "jobOpportunityId" IS NOT NULL
)
DELETE FROM "Person"
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint for name + jobOpportunityId to prevent duplicate contacts per opportunity
CREATE UNIQUE INDEX "Person_name_jobOpportunityId_key" ON "Person"("name", "jobOpportunityId");
