-- Аудит каталога (PostgreSQL). Запуск из packages/backend: psql "$DATABASE_URL" -f scripts/catalogAudit.sql
-- Примечание: events.category в БД NOT NULL (enum). «Без категории» в продуктовом смысле = запрос (1) ниже.

-- 0) Гипотетически NULL category (в текущей схеме всегда 0)
SELECT COUNT(*) AS would_be_null_category FROM events WHERE category IS NULL;

-- 1) События без эффективной таксономии (нет связей subcategory и пустой legacy enum)
SELECT COUNT(*) AS missing_taxonomy
FROM events e
WHERE e."isActive" = true
  AND e."isDeleted" = false
  AND e."canonicalOfId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM event_subcategory_links esl WHERE esl."eventId" = e.id)
  AND COALESCE(array_length(e.subcategories, 1), 0) = 0;

-- 2) События без venue/локации (как в admin consistency «weak location»)
SELECT COUNT(*) AS missing_location
FROM events e
WHERE e."isActive" = true
  AND e."isDeleted" = false
  AND e."canonicalOfId" IS NULL
  AND e."venueId" IS NULL
  AND e."startLocationId" IS NULL
  AND (e.address IS NULL OR e.address = '')
  AND (e."meetingPoint" IS NULL OR TRIM(e."meetingPoint") = '')
  AND e.lat IS NULL
  AND e.lng IS NULL;

-- 3) Без офферов
SELECT COUNT(*) AS missing_offers
FROM events e
WHERE e."isActive" = true
  AND e."isDeleted" = false
  AND e."canonicalOfId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM event_offers o WHERE o."eventId" = e.id);

-- 4) SCHEDULED без будущих сеансов
SELECT COUNT(*) AS missing_sessions_scheduled
FROM events e
WHERE e."isActive" = true
  AND e."isDeleted" = false
  AND e."canonicalOfId" IS NULL
  AND e."dateMode" = 'SCHEDULED'
  AND NOT EXISTS (
    SELECT 1 FROM event_sessions s
    WHERE s."eventId" = e.id AND s."isActive" = true AND s."startsAt" > NOW()
  );

-- 5) Покрытие по городам (полные карточки: таксономия + локация + оффер + доступность по dateMode)
SELECT
  c.slug AS city_slug,
  c.name AS city_name,
  COUNT(e.id) AS total_events,
  ROUND(
    100.0 * SUM(
      CASE
        WHEN (
          EXISTS (SELECT 1 FROM event_subcategory_links esl WHERE esl."eventId" = e.id)
          OR COALESCE(array_length(e.subcategories, 1), 0) > 0
        )
        AND (
          e."venueId" IS NOT NULL
          OR e."startLocationId" IS NOT NULL
          OR (e.address IS NOT NULL AND TRIM(e.address) <> '')
          OR (e."meetingPoint" IS NOT NULL AND TRIM(e."meetingPoint") <> '')
          OR (e.lat IS NOT NULL AND e.lng IS NOT NULL)
        )
        AND EXISTS (SELECT 1 FROM event_offers o WHERE o."eventId" = e.id AND o."isDeleted" = false)
        AND (
          (e."dateMode" = 'OPEN_DATE' AND (e."endDate" IS NULL OR e."endDate" >= NOW()))
          OR (
            e."dateMode" = 'SCHEDULED'
            AND EXISTS (
              SELECT 1 FROM event_sessions s
              WHERE s."eventId" = e.id AND s."isActive" = true AND s."startsAt" > NOW()
            )
          )
        )
        THEN 1 ELSE 0
      END
    )::numeric / NULLIF(COUNT(e.id), 0),
    2
  ) AS coverage_percent
FROM cities c
JOIN events e ON e."cityId" = c.id
WHERE e."isActive" = true
  AND e."isDeleted" = false
  AND e."canonicalOfId" IS NULL
GROUP BY c.id, c.slug, c.name
ORDER BY c.name;
