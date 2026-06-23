-- CreateTable
CREATE TABLE "WrongPersonCandidate" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "searchContext" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "company" TEXT,
    "title" TEXT,
    "avatarUrl" TEXT,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "WrongPersonCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WrongPersonCandidate_opportunityId_idx" ON "WrongPersonCandidate"("opportunityId");

-- CreateIndex
CREATE INDEX "WrongPersonCandidate_linkedinUrl_idx" ON "WrongPersonCandidate"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "WrongPersonCandidate_opportunityId_linkedinUrl_key" ON "WrongPersonCandidate"("opportunityId", "linkedinUrl");
