-- CreateTable: regions
CREATE TABLE IF NOT EXISTS "regions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "hubCityId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: region_cities (many-to-many)
CREATE TABLE IF NOT EXISTS "region_cities" (
    "regionId" UUID NOT NULL,
    "cityId" UUID NOT NULL,

    CONSTRAINT "region_cities_pkey" PRIMARY KEY ("regionId","cityId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "regions_slug_key" ON "regions"("slug");

-- AddForeignKey: regions -> cities
ALTER TABLE "regions" ADD CONSTRAINT "regions_hubCityId_fkey"
    FOREIGN KEY ("hubCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: region_cities -> regions
ALTER TABLE "region_cities" ADD CONSTRAINT "region_cities_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: region_cities -> cities
ALTER TABLE "region_cities" ADD CONSTRAINT "region_cities_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
