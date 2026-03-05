-- Seed regions and attach member cities so that regional cities
-- are grouped under hub cities on the /cities page.

BEGIN;

-- 1) Московская область — хаб: Москва
WITH hub AS (
  SELECT id
  FROM cities
  WHERE slug = 'moscow'
)
INSERT INTO regions ("id", "slug", "name", "description", "heroImage", "hubCityId", "isActive", "createdAt", "updatedAt")
SELECT
  '00000000-0000-0000-0000-000000000101',
  'moskovskaya-oblast',
  'Московская область',
  NULL,
  NULL,
  hub.id,
  TRUE,
  NOW(),
  NOW()
FROM hub
ON CONFLICT ("slug") DO UPDATE
SET
  "hubCityId" = EXCLUDED."hubCityId",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Привяжем подмосковные города как члены региона (скрываются в общем списке)
INSERT INTO region_cities ("regionId", "cityId")
SELECT r.id, c.id
FROM regions r
JOIN cities c ON c.slug IN ('ramenskoe')
WHERE r.slug = 'moskovskaya-oblast'
ON CONFLICT ("regionId", "cityId") DO NOTHING;

-- 2) Татарстан — хаб: Казань
WITH hub AS (
  SELECT id
  FROM cities
  WHERE slug = 'kazan'
)
INSERT INTO regions ("id", "slug", "name", "description", "heroImage", "hubCityId", "isActive", "createdAt", "updatedAt")
SELECT
  '00000000-0000-0000-0000-000000000102',
  'tatarstan',
  'Татарстан',
  NULL,
  NULL,
  hub.id,
  TRUE,
  NOW(),
  NOW()
FROM hub
ON CONFLICT ("slug") DO UPDATE
SET
  "hubCityId" = EXCLUDED."hubCityId",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();

-- Привяжем города Татарстана под хаб Казань
INSERT INTO region_cities ("regionId", "cityId")
SELECT r.id, c.id
FROM regions r
JOIN cities c ON c.slug IN ('naberezhnye-chelny')
WHERE r.slug = 'tatarstan'
ON CONFLICT ("regionId", "cityId") DO NOTHING;

COMMIT;

