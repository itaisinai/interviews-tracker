-- CreateTable
CREATE TABLE "SavedJobSearch" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT,
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedJobSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedJobSearch_ownerEmail_idx" ON "SavedJobSearch"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJobSearch_ownerEmail_name_key" ON "SavedJobSearch"("ownerEmail", "name");
