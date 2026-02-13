-- Для всех событий с подкатегорией STANDUP: оставить только STANDUP, убрать CONCERT, SHOW, SPORT
UPDATE events
SET subcategories = ARRAY['STANDUP']::"EventSubcategory"[]
WHERE 'STANDUP' = ANY(subcategories)
  AND (
    'CONCERT' = ANY(subcategories)
    OR 'SHOW' = ANY(subcategories)
    OR 'SPORT' = ANY(subcategories)
  );
