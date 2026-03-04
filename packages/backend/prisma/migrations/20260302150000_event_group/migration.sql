-- CreateTable
CREATE TABLE "event_groups" (
    "id" UUID NOT NULL,
    "groupingKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_groups_groupingKey_key" ON "event_groups"("groupingKey");

-- CreateIndex
CREATE UNIQUE INDEX "event_groups_slug_key" ON "event_groups"("slug");

-- CreateIndex
CREATE INDEX "event_groups_slug_idx" ON "event_groups"("slug");
