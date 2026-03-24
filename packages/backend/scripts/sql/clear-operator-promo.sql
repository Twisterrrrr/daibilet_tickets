-- Разовая очистка устаревших промо-полей оператора (фиксированная commissionRate в админке).
-- Выполнить в maintenance, например: psql "$DATABASE_URL" -f packages/backend/scripts/sql/clear-operator-promo.sql

UPDATE "operators"
SET "promoRate" = NULL,
    "promoUntil" = NULL
WHERE "promoRate" IS NOT NULL
   OR "promoUntil" IS NOT NULL;
