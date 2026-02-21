-- CreateTable: query_filters — справочник быстрых фильтров для каталога
CREATE TABLE IF NOT EXISTS "query_filters" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isSeo" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "query_filters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "query_filters_slug_type_key" ON "query_filters"("slug", "type");
CREATE INDEX IF NOT EXISTS "query_filters_type_idx" ON "query_filters"("type");
CREATE INDEX IF NOT EXISTS "query_filters_type_group_idx" ON "query_filters"("type", "group");
