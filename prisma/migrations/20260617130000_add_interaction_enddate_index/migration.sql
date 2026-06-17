-- CreateIndex
CREATE INDEX "Interaction_ownerEmail_status_endDate_idx" ON "Interaction"("ownerEmail", "status", "endDate");
