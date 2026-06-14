ALTER TABLE "GmailMessageState"
ADD COLUMN "jobOpportunityId" TEXT;

CREATE INDEX "GmailMessageState_jobOpportunityId_idx" ON "GmailMessageState"("jobOpportunityId");
