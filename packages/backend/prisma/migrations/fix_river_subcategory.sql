-- Убрать RIVER из подкатегорий событий, которые НЕ являются водными.
-- Водные события определяем по наличию хотя бы одного ключевого слова в НАЗВАНИИ.
-- Это безопаснее, чем проверять полное описание (где "мост" мог появиться в контексте).

-- Шаг 1: Убираем RIVER у событий, чьё название НЕ содержит водных ключей
UPDATE events
SET subcategories = array_remove(subcategories, 'RIVER'::"EventSubcategory")
WHERE 'RIVER' = ANY(subcategories)
  AND lower(title) NOT SIMILAR TO '%(теплоход|речн|катер|яхт|водн|по неве|по реке|по каналам|корабл|boat|прогулка по|на воде|canal)%';

-- Шаг 2: Убираем тег nochnye-mosty у событий, которые после шага 1 больше не RIVER
DELETE FROM "event_tags"
WHERE "tagId" = (SELECT id FROM "tags" WHERE slug = 'nochnye-mosty' LIMIT 1)
  AND "eventId" NOT IN (
    SELECT id FROM events WHERE 'RIVER' = ANY(subcategories)
  );

-- Шаг 3: Аналогично убираем тег bridges у нерелевантных событий
DELETE FROM "event_tags"
WHERE "tagId" = (SELECT id FROM "tags" WHERE slug = 'bridges' LIMIT 1)
  AND "eventId" NOT IN (
    SELECT id FROM events
    WHERE 'RIVER' = ANY(subcategories)
      OR lower(title) SIMILAR TO '%(развод|мост|bridge)%'
  );
