-- Разрешаем одинаковый slug лендинга в разных городах (например rechnye-progulki).
-- Составной уникальный ключ (cityId, slug) уже есть.

ALTER TABLE "landing_pages" DROP CONSTRAINT IF EXISTS "landing_pages_slug_key";
