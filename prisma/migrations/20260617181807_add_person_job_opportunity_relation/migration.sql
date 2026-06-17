-- AlterTable
ALTER TABLE "Person" ADD COLUMN "jobOpportunityId" TEXT;

-- CreateIndex
CREATE INDEX "Person_jobOpportunityId_idx" ON "Person"("jobOpportunityId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
