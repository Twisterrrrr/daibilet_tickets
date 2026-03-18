-- CreateTable
CREATE TABLE "review_dispute_messages" (
    "id" UUID NOT NULL,
    "disputeId" UUID NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAtUser" TIMESTAMP(3),
    "readAtMod" TIMESTAMP(3),

    CONSTRAINT "review_dispute_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_dispute_messages_disputeId_createdAt_idx" ON "review_dispute_messages"("disputeId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "review_dispute_messages" ADD CONSTRAINT "review_dispute_messages_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "review_disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
