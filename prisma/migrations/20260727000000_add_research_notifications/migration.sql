CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_ownerEmail_readAt_idx" ON "Notification"("ownerEmail", "readAt");
CREATE INDEX "Notification_ownerEmail_createdAt_idx" ON "Notification"("ownerEmail", "createdAt");
