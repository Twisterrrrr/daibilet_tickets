-- Установить additionalFilters для лендинга "nochnye-mosty": только речные экскурсии (теплоходы)
UPDATE landing_pages
SET "additionalFilters" = '{"subcategories": ["RIVER"]}'
WHERE slug = 'nochnye-mosty';
