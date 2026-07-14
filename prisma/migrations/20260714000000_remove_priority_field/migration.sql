-- DropIndex
DROP INDEX IF EXISTS "JobOpportunity_priority_idx";

-- AlterTable: Remove priority column from JobOpportunity
ALTER TABLE "JobOpportunity" DROP COLUMN IF EXISTS "priority";

-- AlterTable: Remove priority column from Task
ALTER TABLE "Task" DROP COLUMN IF EXISTS "priority";

-- DropEnum: Remove Priority enum
DROP TYPE IF EXISTS "Priority";
