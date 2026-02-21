# Pipeline для Cursor Auto

> Обязательные правила и шаблоны для автоматизированной разработки. См. также `docs/ProductionHardeningPlan.md` (полная спецификация батчей A1–F2).

---

## 0) Правила работы (обязательные)

- **Один PR = одна тема.** Никаких «заодно поправил…».
- **Одна задача за раз.** Не параллелить несколько задач — делать по очереди.
- Каждая задача имеет **DoD** (Definition of Done) и **область влияния** (какие модули трогаем).
- **Никаких изменений в платёжном контуре** без отдельной задачи.
- Каждый PR должен быть проверяем: тесты + 5–10 ручных smoke-check шагов.

---

## 1) Шаблон задачи для Auto (копировать в Cursor)

```
Title: <area>: <goal>

Context: что и зачем делаем (2–4 строки).

Scope: файлы/модули (списком).

Non-goals: что точно не трогаем.

DoD: чеклист.

Tests: какие тесты/команды прогнать.

Smoke: ручная проверка.
```

---

## 2) Порядок батчей (Auto выполняет по очереди)

### Batch A — Observability baseline

| # | Задача | Scope | DoD |
|---|--------|-------|-----|
| A1 | requestId + корреляция логов | backend middleware/interceptor + logger | каждый запрос имеет requestId; requestId в логах NestJS; маскирование email/phone/token в логах |
| A2 | Sentry (или аналог) + алерты | backend bootstrap + exception filter | captureException работает; 5xx/timeout/payment-error тэгируются; включено только в production |
| A3 | Ops endpoints | admin module | /admin/ops/health (stale pending, failed unresolved, active jobs); /admin/ops/metrics (rates/thresholds); только admin-роль |

### Batch B — Security baseline

| # | Задача | DoD |
|---|--------|-----|
| B1 | Helmet + security headers | включены базовые заголовки; CSP не ломает фронт |
| B2 | CORS policy | разрешены только нужные origins (prod/stage); preflight ок |
| B3 | Rate limiting | публичные: search, checkout init, review submit, auth; admin: login; лимиты через env; тест на 429 |
| B4 | Brute-force защита | блокировка/замедление после N попыток; логирование |

### Batch C — Queue/Jobs hardening

| # | Задача | DoD |
|---|--------|-----|
| C1 | DLQ / Failed jobs visibility | admin страница/эндпоинт: jobId, attempts, stack, кнопка retry |
| C2 | HTTP timeouts + AbortController | tc/tep api clients: все внешние HTTP с timeout; при job timeout — отмена |
| C3 | Rate limit внешних API | ограничение concurrency/rps на TC/TEP; backoff |

### Batch D — Cache discipline

| # | Задача | DoD |
|---|--------|-----|
| D1 | Единый CacheService контракт | get/set/delete; namespace ключей; TTL по умолчанию |
| D2 | Инвалидация по источникам | override save → invalidate detail; sync update → invalidate; матрица в docs |
| D3 | TTL policy | detail TTL 1–6h; list TTL 5–10 мин; fallback |

### Batch E — DB growth & retention (без партиционирования)

| # | Задача | DoD |
|---|--------|-----|
| E1 | Retention jobs | EventSession: future + N дней назад; ProcessedWebhookEvent, Audit: TTL/архив; cron + dry-run + отчёт |
| E2 | Индексы под реальные запросы | миграция idempotent; EXPLAIN на топ-запросы |
| E3 | PgBouncer (опционально) | docker-compose + env; проверка лимита соединений |

### Batch F — DB partitioning (последним)

| # | Задача | DoD |
|---|--------|-----|
| F1 | План миграции | документ «как включаем» + rollback |
| F2 | Партиционирование EventSession | партиции по startsAt; автоподготовка будущих; pruning; тест insert/select |

---

## 3) Стандартный чеклист DoD для каждого PR

- [ ] Изменения только в пределах scope
- [ ] Добавлены/обновлены `env.example` и docs (если нужно)
- [ ] Все тесты проходят
- [ ] Линтер/типизация проходят
- [ ] Нет утечек секретов/PII в логах
- [ ] Нет изменения контрактов API без версии/обратной совместимости
- [ ] Smoke-check выполнен

---

## 4) Smoke-check (универсальный, ~10 минут)

1. `/events` — 3 категории, фильтры, сортировки
2. `/events/[slug]` и `/venues/[slug]`
3. Админка: логин, список событий, редактирование override
4. Sync: incremental вручную (или endpoint)
5. Checkout sandbox (если трогали оплату)
6. Логи: requestId, отсутствие PII
7. Rate limit: 429 при перегрузке
8. Health/metrics endpoints — только админу

---

## 5) Рост БД и производительность PostgreSQL

### Что будет расти быстрее всего

- **EventSession** — основной «пожиратель» строк
- **ProcessedWebhookEvent, PaymentIntent, CheckoutSession** — при платежах
- **Audit, Logs, ReviewRequest, ReviewVote** — при росте UGC/операций

### Что сделать заранее

- **План хранения EventSession:** хранить «будущее + недавнее прошлое», не всё бесконечно (90–180 дней истории)
- **Партиционирование:** EventSession по месяцу `startsAt`; event logs (webhooks/audit) по времени
- **Индексы:** соответствуют реальным фильтрам — `cityId`, `category`, `dateMode`, `startsAt`, `offerId + startsAt`, `slug`, `isDeleted`
- **EXPLAIN ANALYZE** на ТОП-10 запросов регулярно
- **PgBouncer** (transaction pooling) — иначе упрётся в connection limits при SSR и админке
- **Миграции** — только идемпотентные/безопасные

---

## 6) Кэш, очереди, «горячие» места

### Кэш

- **Контракт:** `events:detail:{slug}`, `venues:detail:{slug}` — да; каталог — частями (top popular, 5–10 мин)
- **Инвалидация:** из сервисов, меняющих данные (sync, admin override, price updates)

### Очереди (BullMQ)

- DLQ/failed jobs: страница/эндпоинт в админке, кнопка retry
- Ограничение внешних API: rate limit TC/Teplohod, backoff, AbortController для зависших HTTP

---

## 7) Оптимизация процессов

### Observability (обязательно до масштабирования)

- **Sentry/алерты:** 5xx, payment errors, рост failed jobs, timeouts
- **Метрики:** p95 каталога и детальной; время sync; доля событий без priceFrom/без фото (качество каталога)

### Релизы

- CI/CD с миграциями и rollback планом
- Feature flags: выключать источники/purchaseFlow по городам без релиза

### Data quality

- Города без description не показывать
- События без image/priceFrom — в список на добивку
- Подозрительная категоризация — отчёт в админке

---

## 8) Безопасность

- **Секреты:** только env, ротация YooKassa, webhook secrets, API keys
- **API keys:** хэширование, префиксы, IP allowlist, rate limit
- **OWASP минимум:** CSRF/Clickjacking для админки; Helmet; CORS строго; rate limit; brute-force защита
- **Webhooks:** идемпотентность, проверка подписи, raw payload/traceId
- **PII:** минимизация хранения; маскирование в логах; retention policy

---

## 9) Что обычно «взрывается» первым

| Проблема | Решение |
|----------|---------|
| EventSession разрастается | партиции + индексы + ограниченная история |
| Слишком много соединений к Postgres | PgBouncer + ограничение concurrency SSR |
| Кэш рассинхронизируется | единая стратегия инвалидации + TTL |
| Поддержка тонет из-за пограничных платежей | resend/retry в админке + статусная модель |
