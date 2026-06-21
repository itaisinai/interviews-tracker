-- CreateTable
CREATE TABLE "InteractionFeedback" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "extractedData" JSONB,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteractionFeedback_interactionId_idx" ON "InteractionFeedback"("interactionId");

-- AddForeignKey
ALTER TABLE "InteractionFeedback" ADD CONSTRAINT "InteractionFeedback_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
