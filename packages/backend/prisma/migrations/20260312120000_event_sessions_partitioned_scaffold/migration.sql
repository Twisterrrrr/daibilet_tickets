-- Prompt 1 — Создание event_sessions_partitioned (scaffolding).
-- Приложение продолжает использовать event_sessions. Swap и перенос данных — отдельные этапы.

-- 1. Родительская партиционированная таблица (PARTITION BY RANGE (startsAt))
CREATE TABLE event_sessions_partitioned (
  "id" UUID NOT NULL,
  "eventId" UUID NOT NULL,
  "offerId" UUID,
  "tcSessionId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "availableTickets" INTEGER NOT NULL DEFAULT 0,
  "capacityTotal" INTEGER,
  "prices" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "canceledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "event_sessions_partitioned_pkey" PRIMARY KEY ("id", "startsAt"),
  CONSTRAINT "event_sessions_partitioned_eventId_startsAt_key" UNIQUE ("eventId", "startsAt"),
  CONSTRAINT "event_sessions_partitioned_tcSessionId_startsAt_key" UNIQUE ("tcSessionId", "startsAt")
) PARTITION BY RANGE ("startsAt");

-- 2. Начальные партиции: прошлые 6 мес + текущий + следующие 12 мес
SELECT create_event_sessions_partition(
  'event_sessions_partitioned'::regclass,
  (date_trunc('month', CURRENT_DATE) + (n || ' months')::interval)::date
)
FROM generate_series(-6, 12) AS n;

-- 3. Индексы (наследуются новыми партициями в PG 12+)
CREATE INDEX "event_sessions_partitioned_startsAt_idx" ON event_sessions_partitioned ("startsAt");
CREATE INDEX "event_sessions_partitioned_eventId_idx" ON event_sessions_partitioned ("eventId");
CREATE INDEX "event_sessions_partitioned_eventId_startsAt_idx" ON event_sessions_partitioned ("eventId", "startsAt");
CREATE INDEX "event_sessions_partitioned_eventId_canceledAt_idx" ON event_sessions_partitioned ("eventId", "canceledAt");
CREATE INDEX "event_sessions_partitioned_offerId_idx" ON event_sessions_partitioned ("offerId");
CREATE INDEX "event_sessions_partitioned_offerId_startsAt_idx" ON event_sessions_partitioned ("offerId", "startsAt");
CREATE INDEX "event_sessions_partitioned_active_starts_idx" ON event_sessions_partitioned ("startsAt") WHERE "isActive" = true;

-- 4. FK
ALTER TABLE event_sessions_partitioned
  ADD CONSTRAINT "event_sessions_partitioned_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE event_sessions_partitioned
  ADD CONSTRAINT "event_sessions_partitioned_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "event_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
