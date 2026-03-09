-- Удаление дублей TEPLOHOD с tcEventId вида "tep-N" (оставляем нормализованные "N").
-- Миграция 20260305120000 нормализовала tcEventId, но старые записи "tep-N" могли остаться.
-- Удаляем только события без заказов (package_items).

-- 1. Сессии (каскадно удалит event_session_stats)
DELETE FROM "event_sessions"
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 2. Офферы
DELETE FROM "event_offers"
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 3. Event override
DELETE FROM "event_overrides"
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 4. Event tags
DELETE FROM "event_tags"
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 5. Article events
DELETE FROM "article_events"
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 6. Reviews, external_reviews, review_requests — SET NULL
UPDATE "reviews" SET "eventId" = NULL
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);
UPDATE "external_reviews" SET "eventId" = NULL
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);
UPDATE "review_requests" SET "eventId" = NULL
WHERE "eventId" IN (
  SELECT id FROM "events"
  WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id)
);

-- 7. canonicalOfId — обнуляем, если дубли указывают на tep-N
UPDATE "events" SET "canonicalOfId" = NULL
WHERE "canonicalOfId" IN (SELECT id FROM "events" e2 WHERE e2.source = 'TEPLOHOD' AND e2."tcEventId" LIKE 'tep-%');

-- 8. Удаляем сами события
DELETE FROM "events"
WHERE source = 'TEPLOHOD' AND "tcEventId" LIKE 'tep-%'
  AND NOT EXISTS (SELECT 1 FROM package_items pi WHERE pi."eventId" = "events".id);
