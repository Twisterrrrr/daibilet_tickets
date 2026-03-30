-- Разрешаем одинаковый slug лендинга в разных городах (например rechnye-progulki).
-- Каноническая уникальность: (cityId, slug).
-- В старых БД мог остаться глобальный UNIQUE(slug) как constraint и/или индекс.

-- 1. Удаляем старый constraint, если он существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'landing_pages_slug_key'
  ) THEN
    ALTER TABLE "landing_pages" DROP CONSTRAINT "landing_pages_slug_key";
  END IF;
END $$;

-- 2. Удаляем одноимённый UNIQUE INDEX по slug, если он остался как индекс
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'landing_pages_slug_key'
  ) THEN
    DROP INDEX "landing_pages_slug_key";
  END IF;
END $$;

-- 3. Гарантируем наличие составного UNIQUE(cityId, slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'landing_pages_cityId_slug_key'
  ) THEN
    CREATE UNIQUE INDEX "landing_pages_cityId_slug_key" ON "landing_pages"("cityId", "slug");
  END IF;
END $$;
