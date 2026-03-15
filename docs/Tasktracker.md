# Tasktracker — Агрегатор билетов + Trip Planner

> 2026-03-12. См. `Reference.md`, `Deploy.md`.

---

## Приоритеты до prod

1. **Полный контур поставщика** — замкнуть цикл: регистрация → события → заказы → оплата → выплаты.
2. **YooKassa** — заменить STUB, webhook, fulfil, тестовые платежи в sandbox.
3. **Базовый контент** — SEO-описания городов/площадок, ТОП-лендинги.
4. **Деплой на prod** — Gate 0b (DNS, SSL, бэкапы).

**Отложено 6+ мес:** Planner, Unified Checkout, ML, PWA, gRPC-оптимизации, расширенная CI.

---

## Легенда

- **Приоритет**: Критический / Высокий / Средний / Низкий
- **Статус**: `[ ]` не начато, `[~]` в работе, `[x]` выполнено, `[-]` отменено
- **Отложено 6+ мес**: помечено `(⏸ 6+ мес)` — возврат к задаче не ранее Q3 2026

---

# Часть I — Закрытые задачи (Выполнено)

> Сводка выполненных работ по темам. Исторические детали — `docs/archive/Diary.md`.

## Phase 2–5: Orders UX, Availability, Listing Health, Витрина (15.03.2026) ✅

- **Phase 2 (O2.2/O2.3):** hasActiveDispute в GET /supplier/orders по SupportTicket (orderCode); кнопка «Нужна помощь по заказу» → POST /support/request с orderCode. Экспорт заказов: GET /supplier/orders/export (dateFrom/dateTo или preset, лимит 5000, stream CSV).
- **Phase 3 (T3.1):** PATCH /supplier/events/:eventId/sessions/bulk-capacity (sessionIds, newCapacity), защита newCapacity >= soldQty; UI Availability — чекбоксы, модалка, отчёт.
- **Phase 4 (Q4.1):** actionUrl в HealthIssue (NO_PHOTO → edit#photos, NO_SESSIONS → /availability?eventId=…, NO_PRICE → edit#prices и др.); блок «Качество листингов» на Dashboard со ссылками «Исправить»; Availability читает eventId из URL.
- **Phase 5 (SupplierDailyStat):** Витрина supplier_daily_stats; cron 00:05 UTC; incrementToday при PAID; Dashboard и тренды из витрины с fallback. GET /supplier/stats/daily, GET /supplier/analytics/sales-chart. Документы: SupplierDailyStat-Design.md, Admin-Health-Dashboard-Design.md.
- **Техдолг:** supplier-document.service.ts — payloadJson as Prisma.InputJsonValue; npx tsc --noEmit без ошибок.

## Checkout + Smart UX (C0–C7) + E2E validation (06.03.2026) ✅

- **C0–C7 реализованы:** контракты ошибок, read API, smart sorting (bestOption зафиксирован), checkout + redirect, holds (в т.ч. AWAITING_PAYMENT), paid = PackageItem + FulfillmentItem, webhook, precomputed stats (soldLast24h), last-customer snapshot.
- **Правило bestOption** нормализовано и документировано (один сеанс на событие = ближайший по startsAt среди доступных). См. `docs/archive/PR-C0-C7-Final.md` §6.
- **E2E validation pass (06.03.2026)** выполнен: smoke path (Read API → Checkout → Payment → Webhook → Fulfillment → Stats → Last customer), 5 edge cases (last seats race, duplicate webhook, late payment after expiry, soldLast24h, last-customer). См. `docs/archive/PR-C0-C7-Final.md` §8.

## Gate 0a — Staging (03.2026) ✅

- **Инфраструктура:** VPS Timeweb Cloud, DNS staging, SSH, bootstrap/close-gate0, deploy, migrate, SSL (Let's Encrypt), health OK (status, db, redis).
- **Бэкапы:** `scripts/backup-staging-db.sh`, `scripts/backup-production-db.sh` — дамп в `/opt/daibilet/backups/`, retention 14 дней. Запуск: на VPS в `cd /opt/daibilet`.

## Review Module MVP (11.03.2026, этапы 1–11) ✅

- **Prisma:** ReviewSupplierResponse, ReviewDispute, ReviewDisputeEvidence, ReviewActionLog; Review: supplierId, publishedAt, HIDDEN.
- **Domain:** ReviewCapabilityService (canAcceptReviews, isImportedAggregatorEvent, requiresSupplierResponse). TC/TEPLOHOD — отзывы запрещены; MANUAL + owner — разрешены.
- **Backend Public:** capability guard в create, reviewCapability в event detail, supplierResponse и hasActiveDispute в getByEventSlug.
- **Backend Supplier:** GET/POST reviews, response, submit, accept, dispute, evidence upload.
- **Backend Admin:** модерация supplier responses (approve/reject), disputes queue (resolve: KEEP/HIDE/DELETE).
- **Frontend Public:** форма скрыта при DISABLED, плашка «Оспаривается», блок «Ответ организатора».
- **Frontend Supplier:** раздел «Отзывы» (вкладки, карточка, response/dispute/evidence).
- **Frontend Admin:** вкладки «Ответы поставщика», «Оспаривания».
- **Тесты:** review-capability.service.spec.ts. См. `docs/archive/ReviewModuleAudit.md`.

## Content Model / PageTemplateSpecs MVP+ (11.03.2026) ✅

- **Гибридная архитектура:** core-колонки vs content JSON vs наследуемая refund policy. См. `archive/specs/`.
- **Prisma:** Event (meetingPoint, routeSummary, refundPolicy*), EventOverride (contentTemplateData, meetingPoint, routeSummary, refundPolicy*), Venue (refundPolicy*, venueTemplateData), Operator (defaultRefundPolicyText).
- **Shared:** content-template.types (Zod), refund-policy (enum), page-template-specs (schema registry).
- **Backend:** RefundPolicyResolutionService; CatalogService — refundPolicyResolved; DTO для Event/Venue/Supplier.

## Canonical Tag Enrichment + Auto Landing Engine (11.03.2026) ✅

- **Enrichment:** `canonical-tag-enrichment.ts` — единый слой тегов по title/description; city-specific правила; 29 unit-тестов. Подключён в retagAll.
- **Materializer:** TopicDefinition, LandingMaterializerService, POST /admin/landings/materialize. См. [Architecture.md](Architecture.md).
- **Phase A (staging):** POST /admin/settings/ops/retag-and-materialize — retag + materialize с summary (beforeVisible, visible, hidden, changedSlugs). POST /admin/settings/ops/retag выполняет retagAll.
- **Phase B (materialize после sync):** sync → retag → materialize. CatalogController sync/all и SyncProcessor sync-full вызывают materializer; результат в ответе. Идемпотентно, fallback при ошибке.
- **Phase C (Collection salyut):** кросс-городская коллекция salyut в seed; CollectionService.getBySlug поддерживает cityId=null и ?city=; /podborki/salyut и ?city=saint-petersburg; тесты в collection.service.spec.ts.

## Prompt 2 + Admin Ops (08.03.2026) ✅

- **Prompt 2 (Catalog observability):** CacheService — hits/misses в getOrSet, getCacheStats(). GET /admin/ops/metrics расширен полем `cache: { hits, misses, hitRate }`.
- **Admin ops — Flush по namespace:** POST /admin/settings/ops/cache/flush?namespace={ns}. Поддержка: full, cities, events, catalog, tags, regions, landings, combos, search. UI: select + «Flush Cache».
- **Admin ops — Resync с прогрессом:** Full Sync / Incr Sync ставят задачу в BullMQ. GET /admin/settings/ops/sync/progress?jobId=... — state, finishedOn, failedReason.

## Publish-gate UI + каталог городов (08.03.2026) ✅

- **Publish-gate:** editorStatus в админке, кнопка «Опубликовать», POST /admin/events/:id/publish; каталог учитывает только override null или editorStatus=PUBLISHED.
- **Правила городов:** minEventsForCity=2, областные города под хабом (hiddenCityIds). Кэш: cities 6h, events 2m; сброс через POST /admin/settings/ops/cache/flush.

## Cursor Master Pipeline PR-1–PR-8 (01.03.2026) ✅

- **PR-1 (A1)** EventOverride.subcategories: INHERIT/OVERRIDE/CLEAR (resolveSubcategories).
- **PR-2 (A2)** Redis cache: TTL (cities 6h, events 2m/10m), инвалидация catalog при изменении события.
- **PR-3 (A3)** Publish-gate: isSellable(), фильтр offers с priceFrom > 0, voucherUrl в tracking.
- **PR-4 (C2)** Mobile checkout: прогресс-бар, fixed bottom bar ≤420px.
- **PR-5 (C3)** /orders/[id]: таймлайн, операционная инфо, ваучер.
- **PR-6 (B1+B2)** JSON-LD: buildArticleJsonLd(), Article schema на blog/[slug], FAQPage в FaqSection.
- **PR-7 (D1)** ESLint no-explicit-any: уже включён (warn); overrides для DTO, тестов.
- **PR-8 (D2)** Типизация tc-sync: TcVenueCity, TcTicketSetRule, TcOffer, isTcEvent, валидация.

## Инфра + типизация + UX + Checkout (26 PR) ✅

- T1–T26 выполнены (22.02): Nginx uploads, Feature Flags, Pino, Sentry, TcEvent[], Prisma where builders, catalog keys, cache, email order-confirmed/completed, view toggle, skeleton, Teplohod widgets, Supplier RBAC, /checkout/[packageId], createPackage, YooKassa flow, webhook idempotency. Миграции M1–M8.

## Ops Foundation (Cursor Auto) ✅

- **Batch 1**: IdempotencyKey, IdempotencyService.run, миграция, unit-тесты
- **Batch 4**: POST resend-email, retry-fulfilment, set-status (reason, audit)
- **Batch 5**: Runbooks (payment-succeeded, order-exists-no-voucher, refund, cancel, webhook-failures, disaster-recovery)
- **Batch 6**: scripts/backup.sh, restore-to-staging.sh

## Каталог, главная, TEPLOHOD ✅

- Главная: фильтр по городу, fallback популярных, HeroCitySearch, чипы городов.
- TEPLOHOD classifyTep: EXCURSION+RIVER, EXTREME только для наземных.
- fix-teplohod-river, единый каталог (Вариант B), «Показывать по» 20/50/100.
- Шаблоны событий (EventTemplateFields), посадочная «Музеи», страница-шаблон экскурсий, шаблон «Мероприятия».

## Решения 13 вопросов + Supplier ✅

- Email GiftCertificate, session.prices, CacheInvalidationService, reclassify-events, CartIcon→null, PageTemplateSpecs, GiftCertificate в checkout, EventOverride category+subcategory.
- SupplierArchitecture, createdByType, RBAC, Event/Venue createdById, RBAC guards.

## Далее (приоритетная очередь) ✅

- Merge дублей (admin UI), автодедуп, Review.venueId, sitemap, SeoTemplate, SeoMeta, SeoGeneratorService.

## 23.02.2026 — UX + типизация + Planner ✅

- **Frontend:** loading.tsx для /events, EventEdit подсказки «Оригинал»/«Для Daibilet», SearchAutocomplete city filter
- **Backend:** JwtPayload/auth.types, req типы (PartnerApiUser, SupplierAuthUser), Prisma.PackageWhereInput
- **Planner:** Кнопка «Заменить» на слоте → POST /planner/customize

## Production Hardening, Technical Debt ✅

- FK-индексы, Logger, env для teplohod, CSV streaming, pagination, requestId, PII masking, идемпотентные миграции, frontend typecheck.
- Backend: стабилизированы unit/e2e-тесты (catalog.getCities, checkout.validateCart/createCheckoutSession, PaymentService, SyncProcessor) — весь suite зелёный.
- Frontend: ESLint + tsc + `next build` проходят; критичные `<img>`/внутренние `<a>` приведены к `next/image`/`Link` в основных потоках (checkout, orders, planner, blog, каталог).

## Музеи и Арт, Venues, Partner API, Supplier Portal ✅

- Полный цикл: модели, миграции, API, Admin UI, фронт /venues, JSON-LD, Reviews, UGC, Checkout flow, PaymentIntent, State machine.

## Админка, Фазы 1–6 (основное) ✅

- Auth, RBAC, CRUD (Events, Cities, Tags, Landings, Combos, Articles, Orders), AuditLog, EventOverride, PricingConfig, Ops controls, редизайн shadcn/ui, Reviews, UGC.

## Consolidation (Admin DTO) ✅

- Admin DTO: единая точка импорта `./dto/admin.dto` (CreateTagDto, UpdateTagDto, UpdateCityDto inline; остальные re-export). Все admin-контроллеры переведены на импорт из admin.dto.

## Consolidation (Supplier, Partner, SEO) ✅

- **Supplier**: 5 контроллеров (auth, dashboard, events, reports, settings) → 1 supplier.controller.ts
- **Partner**: 3 контроллера (events, orders, reports) → 1 partner.controller.ts
- **SEO**: 2 контроллера (public, admin) + 2 сервиса (meta, generator) → 1 seo.controller.ts (2 класса) + 1 seo.service.ts

## Решения 13 открытых вопросов (19.02.2026) ✅

> Все решения приняты. Реализация: часть выполнена, остальное — в соответствующих разделах Part II.

| # | Вопрос | Решение | Выполнено |
|---|--------|---------|-----------|
| 1 | Переклассификация событий | Скрипт reclassify-events.ts | ✅ |
| 2 | EventOverride.subcategories | Жёсткий override: INHERIT/OVERRIDE/CLEAR + subcategoriesOverride | ✅ |
| 3 | GiftCertificate — email | Шаблон, fulfillment, retry, лог admin | ✅ |
| 4 | Скрыть корзину | Прямой checkout per-offer | ✅ |
| 5 | Планировщик MVP | Отложить до базы 2000+ событий | — |
| 6 | PageTemplateSpecs | Гибридная модель (core + content JSON + refund policy) | ✅ |
| 7 | session.prices | NormalizedPrice | ✅ |
| 8 | Лендинг salyut | Проверить в проде, unit-test getPrice | — |
| 9 | Типизация any | «Ни одного нового any» | — |
| 10 | Кэш и инвалидация | CacheInvalidationService | ✅ |
| 11 | GiftCertificate в checkout | Поле «Ввести код» + валидация; произвольная сумма при покупке | ✅ |
| 12 | Избранное → аккаунт | Оставить localStorage | — |
| 13 | Аудит категоризации | SQL-отчёт | — |

---

# Часть II — Открытые задачи (Gates)

> Часть I остаётся историей; фактический статус для запуска считаем по Gate 0–3.
> Задачи ниже разбиты по “воротам” (Gates). Всё, что не попало в них, — в блоке «После запуска / 6+ мес».

---

## Merge checklist (гейты перед merge в main)

Перед merge ветки в `main` обязательно пройти:

| Гейт | Команда | Ожидание |
|------|--------|----------|
| TypeScript | `cd packages/backend && npx tsc --noEmit` | PASS (0 ошибок) |
| Lint | `cd packages/backend && npm run lint` | PASS (0 errors; warnings по any допустимы) |
| Тесты | `pnpm --filter @daibilet/backend test` | PASS или NOT RUN (если в CI тесты не настроены — зафиксировать) |

Рекомендуемый порядок коммитов: один коммит только с правками под tsc (`fix(backend): make tsc pass`), затем merge без смешивания с массовой чисткой линта в том же коммите.

---

## Gates (минимальный путь к запуску)

### Gate 0 — проект доступен по доменам + есть бэкап

> **Двухэтапный подход:** сначала Gate 0a (staging), затем Gate 0b (prod). Gate 0 закрыт, когда оба этапа выполнены. Одна команда: `bash scripts/close-gate0.sh` (0a) и `bash scripts/close-gate0.sh --prod` (0b).

#### Gate 0a — Staging ✅

- [x] **Критический**: VPS на Timeweb Cloud (2 CPU, 4 GB RAM, 50 GB) ✅
- [x] **Критический**: DNS A: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru → IP VPS ✅
- [x] **Критический**: SSH, `bash scripts/bootstrap-staging.sh` (или `close-gate0.sh` после первого bootstrap) ✅
- [x] **Критический**: TC_API_TOKEN, TC_WIDGET_TOKEN в .env (1:1 из локального) ✅
- [x] **Критический**: `bash scripts/close-gate0.sh` — deploy, migrate, backup, verify ✅
- [x] **Высокий**: https://staging.daibilet.ru, https://admin-staging.daibilet.ru, https://api-staging.daibilet.ru/api/v1/health ✅
- [x] **Средний**: SSL: `STAGING_ONLY=1 bash scripts/init-letsencrypt.sh` + `bash scripts/enable-ssl-staging.sh` ✅
- [x] **Средний**: Бэкап: `bash scripts/backup-staging-db.sh` ✅

#### Gate 0b — Production

- [ ] **Критический**: DNS A: daibilet.ru, www.daibilet.ru, api.daibilet.ru, admin.daibilet.ru → IP prod
- [ ] **Критический**: `bash scripts/close-gate0.sh --prod`
- [ ] **Высокий**: https://daibilet.ru, https://admin.daibilet.ru, https://daibilet.ru/api/v1/health
- [ ] **Средний**: SSL prod (Let's Encrypt, SAN 4 домена, cron renewal)
- [ ] **Средний**: `bash scripts/backup-production-db.sh` (скрипт есть в `scripts/`; запускать на prod VPS)

### Gate 1 — принимаем платежи end-to-end

- [ ] **Критический**: .env production: YooKassa ключи, PAYMENT_PROVIDER=YOOKASSA
- [ ] **Критический**: Зарегистрировать магазин в YooKassa, получить shopId + secretKey
- [ ] **Критический**: Подключить YooKassa SDK → заменить STUB в payment.service
- [ ] **Критический**: POST /webhooks/yookassa — верификация подписи, идемпотентность по event.id
- [ ] **Критический**: PaymentService.applyWebhookEvent + BullMQ fulfilment queue (retry, backoff)
- [ ] **Критический**: Тестовый платёж в sandbox — 3 сценария (PLATFORM, EXTERNAL, mixed)
- [ ] **Высокий**: Fulfilment идемпотентен, PaymentEvent/audit storage, e2e-тесты
- [ ] **Высокий**: Страница «Оплата прошла» / «Ошибка оплаты» на фронте
- [ ] **Высокий**: Sentry alerts на 5xx и payment failures
- [ ] **Средний**: GiftCertificate в checkout — поле «Ввести код» + валидация
- [ ] **Средний**: Лендинг `salyut` — unit-test getPrice + проверка edge-cases
- [ ] **Средний**: SQL-отчёт по категоризации (аудит качества каталога)

### Buyer Account / ЛК покупателя (MVP, 15.03.2026)

- [x] **Высокий**: Аудит текущего состояния (User, CheckoutSession, auth, orders, track) → `docs/BuyerAccountAudit.md` ✅
- [x] **Высокий**: Архитектурная спецификация → `docs/BuyerAccountSpecs.md` ✅
- [x] **Высокий**: Prisma: `userId` в CheckoutSession, миграция ✅
- [x] **Высокий**: Привязка заказа к пользователю при создании сессии (опциональный JWT) ✅
- [x] **Высокий**: Backend API: GET /account/me, /account/orders, /account/orders/:id, /account/tickets, GET/PATCH /account/profile, ownership checks ✅
- [x] **Высокий**: Backend GET /account/purchases — единый список покупок с типами карточек (INTERNAL_TICKET, EXTERNAL_VOUCHER, BOOKING_CONFIRMATION, AWAITING_PAYMENT, MANUAL_CONFIRMATION) ✅
- [x] **Высокий**: Frontend: layout /account, dashboard, заказы, деталь заказа, билеты, избранное (редирект), профиль ✅
- [x] **Высокий**: Frontend /account/purchases — единый экран «Мои покупки» с визуальным различием типов карточек ✅
- [x] **Высокий**: Навигация: «Мои покупки» в header (desktop + mobile) → /account/purchases, «Личный кабинет» → /account; редирект после логина по умолчанию на /account/purchases ✅
- [x] **Средний**: Read‑model и тесты Buyer Account: вынесен `PurchaseReadService` + маппер `PurchaseListItemDto`, capability‑хелперы `getPurchaseDisplayType` + `derivePurchaseActions` и helper `computeTicketAvailable` покрыты unit‑тестами; добавлены controller‑level интеграционные тесты для `/account/purchases`, `/account/orders`, `/account/orders/:id` (в т.ч. 403 при чужом заказе), `/account/tickets`, `/checkout/track/:shortCode` ✅
- [ ] **Низкий**: Реальная интеграция YooKassa: metadata.orderId/userId в payment init, webhook → оплата в ЛК

### Gate 2 — ежедневные ops в текущей админке

- [x] **Высокий**: Admin UI — поиск заказа (id/code/email/paymentId) + resend, retry fulfilment (OrderDetail) ✅
- [x] **Высокий**: Cache invalidate в Settings (scope + ids → /admin/cache/invalidate) ✅
- [x] **Средний**: Support escalation checklist — `docs/SupportEscalation.md` ✅

### Gate 2.5 — админка событий (готовность, расписание, поставщики)

> Поставщики: см. раздел ниже.
> **Статус:** Gate 2.5 завершён; админка событий, расписания и поставщиков готова к ежедневной работе.

- [x] **Высокий**: PR1 — GET /admin/events/:id/quality (on-demand), UI «Причины неактивности» + подсветка вкладок, field→tabKey (**v1 реализован**: endpoint + `EventQualityService` + `QualityBanner`)
- [x] **Высокий**: PR1 — Статус: isHidden ≠ активность, одна строка «В каталоге / Скрыто вручную / Причины» (без forceActive на MVP) (**v1 реализован**: `EventStatusLine` с inCatalog/isHidden/quality)
- [x] **Высокий**: PR2 — Миграции (порядок: 1) pre-unique-safety, 2) admin_schedule_capacity) (**реализовано**: pre-unique-safety миграция + индексы, см. `schema.prisma` и миграции 20260301*)
- [x] **Высокий**: PR2 — Вкладка «Расписание» — v1: список сеансов + create/edit/cancel/delete, Model A-блокировки; Teplohod-style grid/brush/ластик → отдельный PR v2
- [x] **Высокий**: PR2 — Контекстное меню слота, Модель A при sold>0, PATCH capacity/delete/cancel (**реализовано**: диалоги Edit/Delete/Cancel + `SessionLockedException`)
- [x] **Высокий**: PR2 checklist перед merge: индексы package_items(sessionId[,status]) в БД; tcSessionId не пустой; нет дублей (eventId,startsAt) (**выполнено** в pre-unique-safety миграции)
- [x] **Высокий**: PR3 — Events — колонка groupingKey + фильтр; раздел «Группы событий» (**backend grouping API готов**, глобальный раздел «Группы событий» и вкладка в EventEdit реализованы)
- [x] **Высокий**: PR4 — /admin/seo-audit, GET /admin/seo-audit/events, on-the-fly seo_issues + UI фильтров и бейджей
- [x] **Высокий**: PR‑S1 — Admin SuppliersList v1 (реестр поставщиков: имя, тип, статус, события, площадки, комиссия, последняя активность; фильтры; быстрые действия)
- [x] **Высокий**: PR‑S2 — Admin SupplierDetail v1 (Профиль/События/Площадки/Финансы/Доступ; смена статуса ACTIVE/FROZEN; изменение комиссии) — **S1.1–S1.2**: вкладки Профиль/События/API, список событий поставщика `/admin/suppliers/:id/events` с пагинацией и учётом `supplierIsActive` в статусе «В каталоге»
- [x] **Средний**: PR‑S3 — Supplier EventsList/EventEdit v1.5 (упрощённый UX: базовые поля, подсказки качества, без перегруза override/SEO; переключатель активности, счётчик сеансов)

### Gate 3 — контент/SEO минимум для индексации (3+ мес)

- [ ] **Критический**: SEO-описания для всех городов (уникальные, не шаблонные)
- [ ] **Критический**: SEO-описания для ТОП-10 площадок (venues)
- [ ] **Высокий**: Тематические лендинги («Ночные экскурсии СПб», «Музеи Казани с детьми» и др.)
- [x] **Высокий**: Базовый JSON-LD и meta-теги на городах, venues, событиях, комбо ✅ (buildPageMetadata, og+twitter)
- [x] **Высокий**: PageTemplateSpecs — гибридная модель (11.03): core + content JSON + refund policy; аудит соответствия ✅ (docs/PageTemplateSpecsAudit.md)
- [ ] **Средний**: Контентный план — 30 статей (ArticlePlanner)
- [ ] **Средний** (3+ мес): Отображение «Музеи» (детальная страница venue) — режим работы, галерея, выставки (см. `docs/Reference.md` §1)
- [ ] **Средний**: Аудит категоризации — SQL-отчёт уже из Gate 1 можно переиспользовать как инструмент SEO
- [x] **Высокий**: Event Quality Gate — `EventQualityService.validateForPublish` + `/admin/events/:id/publish` ✅ (+ NO_VALID_PRICE для офферов без цены)
- [x] **Высокий**: EventOverride.subcategories — явная семантика INHERIT/OVERRIDE/CLEAR + subcategoriesOverride (SubcategoriesMode enum + Prisma migration)
- [~] **Средний**: Нормализация категорий/аудиторий после импорта (детерминированный маппинг TC/TEP → EventCategory/EventSubcategory). **TEPLOHOD E2E готов:** mapping first → register unknown + classifier → EVENT; `findMappedCategory` + `registerUnknownCategory` в импортёре.
- [ ] **Средний**: Нормализация location/venue (venueId ИЛИ meetingPoint/address; MISSING_LOCATION блокирует publish)
- [ ] **Средний**: Нормализация offers (ACTIVE только для продаваемых, наличие хотя бы одного ACTIVE offer как publish-gate)
- [ ] **Средний**: TEPLOHOD события с открытой датой (OPEN_DATE): в админке задавать диапазон дат для продажи билетов (startDate/endDate или только endDate), делать событие активным для каталога при наличии валидного диапазона.

---

### Acceptance статус фаз 2–9 (2026‑03‑15)

**Легенда вердиктов:**

- **ACCEPT** — можно считать боевым; только регресс‑тесты и эксплуатационный мониторинг.
- **ACCEPT WITH NOTES** — в main держать можно, но есть явно сформулированные follow‑up задачи (обычно по тестам или security/billing).
- **ACCEPT WITH NOTES (high‑risk)** — то же самое, но зона повышенного риска (billing/security), rollout только под контролем.

#### Phase 2 — Supplier Orders + admin links

- **Verdict:** ACCEPT WITH NOTES
- **Notes:**
  - Нет зафиксированных integration‑тестов на `/supplier/orders` и `/supplier/orders/:id`.
  - Нужны негативные сценарии:
    - чужой order detail недоступен (403/404);
    - confirm/reject чужого заказа невозможен (403/404).

#### Phase 3 — Availability / Sessions

- **Verdict:** ACCEPT WITH NOTES
- **Notes:**
  - Базовая защита MANUAL vs synced (read‑only для импортированных событий) сохранена.
  - В этой итерации не вносились регрессии в core‑логику сессий (MANUAL/non‑MANUAL, sold tickets).
  - Новые diagnostics endpoints требуют smoke‑проверки на тестовых данных (eventsWithoutSessions / expiredSessions / zeroCapacitySessions).

#### Phase 4 — Listing Health

- **Verdict:** ACCEPT
- **Notes:**
  - `ListingHealthService` — детерминированный read‑service без side‑effects.
  - Checkout/orders/fulfillment не затрагиваются.
  - Supplier/admin endpoints поверх него безопасны к включению.

#### Phase 5 — Supplier Analytics

- **Verdict:** ACCEPT WITH NOTES
- **Notes:**
  - Нужен отдельный smoke:
    - **data isolation по operatorId** (оператор не видит чужие данные);
    - **KPI consistency** (оборот/количество заказов/occupancy считаются из тех же источников, что и orders/payments);
    - отсутствие leakage чужой аналитики в dashboard/report endpoints.

#### Phase 6 — PromoCode

- **Verdict:** ACCEPT WITH NOTES (high‑risk)
- **Notes:**
  - Если промокоды уже влияют на checkout total — это **risk‑bearing billing change**.
  - До полного боевого включения должны быть доказаны инварианты:
    - нет отрицательного `total` (total ≥ 0);
    - нет двойного применения промокода на один checkout;
    - корректный stacking с gift certificate (скидка не считается дважды);
    - защита от гонок на `usedCount` (concurrency/idempotency);
    - согласованность `total/gross/net/commission` после применения promo.
  - В `main` держать можно при контролируемом rollout (feature‑flag), но считать “полностью боевым” — рано.

#### Phase 7 — Ranking / Merchandising

- **Verdict:** ACCEPT WITH NOTES
- **Notes:**
  - `manualBoost` и `suppressLowQuality` реально **wired** от Prisma до admin UI.
  - `suppress` мягко влияет на каталог и не должен ломать прямой доступ и admin visibility.
  - Нужны проверки:
    - событие с `suppress` исчезает из обычного каталога;
    - по прямой ссылке и в админке событие остаётся доступным (если так задумано);
    - сортировка с учётом `manualBoost` детерминирована.

#### Phase 8 — Integrations / Extension Points

- **Verdict:** ACCEPT
- **Notes:**
  - Extension‑интерфейсы (SyncAdapter/AvailabilityProvider/BookingProvider) — формализация уже существующих точек расширения.
  - Не являются поведенческим рефактором; не добавляют хрупкий “plugin framework ради plugin framework”.

#### Phase 9 — Team / Roles / Support (Invitations & RBAC)

- **Verdict:** ACCEPT WITH NOTES
- **Notes (security‑sensitive):**
  - Обязательно покрыть security‑тестами:
    - `non-OWNER` create invitation → 403;
    - истёкший токен → reject;
    - повторное использование токена → reject;
    - accept invitation создаёт SupplierUser с корректными `operatorId` и `role`;
    - invite token не может быть переиспользован.
  - Пока это не покрыто тестами, invitations/RBAC в `main` считать **условно боевыми**, rollout делать осторожно.

#### Buyer Account V2 (спец‑блок)

- **Verdict:** ACCEPT WITH NOTES
- **Notes:**
  - Уже сделано:
    - `/account/purchases` и capability‑слой `getPurchaseDisplayType` с unit‑тестами;
    - imported/external не превращаются в `INTERNAL_TICKET` просто по факту оплаты;
    - ownership на `/account/orders/:id` реализован;
    - guest `/orders/track` не затронут, проверен сидом.
  - Нужно доделать:
    - выделить `PurchaseReadService`/`PurchaseMapper` как отдельный read‑layer;
    - интеграционные тесты:
      - `/account/purchases` → только свои покупки;
      - `/account/orders/:id` → 403 на чужой заказ;
      - guest track по `shortCode` работает независимо от account.
  - Buyer Account v1 — боевой; Buyer Account v2 — частично реализован (capabilities), требует завершения read‑слоя и e2e‑тестов.

---

## Supplier Trust System (Trust Score + Trust Levels)

- **Приоритет:** Высокий

### ST-1 — Backend Trust Service (SupplierTrustService) ✅

- [x] Рассчитать Trust Score (0–100) по блокам profile/catalog/operations/reputation/stability/penalties.
- [x] Map Trust Score → Trust Level (0–3).
- [x] Лимиты активных событий по уровню (0→5, 1→10, 2→25, 3→50).
- [x] Метод `assertSupplierCanActivateEvent` с ошибкой `SUPPLIER_ACTIVE_EVENTS_LIMIT_REACHED`.
- [x] Юнит‑тесты для mapScoreToLevel, getActiveEventsLimitByTrustLevel, assertSupplierCanActivateEvent.

### ST-2 — Supplier Dashboard API + Trust Block ✅

- [x] `/supplier/dashboard` возвращает блок `trust` (score, level, breakdown, activeEventsLimit, activeEventsCount, nextLevelRequirements).
- [x] Supplier Dashboard (frontend-supplier) отображает уровень доверия, прогресс‑бар и лимит активных событий.
- [x] Settings (frontend-supplier) показывает текущий `trustLevel` и статус верификации.

### ST-3 — Limit Enforcement (Admin + Partner) ✅

- [x] Admin: при `POST /admin/moderation/:id/approve` выполняется проверка `assertSupplierCanActivateEvent` перед установкой isActive=true.
- [x] Partner API: при создании MANUAL‑событий с автоодобрением (trustLevel ≥ 1) проверяется лимит активных событий.
- [x] Ошибка `SUPPLIER_ACTIVE_EVENTS_LIMIT_REACHED` документирована в `SupplierTrustService`.

### ST-4 — Daily Recalculation Job ✅

- [x] `SupplierTrustJob` (Nest Scheduler) пересчитывает trust всех `Operator.isSupplier=true` ежедневно в 03:00.
- [x] AppModule уже содержит `SchedulerModule`, job зарегистрирован в `SupplierModule`.

### ST-5 — Supplier UI (Кабинет поставщика) ✅

- [x] Dashboard: карточка лимита активных событий (текущий счётчик, лимит, прогресс‑бар, текстовые подсказки).
- [x] EventsList (frontend-supplier): баннер‑предупреждение по лимиту (жёлтый при >80%, красный при достижении лимита), текстовое объяснение действий.
- [ ] Events Edit: inline‑подсказки по улучшению каталога и профиля (отложено).

### ST-6 — Admin UI (Список и карточка поставщика) ✅

- [x] SuppliersList: Trust‑бейджи скорректированы под уровни 0–3 (Новый/Базовый/Проверенный/Надёжный).
- [x] SupplierDetail: панель Trust (score/100, разложение по блокам, timestamp последнего пересчёта, индикация ручного override при наличии).
- [x] SupplierDetail: select Trust Level обновлён под уровни 0–3.
- [ ] Полноценный CRUD ручного override (trustManualOverrideLevel/Score/Reason/ExpiresAt) — отдельная задача.

### ST-7 — Docs, Tests, Lint, Merge Checklist ✅

- [x] Обновлён `docs/Project.md` — раздел Supplier Trust System.
- [x] Все backend‑тесты (`npx pnpm test` в `packages/backend`) проходят.
- [x] Линтер на изменённых файлах (backend, frontend-admin, frontend-supplier) без ошибок.
- [ ] Отдельный документ `docs/SupplierTrustSpec.md` с формулами и сценариями — можно добавить позже при усложнении модели.

### P1-Roadmap — Phase 1: Supplier Trust + Operations Foundation (12.03.2026) ✅

- [x] Supplier Notifications Center: `GET /supplier/notifications` — агрегация из Event (модерация), PaymentIntent (продажи), trust (лимит).
- [x] Frontend supplier: Notifications — fetch из API вместо mock; read/hidden — локальный state.
- [x] Moderation priority: `GET /admin/moderation/queue?sortBy=trust_asc` — низкий trust первым.
- [x] Admin ModerationQueuePage: выпадающий список сортировки (по дате / по trust).

**Дальнейшая разработка:** см. [DevelopmentScenario.md](DevelopmentScenario.md) — этапы A (Supplier UX), B (Admin UX), C (регрессия), Phases 2–9.

---

## Roadmap Phases 2–9 (Implementation)

> Архитектура: `archive/specs/RoadmapPhases2-9Architecture.md`. Phase 2–9 ✅ реализованы.

### Phase 2 — Supplier Orders ✅
- [x] SupplierOrdersService: projection OrderRequest by eventOffer.operatorId
- [x] GET/POST /supplier/orders, confirm, reject
- [x] Fix Partner listOrders (eventId in eventIds)
- [x] Supplier: OrdersListPage
- [x] Admin: OrdersList → link CheckoutSession, dispute hint

### Phase 3 — Availability / Sessions ✅
- [x] Supplier: SessionsPage
- [x] Admin: GET /admin/catalog/availability-diagnostics
- [x] Sync-source sessions: read-only guard

### Phase 4 — Listing Health ✅
- [x] ListingHealthService (deterministic)
- [x] GET /supplier/listing-health, /admin/catalog/health
- [x] Supplier: ListingHealthPanel

### Phase 5 — Analytics ✅
- [x] Extend ReportsService
- [x] Supplier Analytics page, Admin reports
- [ ] Pre-aggregation (LATER)

### Phase 6 — Pricing & Promotions ✅
- [x] PromoCode model, PromoCodeService
- [x] Checkout: validate promoCode
- [x] Supplier/Admin: PromoCodes CRUD

### Phase 7 — Ranking ✅
- [x] manualBoost, suppressLowQuality
- [x] Catalog: apply in sort/filter
- [x] Admin: boost/suppress UI

### Phase 8 — Integrations ✅
- [x] SyncAdapter interface (sync-adapter.interface.ts)
- [x] SupplierIntegrationsService + GET /supplier/integrations
- [x] Supplier: страница «Интеграции» (read-only статус TC, Teplohod, Partner, Manual)

### Phase 9 — Team / Roles ✅
- [x] SupplierInvitation model, API
- [x] Invitations CRUD: POST/GET/DELETE /supplier/invitations, accept
- [x] Supplier UI: страница «Команда», приглашение по ссылке /invite/:token
- [ ] RBAC permissions matrix (документация)
- [ ] Support link, audit

---

## Supplier Finance — Phase P3: Legal Profile & Bank Snapshot

- **Приоритет:** Высокий

### 🟦 P3: Legal Profile & Bank Snapshot (сводка)

- [x] **P3-1: Prisma Models** — Сущности созданы.
- [x] **P3-2: Snapshots** — Снапшоты пишутся в Report и PayoutRequest.
- [~] **P3-3: Admin API/UX** — Очередь на верификацию: `GET …/profiles?status=INCOMPLETE`; смена статуса через `PATCH …/status`. Admin UI: вкладка «Финансы и реквизиты» в карточке поставщика реализована. Осталось: запись в metaJson.history при аппруве/отклонении; при необходимости CRUD счетов.
- [x] **P3-4: Supplier API** — API + тесты + gating. Осталось: UI-блок «Реквизиты» на дашборде поставщика.
- [x] **P3-5: Invariants** — Блокировка выплат на стороне поставщика и админа реализована (без VERIFIED — нельзя создать payout; без VERIFIED нельзя перевести выплату в PAID).
- [x] **P3-6: Docs** — Актуализировано.

### 🛠 Tech Debt / Refactoring

- [x] **Zero Errors** — ESLint проходит без ошибок.
- [x] **Zero Warnings** — Целевая зачистка `any` в `account.service` и `supplier.controller` завершена.
- [x] **Strict Typing (Point 9)** — Принят стандарт «No new any». Оставшиеся `any` (4 места) изолированы в `csv-stream.util` и `admin-checkout` под `eslint-disable` с обоснованием.

### Вход в P3 (что уже есть после P1–P2)

- [x] Леджер поставщика (`SupplierLedgerEntry`, `SupplierLedgerService`) — источник истины по движениям.
- [x] P1: `SupplierReport`/`SupplierReportLine` + `SupplierDocument`/`SupplierDocumentFile` и seed‑сценарий.
- [x] P2: `SupplierDispute`, флаг `hasConflict`, `SupplierReconciliationService`, `SupplierFinanceSummaryService`, флаг `isBlockedByDispute` в `SupplierPayoutRequest`, admin/supplier API для споров и summary.
- [x] Документация по финансам обновлена (`finance.md`, записи в `Diary.md` от 15.03.2026).

### P3‑Checklist — Legal Profile & Bank Snapshot

- [x] **P3-1 — Prisma: Legal Profile & Bank Accounts**
  - [x] Модель `SupplierLegalProfile` (1–1 к `Operator`): `legalName`, `legalAddress`, `inn`, `kpp`, `ogrn`, `taxMode`, `vatPercent`, `signerFullName`, `signerPosition`, `financeEmail`, `docsEmail`, `status` (`DRAFT`/`INCOMPLETE`/`VERIFIED`/`REJECTED`).
  - [x] Модель `SupplierBankAccount` (N–1 к `SupplierLegalProfile`): `bankName`, `bik`, `accountNumber`, `correspondentAccount`, `isPrimary`.
  - [x] Миграции применены, `prisma generate` проходит.

- [x] **P3-2 — Snapshot в отчётах и выплатах**
  - [x] `SupplierReport.snapshotJson` содержит вложенный блок `legalProfile` (юридические реквизиты и налоговый режим на момент генерации отчёта).
  - [x] `SupplierPayoutRequest` (либо отдельная snapshot‑структура) хранит `bankAccountSnapshot` с реквизитами счёта на момент создания/проведения payout.
  - [x] При изменении `SupplierLegalProfile`/`SupplierBankAccount` уже созданные отчёты/документы и выплаты продолжают читать данные только из snapshot’ов.

- [~] **P3-3 — Admin API/UX**
  - [x] Admin: `GET /admin/finance/suppliers/profiles` — список профилей с фильтром по статусу (в т.ч. `?status=INCOMPLETE` — очередь на верификацию).
  - [x] Admin: `GET /admin/finance/suppliers/profiles/:operatorId` — деталка профиля со всеми счетами.
  - [x] Admin: `PATCH /admin/finance/suppliers/profiles/:operatorId/status` — смена статуса (VERIFIED с фиксацией verifiedBy/verifiedAt; REJECTED с обязательным comment).
  - [ ] Admin: при PATCH status — запись в metaJson.history (кто из админов аппрувнул/отклонил); при необходимости поле metaJson в SupplierLegalProfile.
  - [ ] Admin: CRUD счетов оператора (PATCH/DELETE банковских счетов) — при необходимости отдельная задача.
  - [x] Admin UI: вкладка «Финансы и реквизиты» в `SupplierDetail` — статус, юр. данные, счета (primary ⭐), история, кнопки Одобрить/Отклонить (модалка с комментарием). Компонент `SupplierLegalProfileView`.

- [x] **P3-4 — Supplier API/UX**
  - [x] Supplier: `GET/PATCH /supplier/profile/legal` — просмотр/редактирование собственных юр. данных (ИНН/КПП/ОГРН, emails); при изменении статус профиля сбрасывается в `INCOMPLETE`.
  - [x] Supplier: `GET/POST /supplier/profile/bank-accounts` — управление своими счетами (создание, переключение primary, без изменения snapshot старых payout’ов).
  - [ ] Supplier Dashboard: блок «Реквизиты» с подсказкой, если профиль не `VERIFIED` или отсутствует primary‑счёт (оставлено на UI-доработку).

- [x] **P3-5 — Инварианты и валидация**
  - [x] Нельзя создать payout, если нет `SupplierLegalProfile` в статусе `VERIFIED` и настроенного primary‑банковского счёта.
  - [x] При смене primary‑счёта новые payouts используют новые реквизиты, старые payout’ы остаются привязаны к своему snapshot.
  - [x] При смене статуса выплаты на PAID в админке проверяется `operator.legalProfile?.status === 'VERIFIED'`; иначе BadRequest.
  - [x] Миграции и код не ломают существующие P1–P2 сценарии (тесты backend проходят).

- [x] **P3-6 — Документация**
  - [x] `finance.md`: раздел P3 обновлён (описание моделей, snapshot‑логики и API).
  - [x] `Project.md`: упоминание P3 в блоке Supplier Finance.
  - [x] `Diary.md`: отдельная запись по завершению P3 с принятыми решениями и найденными проблемами.

### Что дальше: P3.1 — Tax & VAT Layer (надстройка P3)

Самый «бухгалтерский» блок. Рекомендуемый порядок: начать с **P3.1-2 (Tax Matrix)** и юнит-тестов для краевых кейсов расчётов (УСН vs ОСНО, НПД, агентская схема); затем P3.1-1 (расширение профиля), P3.1-3 (нумерация документов), P3.1-4 (payload Счёт/УПД в SupplierDocumentService).

### P3.1‑Checklist

- [ ] **P3.1-1 — Расширение налогового профиля**
  - [ ] Prisma: добавить enum `TaxMode { OSNO, USN_6, USN_15, AUSN, NPD }` и поля `taxMode`, `isVatPayer`, `defaultVatRate` в `SupplierLegalProfile`.
  - [ ] Миграция применена, `prisma generate` проходит.
  - [ ] Snapshot в `SupplierReport.snapshotJson.legalProfile` содержит `taxMode`, `isVatPayer`, `defaultVatRate`.

- [x] **P3.1-2 — Tax Matrix (декларативная логика)**
  - [x] Создан `tax.config.ts` с `TAX_MATRIX: Record<TaxMode, TaxBehavior>` (поведение по режимам, а не if/else по строкам).
  - [x] `TaxBehavior` как минимум описывает: `requiresVat`, `defaultVatRate`, `mainDocumentType`, `needsInvoice`, `needsNpdReceiptLink`.
  - [x] Юнит‑тесты на Tax Matrix для базовых режимов (OSNO, USN, NPD): `tax.config.spec.ts` (22 теста) — ОСНО (выделение НДС, net/vat), УСН (vat 0), НПД (флаг «налог у поставщика»), агентская комиссия до/после налогов, краевые кейсы (нулевая сумма, деление на ноль). Добавлен `tax-calculations.ts` (vatFromGross, commissionFromGross) как единый источник формул.

- [x] **P3.1-3 — Нумерация НДС‑документов**
  - [x] Prisma: модель `DocumentSequence` (operatorId, year, type, lastNumber).
  - [x] Сервис `DocumentNumberService` с методом `nextNumber({ operatorId, year, type })` → строка `ГГГГ-XXXXXX`. Типы: INVOICE, UPD_1, UPD_2, AGENT_REPORT.
  - [x] Вызов `nextNumber` в `SupplierDocumentService.generateDocumentsForReport` при генерации AGENT_REPORT.
  - [x] Юнит‑тесты: `document-number.service.spec.ts` (9 тестов) — формат YYYY-XXXXXX, изоляция по operatorId, смена года (новый год = 000001), независимые последовательности по типу (AGENT_REPORT/INVOICE/UPD_1/UPD_2).

- [~] **P3.1-4 — Заготовка payload НДС‑документов**
  - [x] Выделен `buildVatDocumentPayload` поверх TAX_MATRIX и `tax-calculations`; возвращает totals (netAmount, vatAmount, commissionAmount) и lines.
  - [x] В `SupplierDocumentService.generateDocumentsForReport` payload и snapshot формируются через `buildVatDocumentPayload`; в snapshotJson — честные netAmount, vatAmount, commission по матрице.
  - [x] Формулы НДС и округление в `tax-calculations.ts`, покрыты тестами (tax.config.spec.ts).
  - [ ] Расширение payload для INVOICE/UPD_2 и полей customer/npd при необходимости.
- [~] **P3.1-5 — Документация**
  - [x] `finance.md`: раздел 6.5 «Налоговый слой и документы» — логика buildVatDocumentPayload, нумерация (DocumentNumberService, ГГГГ-XXXXXX, привязка к оператору/году/типу), структура snapshotJson для фронта; таблица TaxMode в 6.2 сохранена.
  - [x] `Diary.md`: запись 15.03.2026 по P3.1 (Tax Matrix, нумерация, payload, customer/npd).
  - [ ] При необходимости: отдельный подраздел с примером payload счёта‑фактуры/УПД в finance.md.


---

## UX Admin Refactor (EH alignment)

- **Приоритет:** Высокий

### UA-1 — AdminLayout + Topbar-каркас `[~]`

- [x] Ввести чёткий layout-слой для админки (оболочка с Sidebar + Topbar + контент).
- [x] Оставить существующий компонент `Layout` как точку входа (для минимального диффа), но выделить в нём:
  - топбар (бургер, хлебные крошки, переключатель темы, профиль/выход),
  - зону для содержимого страниц через `Outlet`.
- [x] Сохранить текущую навигацию и авторизацию без изменений.

### UA-2 — Shared UI кирпичи для админки `[~]`

- [x] Подтвердить наличие базовых shared-компонентов в `@daibilet/shared-ui`:
  - `PageHeader`, `SectionCard`,
  - `EmptyState`, `LoadingState`, `ErrorState`,
  - `FormSection`, `FormGrid`, `FormActions`.
- [ ] Добавить недостающие кирпичи для следующего этапа:
  - `StatCard` — маленькая KPI-карточка (label, value, icon?),
  - (позже) `DataTableShell`, `StatusBadge`, `DetailSlideOver`.
- [ ] Перевести минимум 1–2 экрана (Dashboard, Settings) на использование `PageHeader`/`SectionCard` из shared-ui.

### UA-3 — Admin Dashboard как операционный центр `[ ]`

- [ ] Пересобрать `/` в полноценный dashboard:
  - 4–6 `StatCard` с KPI (активные события, заказы сегодня, выручка, новые отзывы, события на модерации).
  - блок «Требует внимания» (проблемные события/отзывы),
  - блок активности поставщиков (top N).
- [ ] Использовать только существующие backend endpoints.

### UA-4 — Единый list-паттерн (на примере Events) `[ ]`

- [ ] Привести `EventsListPage` к шаблону:
  - `PageHeader` (title/subtitle/actions),
  - `FilterBar` (поиск, статус, город, поставщик),
  - `DataTableShell` (таблица с `StatusBadge` и warnings),
  - `EmptyState`/`LoadingState`/`ErrorState`.

### UA-5 — Распространение list-паттерна на Suppliers/Venues/Cities/Tags `[ ]`

- [ ] Применить тот же шаблон к:
  - `SuppliersListPage`,
  - `VenuesListPage`,
  - `CitiesListPage`,
  - `TagsListPage`.

### UA-6 — Операционные экраны (Moderation, Orders, Reviews) `[ ]`

- [ ] Привести `ModerationQueuePage`, `OrdersListPage`, `ReviewsListPage` к одному UX-паттерну:
  - `PageHeader`, `FilterBar`, `DataTableShell`, единые пустые/ошибочные состояния.
  - Для деталей — `DetailSlideOver` или единообразный detail-экран на базе `SectionCard`.

### UA-7 — Settings как вкладочные формы `[ ]`

- [ ] Превратить `SettingsPage` в много вкладочный экран:
  - Tabs: `General`, `SEO`, `Marketing`, `Integrations` (MVP можно сделать заглушками).
  - Внутри вкладок использовать `FormSection`, `FormGrid`, `FormActions`.

### UA-8 — Supplier Cabinet: выравнивание с admin-паттернами `[ ]`

- [ ] Sidebar ЛК поставщика: `Dashboard`, `Мои события`, `Отзывы`, `Уведомления`, `Отчёты`, `Настройки`.
- [ ] Использовать те же shared-компоненты (`PageHeader`, `SectionCard`, `Empty/Loading/Error`) в поставщицком кабинете.

### Контент-операции админки (FEATURE 7–10) ✅

> Ownership полей и риски зафиксированы в `docs/archive/PR-C0-C7-Final.md` §9. Реализовано 06.03.2026.

- [x] **FEATURE 7** — Quick view: пометки ownership [S]/[L] в EventQuickViewDrawer (заголовок, категория, SEO-блок)
- [x] **FEATURE 9** — Quality score: в issues добавлено поле ownership (source/local), отображается в QualityBanner
- [x] **FEATURE 10** — Inline edit: переключатель «Скрыть/Показать в каталоге» в списке событий и в Quick view (PATCH /admin/events/:id/hide)
- [x] **FEATURE 8** — Drag sorting: галерея в VenueEdit с перетаскиванием (HTML5 DnD), подсказка «local-owned»
- [x] **Supplier RBAC Management** — PATCH `/admin/suppliers/:supplierId/users/:userId/role` + select в `SupplierDetailPage`, защита кода ошибки `LAST_OWNER_PROTECTION`

### Promo-блоки главной (админка)

> Спецификация: `archive/specs/PromoBlocksSpec.md`. v2: PromoCollection, PromoCollectionItem, PromoCollectionRule, resolver.

- [x] **Средний**: Backend — модель `PromoBlock` + PromoBlockEvent, PromoBlockVenue + CRUD `/admin/promo-blocks` ✅
- [x] **Средний**: Публичный API `GET /api/v1/promo-blocks` — активные по датам, сортировка priority/sortOrder ✅
- [x] **Средний**: Admin UI — раздел «Промо-блоки», список, create/edit (периоды, иконка LIBRARY|SVG, фон SOLID|GRADIENT) ✅
- [x] **Низкий**: Frontend — загрузка из API, fallback только при сетевой ошибке, SSR на главной ✅
- [x] **Средний**: Promo Blocks v2 — PromoCollection, PromoCollectionItem, PromoCollectionRule, PromoCollectionResolverService ✅
- [x] **Средний**: Admin CRUD `/admin/promo-collections`, items, rule, preview ✅
- [x] **Средний**: Public `GET /api/v1/promo-blocks/:slug/items` ✅
- [x] **Средний**: Admin UI — Promo Collections (список, create/edit), manual items (поиск+add/remove), auto rule форма, preview ✅
- [x] **Средний**: PromoBlock form — contentMode (LINK_ONLY | COLLECTION), collectionId ✅
- [x] **Средний**: Promo Blocks v2.5 — targetCitySlugs, city targeting (GET /api/v1/promo-blocks?city=), публичная страница /promo/:slug ✅
- [x] **Средний**: Collection-based blocks href → /promo/{slug}, убран fallback /events ✅
- [x] **Средний**: Admin UI — targetCitySlugs (comma-separated) в форме PromoBlock, колонка «Города» в списке ✅
- [x] **Высокий**: Promo Blocks hardening — runtime validation, пустые COLLECTION, normalizePromoPeriod (startsAt/endsAt) ✅
- [ ] **Отложено**: MANUAL EVENTS — ручная привязка событий (реализовано через PromoCollectionItem)
- [ ] **Отложено**: MANUAL VENUES — ручная привязка мест (реализовано через PromoCollectionItem)
- [ ] **Отложено**: AUTO — автоподбор по правилам (реализовано через PromoCollectionRule)

## После запуска / 6+ мес

- [ ] CI/CD: GitHub Actions
- [ ] gRPC: фильтры Cities/Venues
- [ ] Web Vitals: LCP, CLS
- [ ] Planner MVP, ML-рекомендации

---

## Бэклог

Детали — см. Gates выше и `archive/specs/`.

---

## YooKassa — PaymentMode & Agent Scheme (подготовка к split)

- [ ] **YK-1 — Настройки режима платежей (Operator)**
  - [ ] Prisma: добавить в `Operator` (или отдельную `OperatorPaymentSettings`) поля:
    - `paymentMode` (`SINGLE_MERCHANT` / `AGENT_SINGLE_PAYOUT` / `SPLIT_MERCHANT`),
    - `agentSchemeEnabled Boolean @default(false)`,
    - `splitEnabled Boolean @default(false)`.
  - [ ] Миграция применена, `prisma generate` проходит.

- [ ] **YK-2 — Admin UI: Supplier Payment Settings**
  - [ ] Backend: `GET/PUT /admin/suppliers/:id/payment-settings` (чтение/редактирование только из админки).
  - [ ] Frontend admin: вкладка/секция «Финансы / Платежи» на `SupplierDetail`:
    - выпадающий список `paymentMode`,
    - чекбоксы `agentSchemeEnabled`, `splitEnabled`,
    - подсказки по режимам (краткое описание поведения).

- [ ] **YK-3 — Supplier read-only view**
  - [ ] Backend: `GET /supplier/finance/settings` — только чтение payment‑настроек оператора (без права менять).
  - [ ] Frontend supplier: блок на `Dashboard` или `Settings → Финансы`:
    - текстовое отображение схемы («Деньги на счёт платформы», «Агентская схема», «Подготовка к split‑платежам»),
    - пометка, что настройки управляются админкой Daibilet.

- [ ] **YK-4 — Docs**
  - [ ] `finance.md`: раздел о YooKassa дополнен описанием `paymentMode` и agent‑scheme (что меняется в чеке и деньгах).
  - [ ] `Diary.md`: запись о введении PaymentMode/agentScheme как подготовке к split‑платежам.

---

## Gate — Supplier Reports Acceptance & Disputes

- [ ] **ACC-1 — Prisma миграции**
  - [ ] Добавить в `SupplierReport` поля `supplierAcceptedAt` и `acceptedBySupplierUserId`.
  - [ ] При необходимости расширить enum’ы типов леджера/строк отчёта (`CHARGEBACK_ADJUSTMENT`, `FEE_RECHARGE`).
  - [ ] Прогнать `prisma migrate dev` и убедиться, что `prisma generate` проходит без ошибок.

- [ ] **ACC-2 — Backend / API**
  - [ ] `POST /supplier/finance/reports/:id/accept`:
    - проверяет, что отчёт принадлежит текущему оператору и что нет открытого `SupplierDispute` (`OPEN`/`UNDER_REVIEW`),
    - при успехе проставляет `supplierAcceptedAt`/`acceptedBySupplierUserId` и добавляет запись в `metaJson.history`.
  - [ ] Поведение при открытии спора после акцепта: отчёт считается `DISPUTED`, дата акцепта сохраняется только в истории.

- [ ] **ACC-3 — History / фронтенд‑совместимость**
  - [ ] Формат `SupplierReport.metaJson.history` задокументирован в `finance.md` (массив `{ status, changedAt, changedByUserId, changedByRole, comment? }`).
  - [ ] Фронтенд может отобразить историю отчёта как простой timeline без дополнительной обработки.

- [ ] **ACC-4 — Docs**
  - [ ] `finance.md`: раздел P2 дополнен подпунктами Acceptance Flow и History (edge‑кейсы, блокировка акцепта при споре).
  - [ ] `Architecture.md`: описан контракт `POST /supplier/finance/reports/:id/accept` и связь со спорами/историей.

---

## Gate — Content / PageTemplateSpecs (C-Gate)

Связан с Phase 4 (Listing Health). Приоритет: **Средний**.

- [ ] **C-1 — Admin: поля шаблонов и политики возврата**
  - [ ] В админ-формах Event и Venue добавить поля:
    - `contentTemplateData` (Event), `venueTemplateData` (Venue) — JSON, редактируемый (textarea или JSON-редактор).
    - `refundPolicy` — текст/ссылка, где применимо.
  - [ ] Сохранение через существующие API create/update без изменения контрактов.

- [ ] **C-2 — Валидация JSON при create/update**
  - [ ] При создании/обновлении Event применять `parseEventContentTemplateData` (полная валидация JSON).
  - [ ] При создании/обновлении Venue применять `parseVenueTemplateData` (полная валидация JSON).
  - [ ] При невалидном JSON возвращать 400 с понятным сообщением.

- [ ] **C-3 — ageLimit / minAge**
  - [ ] Зафиксировать в коде и документации: возрастное ограничение = `Event.minAge` (единый источник истины, без дублирования поля `ageLimit`).

- [ ] **C-4 — Docs (опционально)**
  - [ ] В `Project.md` или `Architecture.md` — одна секция/подпункт про Content Gate (PageTemplateSpecs, валидация шаблонов в админке).
