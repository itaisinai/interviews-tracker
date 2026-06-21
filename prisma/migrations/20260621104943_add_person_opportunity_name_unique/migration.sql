-- Add unique constraint for name + jobOpportunityId to prevent duplicate contacts per opportunity
CREATE UNIQUE INDEX "Person_name_jobOpportunityId_key" ON "Person"("name", "jobOpportunityId");
