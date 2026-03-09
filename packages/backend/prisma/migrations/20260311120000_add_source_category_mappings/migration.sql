-- CreateTable
CREATE TABLE "source_category_mappings" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "externalCategoryNorm" TEXT NOT NULL,
    "internalCategory" "EventCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_category_unknowns" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "externalCategoryRaw" TEXT NOT NULL,
    "externalCategoryNorm" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hits" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "source_category_unknowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_category_mappings_source_idx" ON "source_category_mappings"("source");

-- CreateIndex
CREATE UNIQUE INDEX "source_category_mappings_source_externalCategoryNorm_key" ON "source_category_mappings"("source", "externalCategoryNorm");

-- CreateIndex
CREATE INDEX "source_category_unknowns_source_idx" ON "source_category_unknowns"("source");

-- CreateIndex
CREATE UNIQUE INDEX "source_category_unknowns_source_externalCategoryNorm_key" ON "source_category_unknowns"("source", "externalCategoryNorm");
