-- Удалить тег nochnye-mosty у событий, которые НЕ являются речными (RIVER)
-- Оставить тег только у событий с подкатегорией RIVER
DELETE FROM "event_tags"
WHERE "tagId" = (SELECT id FROM "tags" WHERE slug = 'nochnye-mosty' LIMIT 1)
  AND "eventId" NOT IN (
    SELECT id FROM "events"
    WHERE 'RIVER' = ANY(subcategories)
  );
