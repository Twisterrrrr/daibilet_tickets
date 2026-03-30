# Tasktracker — Агрегатор билетов + Trip Planner

> **Структура (25.03.2026):** сверху — **только незакрытые** задачи по логическим группам; внизу — **архив закрытых** эпиков и справочные разделы. См. также `Reference.md`, `Operations.md`, `Diary.md`.

---

## Открытые задачи (активный бэклог)

### Каталог, согласованность, данные

| ID / якорь | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `catalog-consistency-snapshot` | (Опц.) фоновый пересчёт / snapshot-таблица для `GET /admin/catalog/consistency` | Низкий | `[ ]` |
| `legacy-classification-fix` | Приведение legacy-событий к новой модели (скрипты reclassify / backfill — отдельный план) | Средний | `[ ]` |
| `G-data-cleanup` | Программа G: trim links и legacy-classification — см. Epic G в архиве | Низкий | `[~]` |

### Наблюдаемость и ops (D-follow-up)

| ID | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `ops-health-unify` | Свести `GET /admin/ops/health` к одному handler / одному source of truth | Средний | `[ ]` |
| `structured-logging-rollout` | Довести оставшиеся legacy-текстовые логи до JSON structured format | Средний | `[ ]` |
| `consistency-budget-tuning` | Подкрутить budget/TTL по прод-метрикам после прогрева кэша consistency | Низкий | `[ ]` |

### Безопасность и аудит (E-follow-up)

| ID | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `rbac-enforcement-audit` | Сводка по admin/supplier в матрицах; полный ручной проход по мере изменений | Критический | `[~]` |
| `supplier-mutation-role-hardening` (**E.1**) | Мутации supplier API с явным `@SupplierRoles` (confirm/reject, settings, finance и т.д.) | Критический | `[ ]` |
| `audit-log-actor-role` (**E.2**) | Prisma: `AuditLog.actorRole`; interceptor / `AuditService` | Высокий | `[ ]` |

### Gates — оставшиеся пункты

**Gate 1**

- [ ] **Средний:** SQL-отчёт по категоризации (аудит качества каталога).
- [ ] **Критический:** Gate **1b** — включить YooKassa в prod (`PAYMENT_PROVIDER=YOOKASSA`, ключи, smoke).

**Gate 2.x**

- [ ] **Низкий:** Динамический блок «Популярные направления» на странице города (`getTopTagsByCity` / `getTopCollectionsByCity`). См. `docs/archive/PopularDirectionsBlueprint.md` §4.

**Gate 3 — контент / SEO (минимум для индексации)**

- [ ] **Критический:** SEO-описания для всех городов (уникальные).
- [ ] **Критический:** SEO-описания для ТОП-10 площадок (venues).
- [ ] **Высокий:** Тематические лендинги (ночные экскурсии, музеи с детьми и т.д.).
- [ ] **Средний:** Контентный план — 30 статей (ArticlePlanner).
- [ ] **Средний** (3+ мес): Детальная страница venue «Музеи» — режим, галерея, выставки (`Reference.md` §1).
- [ ] **Средний:** Нормализация location/venue (venueId или meetingPoint/address; `MISSING_LOCATION` блокирует publish).
- [ ] **Средний:** Нормализация offers (ACTIVE только для продаваемых; хотя бы один ACTIVE offer в publish-gate).
- [ ] **Средний:** TEPLOHOD OPEN_DATE — в админке диапазон дат продажи, активность каталога при валидном диапазоне.

**Прочее по Gates (в работе / долг)**

- [~] **Средний:** Нормализация категорий/аудиторий после импорта (TC/TEP → EventCategory); TEPLOHOD E2E готов, остаток — по данным.
- См. также **приоритеты продукта** и **6+ мес** в архиве ниже.

### Supplier Trust — хвост после ST-1…ST-4

- [ ] **ST-5:** Events Edit — inline-подсказки по улучшению каталога и профиля (отложено).
- [ ] **ST-6:** Полноценный CRUD для полей **`trustManual*`** на Operator (отдельно от таблицы **`SupplierTrustOverride`**, реализованной 25.03.2026).
- [ ] **ST-7:** Отдельный документ `docs/SupplierTrustSpec.md` (формулы, сценарии) — по мере усложнения модели.

### UX Admin (UA)

- [x] **MEDIA-1 — Cloudinary + единый upload UX (admin/supplier):** эндпоинты `*/media/images`, shared-ui галерея/обложка, интеграция EventWizard и VenueEdit — см. `docs/media-upload.md` (**24.03.2026**).
- [x] ~~`(позже) DataTableShell, StatusBadge`~~ — используются в list-паттернах (в т.ч. поставщики/события поставщика); пункт снят как выполненный **25.03.2026**.
- Прочие UA-1…UA-8 — **закрыты**; см. архив.
- [x] **Template-driven Venue PDP (MUSEUM / ART_SPACE):**
  - `venueTemplateData` подключен в public DTO;
  - template sections используются в `VenuePageView`;
  - `eventsCopy` (`title`/`intro`) прокинут в `VenueProgramSection`;
  - fallback: template -> legacy -> hidden.
  - **Acceptance:** venue MUSEUM/ART_SPACE с template рендерит кастомные заголовок+intro блока программы; venue без template отображается как раньше без регрессий.

### Медиа (follow-up)

- [ ] **MEDIA-2:** нормализованная таблица `MediaAsset` / связи с сущностями (после стабилизации MVP).
- [ ] **MEDIA-3:** интеграция upload в Article/Collection/Tag hero без ручного URL.
- [ ] **MEDIA-4:** фоновая очистка orphan assets в Cloudinary.

### Долгий горизонт (6+ мес)

- [ ] gRPC: фильтры Cities/Venues.
- [ ] Web Vitals: LCP, CLS.
- [ ] Planner MVP, ML-рекомендации.

### Риски из приёмки фаз (follow-up по тестам)

См. блок **«Acceptance статус фаз 2–9»** в архиве ниже: интеграционные тесты supplier orders, smoke diagnostics sessions, PromoCode high-risk инварианты, ranking checks, Buyer Account v2 read-layer — зафиксированы как заметки, не дублируются здесь построчно.

### Smoke-check — блок «Программа площадки» на Venue (ручная приёмка)

> Реализация: `GET /venues/:slug/program`, UI `VenueProgramSection` (+ карточки, архив). Классификация `current/upcoming/past` покрыта unit-тестами `packages/backend/src/venue/__tests__/venue-program.logic.spec.ts`. Ниже — что проверить руками на витрине и в каталоге.

| Сценарий | Как подготовить (кратко) | Ожидание на `/venues/:slug` |
|----------|---------------------------|-------------------------------|
| **0 выставок** | У площадки нет `Event` с `subcategories` ⊃ `EXHIBITION`, `venueId`, публикацией как в каталоге | Секция программы **не рендерится** (нет блока «Выставки…»). Страница без ошибки. |
| **1 текущая** | Одна выставка в окне `CURRENT` | Один **hero** (`VenueFeaturedExhibitionCard`), **без** сетки из одной второй карточки как «secondary». |
| **2–3 текущие** | 2–3 в `CURRENT` после сортировки | Hero + **secondary** (компактные карточки). |
| **4+ текущих/будущих** (суммарно активное будущее) | ≥4 в `current` или много `upcoming` | Hero + ограниченные secondary/upcoming; есть **«Смотреть все выставки площадки»** при `current+upcoming ≥ 4`. |
| **Только upcoming** | Нет `current`, есть `upcoming` | Нет hero-блока текущих; секция **«Скоро откроются»**; до 3 карточек + «Все предстоящие» при большем числе. |
| **Только past** | Нет `current`/`upcoming`, есть `past` | Компактный empty-state «нет активных» + **аккордеон** прошедших. |
| **current + upcoming** | Смесь | Сначала блок текущих (hero + secondary), затем «Скоро откроются». |
| **Скрыто / не опубликовано** | У события `override.isHidden`, или `editorStatus` ≠ `PUBLISHED`, или `showInVenueProgram: false` | Событие **не попадает** в ответ программы; страница площадки без 500. |
| **Черновик / дубль** | `moderationStatus` не `APPROVED`, или `canonicalOfId` задан | Не в программе (те же правила, что у публичного каталога по базовому фильтру). |

**Каталог (CTA):** по ссылке «Смотреть все…» открывается `/events?city=…&venueId=…&category=MUSEUM&subcategory=EXHIBITION`; запрос уходит в **`/events` (getEvents)**, не в смешанный museum-catalog, если в URL есть `venueId` или `subcategory`.

**Чеклист быстрого прогона:** `[ ]` 0 выставок → `[ ]` 1 current → `[ ]` 2 current → `[ ]` 5+ current → `[ ]` only upcoming → `[ ]` only past → `[ ]` mixed + скрытая выставка не видна.

---

## Архив: закрытые эпики и итерации

> Ниже — **выполненные** треки. Актуальный бэклог — только в секции **«Открытые задачи»** выше.

### Сводка по крупным закрытым блокам (2025–2026)

| Блок | Статус |
|------|--------|
| Venue PDP template-driven | ✅ 24.03.2026 |
| Unified Subcategories Rollout | ✅ |
| Epic 1 — Catalog classification | ✅ |
| Epic 2 — Eligibility & diagnostics | ✅ |
| Post-Classification C1 (read-path) | ✅ |
| EPIC C2 consistency (кроме optional snapshot) | ✅ |
| EPIC D Step D + **D-preagg batch 25.03** (analytics preagg, trust override API/UI, p95 metrics) | ✅ |
| EPIC E Step E (RBAC baseline) | ✅ (хвост E.1/E.2 — в открытых) |
| EPIC F Docs alignment | ✅ |
| STEP B.1 Build hygiene | ✅ |
| Ticket PDF Puppeteer MVP | ✅ |
| Task 10 Admin Intelligence A–C | ✅ |
| Tags 3 Sprint | ✅ |
| Collections + Landings rollout & hardening | ✅ |
| Лендинги: хабы river-cruises / bus-tours, салют 9 мая, shared MSK-даты, табы сортировки FilterBar | ✅ 30.03.2026 |
| FULL TECH DEBT волны A/B/C | ✅ 24.03.2026 |
| Supplier Trust ST-1…ST-4, ST-7 частично | ✅ |
| P3 / P3.1 Legal & Tax layer | ✅ |
| YooKassa PaymentMode P3.2+ | ✅ |
| Supplier Reports ACC | ✅ |
| C-Gate Content / PageTemplateSpecs | ✅ |
| EDO Foundation P4 | ✅ см. Part I внизу |
| Phases 2–5 Orders/Availability/Listing Health/Витрина | ✅ |
| Support Chat (site) + Support Inbox PWA (admin) | ✅ 25.03.2026 |
| **Часть I — Закрытые задачи (расширенная история)** | см. раздел ниже |

### EPIC D — закрытые строки (справочно)

| ID | Задача | Статус |
|--------|-----------|--------|
| `AN-1-analytics-tabs` | sinceDays, Redis cache, slow queries, latency | `[x]` |
| `observability-expansion-core` | metrics, byMetric, diagnostics | `[x]` |
| `analytics-query-optimization` | тяжёлые агрегаты: preagg + индексы (25.03) | `[x]` |
| `observability-metrics`, `request-id-logging`, `pii-masking`, `incident-diagnostics` | | `[x]` |

**D-preagg (25.03.2026):** `DailyEventStats`, очередь `analytics-preagg`, `AnalyticsService`, `analytics.query.duration`, индексы; **Trust:** `SupplierTrustOverride`, effective score, ListingHealth blend, админ UI.

### EPIC C2 — закрыто (кроме snapshot)

| ID | Статус |
|--------|--------|
| `catalog-consistency-endpoint`, `-perf`, `-cache` | `[x]` |
| `catalog-consistency-snapshot` | открыто → см. открытые задачи |

### EPIC G — Data cleanup

| ID | Статус |
|--------|--------|
| `subcategory-overflow-cleanup` | `[x]` |
| `legacy-classification-fix` | открыто |

### EPIC C1 — Read-path Compatibility

Все пункты `tag-page-parity`, `buildEventWhere-parity`, `promo-widget-audit`, `legacy-tag-fallback` — **`[x]`** (24.03.2026).

---

## Merge checklist (перед merge в main)

| Гейт | Команда | Ожидание |
|------|--------|----------|
| TypeScript | `cd packages/backend && npx tsc --noEmit` | PASS |
| Lint | `cd packages/backend && npm run lint` | PASS |
| Тесты | `pnpm --filter @daibilet/backend test` | PASS или зафиксировано в CI |

---

## Легенда

- **Приоритет:** Критический / Высокий / Средний / Низкий  
- **Статус:** `[ ]` не начато, `[~]` в работе, `[x]` выполнено, `[-]` отменено  
- **Отложено 6+ мес:** `(⏸ 6+ мес)` — см. открытый блок «Долгий горизонт»

---

# Часть I — Расширенный архив выполненного

> Исторические детали, волны разработки и закрытые Gates. При конфликте с секцией **«Открытые задачи»** приоритет у верхней секции.

## P4 EDO Foundation (19.03.2026) ✅

- **Prisma:** SupplierEdoProfile, EdoDelivery, EdoProviderType (NOOP, DIADOK), EdoDeliveryStatus. Миграция `edo_p4_foundation`.
- **Backend:** EdoModule, EdoProvider interface, NoopEdoProvider, EdoProviderRegistry, EdoProfileService, EdoDeliveryService.
- **Admin API:** GET/PUT /admin/suppliers/:id/edo-profile, GET /admin/documents/:id/edo-deliveries, POST send-to-edo, POST edo-deliveries/:id/refresh, retry.
- **ENV:** EDO_ENABLED, EDO_PROVIDER, EDO_API_KEY, EDO_BOX_ID. Stub-режим (NOOP) — без реальной отправки.
- **Тесты:** edo-profile, noop-edo, edo-delivery, edo-provider.registry (19 unit-тестов).
- **Документация:** finance.md, EDO-Implementation-Plan.md обновлены.

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
- [x] **19.03.2026** Бейдж «Возможный дубль» в EventEdit при событии-кандидате на дедупликацию (ссылка на /events/merge).

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
| 8 | Лендинг salyut | getPrice `price ?? amount`; тесты `collection.service.spec` (salyut); см. Gate 1 | ✅ |
| 9 | Типизация any | «Ни одного нового any» | — |
| 10 | Кэш и инвалидация | CacheInvalidationService | ✅ |
| 11 | GiftCertificate в checkout | Поле «Ввести код» + валидация; произвольная сумма при покупке | ✅ |
| 12 | Избранное → аккаунт | Оставить localStorage | — |
| 13 | Аудит категоризации | SQL-отчёт | — |

---

# Часть II — Справочник: Gates (история и закрытые чеклисты)

> Раздел **«Открытые задачи»** в начале файла содержит актуальные `[ ]`. Ниже — полные чеклисты Gate 0–3 и смежных блоков для аудита; **закрытые** пункты помечены `[x]`.

## Приоритеты продукта (выполнено / не в бэклоге верха)

1. **Полный контур поставщика** — замкнуть цикл: регистрация → события → заказы → оплата → выплаты. ✅ по основному контуру.
2. **YooKassa / платежи** — Gate 1 код готов; prod smoke — см. открытые задачи (Gate 1b).
3. **Базовый контент** — SEO-описания городов/площадок, ТОП-лендинги — см. Gate 3 в открытых.
4. ~~**Деплой на prod** — Gate 0b~~ **выполнено** (DNS, SSL, бэкапы, CI/CD).

**Отложено 6+ мес:** Planner, Unified Checkout, ML, PWA, gRPC — см. открытый блок.

---

### Gate 0 — проект доступен по доменам + есть бэкап ✅

> Gate 0a + 0b закрыты. Команды: `bash scripts/close-gate0.sh` (0a) и `bash scripts/close-gate0.sh --prod` (0b).

### Gate 1 — принимаем платежи end-to-end (код готов; prod — см. открытые)

- Чеклист кода YooKassa, webhooks, sandbox — **[x]** в репозитории.
- Открытые: SQL-отчёт категоризации, **Gate 1b** prod YooKassa — вверху файла.

### Buyer Account / ЛК покупателя (MVP) ✅

- Основной чеклист Buyer Account, purchases, profile, ownership — **[x]**.
- Детали и тестовые сценарии PDP — **[x]** (см. исторические записи в этом файле до рефакторинга).

### Gate 2 — ежедневные ops в админке ✅

### Gate 2.x — Популярные направления ✅ (кроме динамического блока на city page)

- Открытый пункт — **только** динамический блок ТОП тем/подборок по городу — см. открытые задачи.

### Gate 2.5 — админка событий ✅

### Gate 3 — контент/SEO — открытые пункты вверху файла

---

### Acceptance статус фаз 2–9 (2026‑03‑15)

См. заметки в секции **«Риски из приёмки фаз»** в **открытых задачах**; полный текст вердиктов ACCEPT / ACCEPT WITH NOTES сохранён в истории репозитория и при необходимости восстанавливается из коммита до 25.03.2026.

---

## Supplier Trust System (ST-1…ST-4, ST-6 partial) — закрытое

- ST-1…ST-4, ST-6 (list/detail UI), ST-7 частично — ✅.
- **25.03.2026:** админский **trust override** (таблица `SupplierTrustOverride`, API, ListingHealth, UI) — ✅; отдельный хвост по **`trustManual*`** CRUD — в открытых (ST-6).

---

## Roadmap Phases 2–9 (Implementation) ✅

> Phase 2–9 реализованы. **Pre-aggregation** analytics — закрыто в **D-preagg 25.03** (блок EPIC D в архиве).

---

## Supplier Finance — P3, P3.1, Settlement demo ✅

- P3, P3.1 Tax Matrix, документы, Settlement Foundation Stage 1 — ✅ (см. `finance.md`).
- **29.03.2026 — Печатные формы (MVP+):** HTML + `finance-print-styles`, шаблоны по структуре ПП № 1137 (ред. 1096) для УПД и счёт-фактуры, типовые счёт и акт, `finance-document-form-boilerplate.ts`, Puppeteer PDF, `finance-document-validation`, GET html/pdf (supplier/admin), скрипт `finance:print-samples` → `docs/finance-print-samples/`. **Остаётся:** детализация строк отчёта агента из заказов; отдельный `SupplierDocumentFileKind` для превью HTML; UI кнопок в ЛК; при необходимости — колонки прослеживаемости/ОКПД2 в payload.


---

## UX Admin Refactor (UA-1…UA-8) ✅

- Layout, Dashboard, list-паттерн Events/Suppliers/Venues/Cities/Tags, Moderation/Orders/Reviews, Settings tabs, AN-1 — ✅.
- **DataTableShell / StatusBadge** — внедрены в ключевых списках; уточнение 25.03.2026.

---

## Promo-блоки, контент-операции FEATURE 7–10, Supplier RBAC в админке ✅

---

## YooKassa — PaymentMode & Agent Scheme ✅ (P3.2+)

---

## Бэклог

Детали открытых задач — в **начале файла**. Исторические спеки — `archive/specs/`.
