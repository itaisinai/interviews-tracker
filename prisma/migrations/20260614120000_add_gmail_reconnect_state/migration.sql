ALTER TABLE "GmailConnection"
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "needsReconnect" BOOLEAN NOT NULL DEFAULT false;
