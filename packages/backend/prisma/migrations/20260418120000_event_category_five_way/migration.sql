-- Пять направлений каталога: ACTIVITY и ENTERTAINMENT в дополнение к EXCURSION / MUSEUM / EVENT.

ALTER TYPE "EventCategory" ADD VALUE 'ACTIVITY';
ALTER TYPE "EventCategory" ADD VALUE 'ENTERTAINMENT';

-- Backfill: по PRIMARY-подкатегориям (код в subcategories).

UPDATE "events" e
SET category = 'ENTERTAINMENT'::"EventCategory"
WHERE e.category IN ('EVENT'::"EventCategory", 'EXCURSION'::"EventCategory")
  AND EXISTS (
    SELECT 1
    FROM "event_subcategory_links" esl
    JOIN "subcategories" s ON s.id = esl."subcategoryId"
    WHERE esl."eventId" = e.id
      AND s.code IN (
        'QUESTS',
        'ROOFTOP',
        'INTERACTIVE_ENT',
        'KIDS_ACTIVITIES',
        'GAME_ZONES',
        'ATTRACTIONS',
        'ESCAPE_ROOMS'
      )
  );

UPDATE "events" e
SET category = 'ACTIVITY'::"EventCategory"
WHERE e.category IN ('EVENT'::"EventCategory", 'EXCURSION'::"EventCategory")
  AND EXISTS (
    SELECT 1
    FROM "event_subcategory_links" esl
    JOIN "subcategories" s ON s.id = esl."subcategoryId"
    WHERE esl."eventId" = e.id
      AND s.code IN (
        'WATER_SPORTS',
        'CYCLING',
        'OUTDOOR_ACTIVITIES',
        'KARTING',
        'CLIMBING',
        'EXTREME',
        'SPORT_EVENTS'
      )
  );
