-- AlterTable: Add totalRaised and latestRound to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "totalRaised" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "latestRound" TEXT;
