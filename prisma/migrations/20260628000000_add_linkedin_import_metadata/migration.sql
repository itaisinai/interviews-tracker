ALTER TABLE "JobOpportunity" ADD COLUMN "linkedinJobId" TEXT;
ALTER TABLE "JobOpportunity" ADD COLUMN "sourceUrl" TEXT;

CREATE INDEX "JobOpportunity_ownerEmail_source_linkedinJobId_idx" ON "JobOpportunity"("ownerEmail", "source", "linkedinJobId");
CREATE INDEX "JobOpportunity_ownerEmail_source_sourceUrl_idx" ON "JobOpportunity"("ownerEmail", "source", "sourceUrl");
