-- CreateTable
CREATE TABLE "InteractionEmail" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "subject" TEXT,
    "from" TEXT,
    "receivedDate" TIMESTAMP(3),
    "extractedData" JSONB,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteractionEmail_interactionId_idx" ON "InteractionEmail"("interactionId");

-- CreateIndex
CREATE INDEX "InteractionEmail_gmailMessageId_idx" ON "InteractionEmail"("gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "InteractionEmail_interactionId_gmailMessageId_key" ON "InteractionEmail"("interactionId", "gmailMessageId");

-- AddForeignKey
ALTER TABLE "InteractionEmail" ADD CONSTRAINT "InteractionEmail_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: copy gmailMessageId from Interaction to InteractionEmail
INSERT INTO "InteractionEmail" ("id", "interactionId", "gmailMessageId", "attachedAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "gmailMessageId",
    "createdAt"
FROM "Interaction"
WHERE "gmailMessageId" IS NOT NULL;
