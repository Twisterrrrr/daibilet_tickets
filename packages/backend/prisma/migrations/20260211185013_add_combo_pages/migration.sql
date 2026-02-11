-- CreateTable
CREATE TABLE "combo_pages" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "heroImage" TEXT,
    "intensity" "Intensity" NOT NULL DEFAULT 'NORMAL',
    "dayCount" INTEGER NOT NULL,
    "curatedEvents" JSONB NOT NULL,
    "suggestedPrice" INTEGER,
    "features" JSONB,
    "includes" JSONB,
    "faq" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "combo_pages_slug_key" ON "combo_pages"("slug");

-- CreateIndex
CREATE INDEX "combo_pages_cityId_idx" ON "combo_pages"("cityId");

-- AddForeignKey
ALTER TABLE "combo_pages" ADD CONSTRAINT "combo_pages_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
