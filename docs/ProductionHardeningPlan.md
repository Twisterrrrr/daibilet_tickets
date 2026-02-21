# Production Hardening Plan — Батчи A1–F2

> Цель: масштабирование и стабилизация production без поломки бизнес-логики и платёжного контура.
> **Pipeline для Cursor Auto:** `docs/CursorAutoPipeline.md` — правила, шаблон задач, smoke-check.

**Формат каждого батча:** цель → scope → non-goals → DoD → tests → smoke.

---

## A — Observability и логирование

### A1 — requestId + корреляция логов + маскирование PII ✅

**Цель:** Добавить requestId для каждого HTTP-запроса, прокинуть в логи, замаскировать PII (email/phone/tokens).

**Scope:** backend: middleware/interceptor, logger util, config env.

**Non-goals:** не менять бизнес-логику, не трогать платёжный контур.

**DoD:**
- requestId генерируется если отсутствует (UUID/shortid), также читается из `x-request-id` если есть
- requestId добавляется в response header `x-request-id`
- requestId присутствует во всех логах запросов и ошибок
- маскирование: email, phone, authorization, cookie, token, apiKey (в логах и error context)
- документация: где смотреть requestId — **см. `docs/Observability.md`**

**Tests:** unit на mask util; e2e: запрос → header есть; ошибка → requestId в логе.

**Smoke:** открыть 2 страницы фронта, вызвать 404, убедиться что requestId в логах.

**Реализовано (5248a65):** RequestIdMiddleware (UUID, x-request-id), pii-mask.util, all-exceptions.filter, LoggingInterceptor. Тесты: pii-mask.util.spec, request-id.e2e.spec. См. `docs/Observability.md`.

---

### A2 — Sentry baseline (или текущий аналог) ✅

**Цель:** Подключить Sentry (или уже выбранный error tracker) для backend, с тегами окружения и requestId.

**Scope:** backend bootstrap + exception filter/interceptor.

**Non-goals:** не менять обработку платежей.

**DoD:**
- включается только при `SENTRY_DSN` и `NODE_ENV=production`
- ошибки 5xx репортятся, 4xx не репортятся (кроме whitelist)
- теги: env, service, requestId, route, userId (если есть)

**Tests:** unit на фильтр (4xx не отправлять).

**Smoke:** искусственно выбросить ошибку → событие уходит.

**Реализовано (5248a65):** Sentry.init при SENTRY_DSN + NODE_ENV=production, beforeSend (4xx не репортим), SentryContextMiddleware (requestId, route). Тест: sentry-filter.spec.

---

### A3 — Ops endpoints: health/metrics (admin-only) ✅

**Цель:** Добавить admin-only эндпоинты `/admin/ops/health` и `/admin/ops/metrics`.

**Scope:** backend admin module/controllers/services.

**Non-goals:** не трогать данные платежей, кроме read-only агрегаций.

**DoD:**
- `/admin/ops/health`: pending stale, failed unresolved, escalated open, active intents, active sync jobs (если есть)
- `/admin/ops/metrics`: rates (fulfillment_fail_rate, webhook_dedup_rate, auto_compensate_rate) и thresholds
- оба эндпоинта защищены admin guard

**Tests:** e2e admin auth required.

**Smoke:** открыть админку → endpoints отвечают.

**Реализовано (5248a65):** AdminOpsController GET /admin/ops/health, /admin/ops/metrics, JwtAuthGuard + @Roles('ADMIN'). pendingStale, failedUnresolved, escalatedOpen, activeIntents, syncCounts; rates (fulfillment_fail, webhook_dedup, auto_compensate).

---

## B — Безопасность

### B1 — Helmet + security headers ✅

**Цель:** Включить Helmet и базовые security headers без поломки фронта/виджетов.

**Scope:** backend main.ts/app bootstrap.

**Non-goals:** не включать жёсткий CSP, если ломает teplohod/TC.

**DoD:**
- включены стандартные headers
- настроены исключения/allowlist для нужных embed скриптов (если CSP включается)
- документация: какие домены разрешены

**Tests:** e2e: основные страницы грузятся.

**Smoke:** открыть страницу с виджетом teplohod/TC.

**Реализовано (5248a65):** helmet({ contentSecurityPolicy: false }) в main.ts — CSP выключен для teplohod/TC виджетов. См. `docs/SecurityHeaders.md`.

---

### B2 — CORS policy ✅

**Цель:** Строго ограничить CORS по окружениям.

**Scope:** backend bootstrap + env.

**Non-goals:** не ломать local dev.

**DoD:**
- `CORS_ORIGINS` env (comma-separated)
- dev: разрешить localhost (явно)
- prod: только daibilet.ru + admin domain (если отдельный)
- preflight ok

**Tests:** unit на парсинг origins; e2e preflight.

**Smoke:** фронт/админка работают.

**Реализовано (5248a65):** cors.util (getCorsOrigins, parseCorsOrigins), CORS_ORIGINS/CORS_ORIGIN env, dev localhost 3000/3001/5173, prod APP_URL fallback. main.ts enableCors. Тест: cors.util.spec.

---

### B3 — Rate limiting на публичные и admin login ✅

**Цель:** Добавить rate limit на чувствительные endpoints.

**Scope:** backend guards/middleware + config.

**Non-goals:** не ограничивать webhooks provider (для них отдельные лимиты).

**DoD:**
- limits в env (public/auth/admin/webhook)
- 429 с понятным error code
- отдельные лимиты: `/api/*search*`, `/checkout/*`, `/admin/auth/login`, `/reviews/*`

**Tests:** e2e: 429 после N запросов.

**Smoke:** руками дернуть endpoint 20 раз → 429.

**Реализовано (21.02):** `throttle.util` (env THROTTLE_TTL/LIMIT), `@Throttle` на search/reviews/auth/login/checkout, 429 + `errorCode: RATE_LIMIT_EXCEEDED`, webhooks `@SkipThrottle`. Тесты: `throttle.util.spec`, `rate-limit.e2e.spec`.

---

### B4 — Brute-force защита admin login ✅

**Цель:** Защитить admin login от перебора (IP + username).

**Scope:** admin auth controller/service.

**Non-goals:** не менять JWT/пароли.

**DoD:**
- после N попыток: cooldown (например 10 минут) или progressive delay
- логирование события (без раскрытия пароля)
- админ видит «слишком много попыток»

**Tests:** unit на счётчик.

**Smoke:** 6 неверных логинов → блок/задержка.

**Реализовано (22.02):** LoginBruteForceService (Redis), BRUTE_FORCE_MAX_ATTEMPTS/COOLDOWN_SEC, логирование, «Слишком много попыток входа. Повторите через X мин.», unit-тесты.

---

## C — Jobs и внешние вызовы

### C1 — Failed jobs visibility + retry (Admin) ✅

**Цель:** Страница/эндпоинт для failed jobs (sync/fulfillment) и кнопка retry.

**Scope:** admin backend + admin frontend.

**Non-goals:** не менять логику job processing.

**DoD:**
- список jobs: name, jobId, attemptsMade/attempts, failedReason, stack (short), timestamp
- action: retry (с аудитом кто нажал)
- фильтр по queue name

**Tests:** unit на service; e2e retry endpoint admin-only.

**Smoke:** искусственно завалить job → увидеть → retry.

**Реализовано (22.02):** FailedJobsService, AdminJobsController (GET /admin/jobs/failed, POST /admin/jobs/failed/:queue/:jobId/retry), фильтр по queue, аудит retry, страница admin /jobs/failed.

---

### C2 — HTTP timeouts + AbortController для TC/TEP ✅

**Цель:** Все внешние HTTP-запросы имеют timeout и поддерживают отмену при job timeout.

**Scope:** tc/tep api clients, sync services.

**Non-goals:** не менять формат данных.

**DoD:**
- timeout конфигурируемый через env
- AbortController прокидывается до fetch/axios
- при job timeout вызывается abort

**Tests:** unit: abort triggers; integration: simulated hang.

**Smoke:** поставить timeout=1s на dev → убедиться что запросы не висят.

**Реализовано (21.02):** `http-signal.util` (combineAbortSignals, getHttpTimeoutMs), TC/TEP API — timeout из env (TC_HTTP_TIMEOUT_MS, TEP_HTTP_TIMEOUT_MS) + signal в request. TcSyncService.syncAll(signal), syncAllRest(signal), TepSyncService.syncAll(signal) — прокидывают signal в getEvents/getCities. SyncProcessor.withTimeout создаёт AbortController, при job timeout вызывает ctrl.abort() и reject — HTTP-запросы TC/TEP прерываются.

---

### C3 — Rate limiting внешних API (TC/TEP) ✅

**Цель:** Не бомбить поставщиков; стабилизировать sync.

**Scope:** sync services.

**Non-goals:** не менять расписание cron.

**DoD:**
- concurrency limit (например p-limit)
- backoff на 429/5xx
- метрика времени sync и количества retries

**Tests:** unit на limiter.

**Smoke:** full sync в dev → без всплесков.

**Реализовано (22.02):** `api-rate-limit.util` (p-limit, withRetry), TcApiService/TepApiService — request через runWithLimit+withRetry. Env: TC_TEP_CONCURRENCY. Логирование retries. Unit: api-rate-limit.util.spec.

---

## D — Кэширование

### D1 — Единый CacheService контракт + namespacing ✅

**Цель:** Централизовать ключи кэша и TTL.

**Scope:** backend cache module/service.

**Non-goals:** не менять данные в БД.

**DoD:**
- get/set/del + delByPrefix (если Redis)
- ключи через helper: `cacheKeys.events.detail(slug)` и т.п.
- default TTL

**Tests:** unit на key builder.

**Smoke:** детальная страница кэшируется.

**Реализовано (22.02):** cache-keys.ts, CacheService.delByPrefix, cacheKeys re-export. Все сервисы переведены на cacheKeys.

---

### D2 — Инвалидация кэша по изменениям (override/sync/admin) ✅

**Цель:** Гарантировать актуальность детальных страниц и ключевых листингов.

**Scope:** event-override.service, sync services, admin update flows.

**Non-goals:** не внедрять сложный list-cache, только необходимые ключи.

**DoD:**
- при сохранении override: del detail по slug
- после sync update: del detail по slug (и venue detail если затронуто)
- матрица «что сбрасываем» в docs

**Tests:** integration: update override → cache miss next.

**Smoke:** поменять title override → сразу видно на фронте.

**Реализовано (22.02):** CacheInvalidationService.invalidateOverride вызывается из AdminEventsController. Матрица: docs/CacheInvalidationMatrix.md.

---

### D3 — TTL policy (detail/list) ✅

**Цель:** Установить единые TTL и fallback.

**Scope:** cache config.

**Non-goals:** не менять логику каталога.

**DoD:**
- detail TTL 1–6h
- list/top TTL 5–10m (если есть)
- TTL в env

**Tests:** unit parse env.

**Smoke:** убедиться, что ключи с TTL.

**Реализовано (22.02):** CACHE_TTL_* env (CACHE_TTL_DETAIL, CACHE_TTL_LIST, CACHE_TTL_CITIES и т.д.).

---

## E — Retention и инфраструктура БД

### E1 — Retention jobs (cleanup) ✅

**Цель:** Контролировать рост таблиц (sessions/webhooks/audit).

**Scope:** backend cron/queue jobs + admin report.

**Non-goals:** не трогать бизнес-таблицы без явного окна хранения.

**DoD:**
- env: `RETENTION_EVENTSESSIONS_DAYS`, `RETENTION_WEBHOOK_DAYS`, `RETENTION_AUDIT_DAYS`
- dry-run mode: отчёт сколько строк удалится
- реальные удаления батчами (limit)

**Tests:** unit dry-run; integration delete batches.

**Smoke:** прогнать dry-run, проверить отчёт.

**Реализовано (22.02):** RetentionService, cron 04:00. Env: RETENTION_DRY_RUN, RETENTION_EVENTSESSIONS_DAYS (180), RETENTION_WEBHOOK_DAYS (90), RETENTION_AUDIT_DAYS (365). Batch 500.

---

### E2 — Индексы под реальные запросы ✅

**Цель:** Добавить недостающие индексы под /events, /catalog, /venues, admin list.

**Scope:** миграции (idempotent), prisma schema if needed.

**Non-goals:** не менять бизнес-логику.

**DoD:**
- миграция(и) безопасные: IF NOT EXISTS
- список индексов в docs
- EXPLAIN на 3 ключевых запросах до/после (в комментарии PR)

**Tests:** migrate deploy на чистой и на существующей БД.

**Smoke:** каталог быстрее (по логам/метрике).

**Реализовано (22.02):** 20260222_e2_performance_indexes — events_catalog_idx, events_admin_list_idx, event_sessions_active_starts_idx, venues_city_active_idx, processed_webhook_events_processed_at_idx, audit_logs_created_at_idx.

---

### E3 — PgBouncer (опционально, если уже в планах) ✅

**Цель:** Ограничить количество соединений и стабилизировать SSR/админ.

**Scope:** infra/docker + backend connection string.

**Non-goals:** не менять Postgres.

**DoD:**
- pgbouncer поднимается
- backend подключается через него в prod compose
- параметры пула документированы

**Tests:** healthcheck.

**Smoke:** проверить max connections.

**Реализовано (22.02):** docs/PgBouncer.md, infra/pgbouncer/pgbouncer.ini, userlist.txt. Опционально — см. документацию.

---

## F — Партиционирование

### F1 — План миграции партиционирования ✅

**Цель:** Подготовить документированный план внедрения без простоя.

**Scope:** docs + миграции-подготовки.

**Non-goals:** не включать партиции без готового плана отката.

**DoD:**
- документ: steps, rollback, verification queries
- подготовлены скрипты создания партиций

**Tests:** dry-run на staging (если есть).

**Smoke:** checklist выполнен.

**Реализовано (22.02):** docs/PartitioningPlan.md — шаги, rollback, verification.

---

### F2 — Партиционирование EventSession по startsAt (месяц) ✅

**Цель:** Ускорить запросы и ограничить рост.

**Scope:** Postgres migrations + prisma raw SQL.

**Non-goals:** не менять API.

**DoD:**
- родительская таблица + партиции по месяцам
- функция/cron для создания будущих партиций на N месяцев вперёд
- подтверждение pruning на EXPLAIN

**Tests:** insert/select, migrate deploy idempotent.

**Smoke:** каталог по датам работает.

**Реализовано (22.02):** миграция create_event_sessions_partition(parent_table, month_start). Полный swap — см. docs/PartitioningPlan.md.
