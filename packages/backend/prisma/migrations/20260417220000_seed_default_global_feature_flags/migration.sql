-- Глобальные feature flags по умолчанию (пустой список ломал Admin V3 → Настройки).
-- Идемпотентно: не дублируем при повторном прогоне.

INSERT INTO feature_flags (id, key, scope, "scopeValue", enabled, description, "createdAt", "updatedAt")
SELECT gen_random_uuid(),
       'disable_external_offers',
       'global',
       NULL,
       false,
       'Global: постепенно отключать EXTERNAL офферы. Переопределения: scope=city/category — см. FeatureFlagService.',
       NOW(),
       NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM feature_flags
  WHERE key = 'disable_external_offers'
    AND scope = 'global'
    AND "scopeValue" IS NULL
);
