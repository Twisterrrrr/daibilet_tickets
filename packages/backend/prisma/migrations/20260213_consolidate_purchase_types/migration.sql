-- ==========================================
-- Перенесено из 20260213_add_ugc_system (новое enum-значение
-- должно быть committed до использования в SET DEFAULT)
-- ==========================================
ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'PENDING_EMAIL'::"ReviewStatus";

-- ==========================================
-- Консолидация PurchaseType: 4 → 3 типа
-- Идемпотентная миграция (можно перезапускать)
-- ==========================================

-- 0. Проверяем: если новый тип уже существует — пропускаем всё
DO $$
BEGIN
  -- Если значение 'WIDGET' уже есть в текущем PurchaseType, миграция уже выполнена
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '"PurchaseType"'::regtype AND enumlabel = 'WIDGET'
  ) THEN
    RAISE NOTICE 'PurchaseType migration already applied, skipping enum recreation';
    RETURN;
  END IF;

  -- 1. Снять default с purchaseType
  ALTER TABLE "event_offers" ALTER COLUMN "purchaseType" DROP DEFAULT;

  -- 2. Перевести во временный TEXT
  ALTER TABLE "event_offers" ALTER COLUMN "purchaseType" TYPE TEXT;

  -- 3. Обновить значения
  UPDATE "event_offers" SET "purchaseType" = 'WIDGET' WHERE "purchaseType" = 'TC_WIDGET';
  UPDATE "event_offers" SET "purchaseType" = 'REQUEST' WHERE "purchaseType" IN ('REQUEST_ONLY', 'API_CHECKOUT');

  -- 4. Удалить старый тип
  DROP TYPE "PurchaseType";

  -- 5. Создать новый тип
  CREATE TYPE "PurchaseType" AS ENUM ('WIDGET', 'REDIRECT', 'REQUEST');

  -- 6. Перевести колонку на новый enum
  ALTER TABLE "event_offers"
    ALTER COLUMN "purchaseType" TYPE "PurchaseType"
    USING "purchaseType"::"PurchaseType";

END $$;

-- ==========================================
-- Verify: ни одного старого значения (должен быть 0)
-- ==========================================
DO $$
BEGIN
  IF (SELECT count(*) FROM "event_offers"
      WHERE "purchaseType"::text NOT IN ('WIDGET', 'REDIRECT', 'REQUEST')) > 0
  THEN
    RAISE EXCEPTION 'MIGRATION FAILED: found offers with old PurchaseType values';
  END IF;
END $$;

-- ==========================================
-- WIDGET contract: новые поля для EventOffer
-- ==========================================
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "widgetProvider" TEXT;
ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "widgetPayload" JSONB;

-- Auto-fill для существующих WIDGET-офферов
UPDATE "event_offers"
SET
  "widgetProvider" = 'TC',
  "widgetPayload" = jsonb_build_object(
    'v', 1,
    'externalEventId', "externalEventId",
    'metaEventId', "metaEventId"
  )
WHERE "purchaseType"::text = 'WIDGET'
  AND "widgetProvider" IS NULL
  AND "externalEventId" IS NOT NULL;

-- ==========================================
-- OrderRequest: slaMinutes + expireReason + составной индекс
-- (таблица может ещё не существовать — создаётся в hybrid_offers)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_requests') THEN
    ALTER TABLE "order_requests" ADD COLUMN IF NOT EXISTS "slaMinutes" INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE "order_requests" ADD COLUMN IF NOT EXISTS "expireReason" TEXT;
    CREATE INDEX IF NOT EXISTS "order_requests_status_expiresAt_idx"
      ON "order_requests" ("status", "expiresAt");
  END IF;
END $$;

-- ==========================================
-- CheckoutSession: offersSnapshot + completedAt
-- (таблица может ещё не существовать — создаётся в hybrid_offers)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkout_sessions') THEN
    ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "offersSnapshot" JSONB;
    ALTER TABLE "checkout_sessions" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
  END IF;
END $$;

-- ==========================================
-- SQL-assert: контракты после миграции
-- ==========================================
DO $$
DECLARE
  bad_widget_count INTEGER;
  bad_request_count INTEGER;
BEGIN
  -- WIDGET ⇒ widgetProvider IS NOT NULL (для офферов с externalEventId)
  SELECT count(*) INTO bad_widget_count
  FROM "event_offers"
  WHERE "purchaseType"::text = 'WIDGET'
    AND "externalEventId" IS NOT NULL
    AND "widgetProvider" IS NULL;

  IF bad_widget_count > 0 THEN
    RAISE WARNING 'CONTRACT: % WIDGET offers missing widgetProvider (have externalEventId)', bad_widget_count;
  END IF;

  -- REQUEST ⇒ widgetProvider IS NULL (заявки не должны иметь виджет)
  SELECT count(*) INTO bad_request_count
  FROM "event_offers"
  WHERE "purchaseType"::text = 'REQUEST'
    AND "widgetProvider" IS NOT NULL;

  IF bad_request_count > 0 THEN
    RAISE WARNING 'CONTRACT: % REQUEST offers have widgetProvider set (should be NULL)', bad_request_count;
  END IF;
END $$;
