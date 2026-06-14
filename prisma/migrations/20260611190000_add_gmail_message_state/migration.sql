-- CreateEnum
CREATE TYPE "GmailMessageStateStatus" AS ENUM ('USED', 'HIDDEN');

-- CreateTable
CREATE TABLE "GmailMessageState" (
    "id" TEXT NOT NULL,
    "auth0Email" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "GmailMessageStateStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailMessageState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailMessageState_auth0Email_messageId_key" ON "GmailMessageState"("auth0Email", "messageId");

-- CreateIndex
CREATE INDEX "GmailMessageState_auth0Email_status_idx" ON "GmailMessageState"("auth0Email", "status");
