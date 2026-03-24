# Tasktracker — Агрегатор билетов + Trip Planner

> 2026-03-12. См. `Reference.md`, `Operations.md`.

---

## Venue PDP — template-driven публичный рендер (24.03.2026)

| ID | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `venue-pdp-public-template-contract` | Нормализованный блок `VenueDetail.template` в публичном ответе (`buildVenuePublicDto`), parse через `parseVenueTemplateData` | Высокий | `[x]` |
| `venue-pdp-frontend-sections` | Helper `buildVenueTemplateSections` + интеграция в `VenuePageView` (hero, gallery, часы, коллекции/экспозиция, accessibility, FAQ, copy для блока событий) | Высокий | `[x]` |
| `venue-pdp-fallback-rules` | Единый fallback template → legacy → скрытие пустых секций | Критический | `[x]` |
| `venue-pdp-seo-copy` | Template-aware источник для meta `description` в `venues/[slug]/page.tsx` без ломки JSON-LD | Средний | `[x]` |
| `venue-pdp-tests` | Vitest: normalize, fallback, priority, type gating, empty sections | Высокий | `[x]` |

Код: `packages/backend/src/venue/venue.service.ts`, `packages/shared/src/index.ts`, `packages/frontend/src/lib/venues/buildVenueTemplateSections.ts`, `VenuePageView`, `app/venues/[slug]/page.tsx`, `packages/backend/src/venue/__tests__/venue-template-public.contract.spec.ts`. Документация: `Project.md`, эта запись.

---

## Unified Subcategories Rollout (24.03.2026)

| ID | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `schema-subcategory-core` | Спроектировать и добавить в Prisma сущность Subcategory + связи Event/Venue (M:N), подготовить миграцию | Критический | `[x]` |
| `seed-master-list` | Импортировать master-список подкатегорий в seed с type, parent, landing whitelist, sortOrder | Высокий | `[x]` |
| `backend-subcategory-api` | Добавить backend API для чтения справочника и сохранения подкатегорий у Event/Venue с лимитом 5 | Критический | `[x]` |
| `eventedit-migrate-ui` | Перевести EventEdit с SUBCATEGORY_OPTIONS на API-справочник, добавить UX-ограничения выбора | Высокий | `[x]` |
| `venueedit-add-ui` | Добавить выбор подкатегорий в VenueEdit на базе того же API | Высокий | `[x]` |
| `format-mapping-backfill` | Реализовать mapping FORMAT->subcategory и backfill-скрипт с dry-run/логом | Критический | `[x]` |
| `subcategory-read-write-core` | Policy-service (дерево/циклы/типы/лимиты), Admin CRUD/tree/activation, идемпотентный batch-replace links, единый контракт new-first/legacy-fallback в сервисах чтения | Критический | `[x]` |
| `catalog-collections-landing-switch` | Перевести фильтры catalog/collections/landings на новые subcategories с fallback на legacy | Высокий | `[x]` |
| `deprecate-format-tags` | Скрыть категорию Формат из UI создания и перевести в staged deprecate | Средний | `[x]` |
| `tests-and-rollout` | Добавить тесты совместимости и включить rollout по этапам с проверкой регрессий | Высокий | `[x]` |

---

## Ticket PDF (Puppeteer MVP) (24.03.2026)

| ID | Задача | Приоритет | Статус |
|--------|-----------|-----------|--------|
| `ticket-pdf-puppeteer-mvp` | Встроить генерацию PDF-билета через Puppeteer в voucher flow (template + renderer + mapper + service), добавить admin debug endpoint и env/runtime настройки | Критический | `[x]` |
| `ticket-pdf-tests` | Добавить unit/smoke тесты на renderer/mapper/service без хрупких snapshot-проверок | Высокий | `[x]` |
| `ticket-pdf-docs` | Обновить Project/Operations и env-примеры по запуску, проверке endpoint и Docker Chromium нюансам | Высокий | `[x]` |

---

## Task 10 — Admin Intelligence (витрина)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Phase A: `GET /admin/events/:id/summary`, панель на EventEdit, age/KIDS в quality | Высокий | `[x]` |
| Phase B: venue health + связанные события (`VenueEdit`) | Высокий | `[x]` |
| Phase C: визуальный редактор контент-блоков PDP + preview | Средний | `[x]` |

См. `docs/archive/Task10-Admin-Intelligence-Audit.md` (**§8** — принятие Phase A, бэклог A.1, порядок B/C). **Phase B (детально):** `docs/archive/Task10-PhaseB-Venue-Spec.md`. **Phase C (scope C1/C2):** `docs/archive/Task10-PhaseC-Content-Blocks-Spec.md`.

---

## Tags Program — 3 Sprint Closure (23.03.2026)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Sprint 1: Real DB rollout finalization (`db:migrate:prod` + `migrate:legacy-tags` + `verify:tags-post-migration` + rollout artifact) | Критический | `[x]` |
| Sprint 2: Import lifecycle hardening (`MANUAL_ADMIN/IMPORT_MAPPED/AUTO_RULE`, suppression, manual survives sync) | Высокий | `[x]` |
| Sprint 3: Final Lovable UI parity pass (checklist, table density, hover/selected, shell/list/detail rhythm) | Средний | `[x]` |

Runbook: `docs/rollout-tags-runbook.md`  
Execution plan: `docs/archive/Tags-3-Sprint-Plan.md`

Итог UI parity: `docs/UX-Parity-Backlog.md` (CRITICAL/HIGH/MEDIUM закрыты).
Manual `h1` cleanup вне scope: `[x]` завершён (admin + supplier auth/reviews; остаток `manual <h1>` = 0).

---

## Collections + Landings Rollout (23.03.2026)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Phase 1: Model + selection service + suggestions workflow + admin queue | Критический | `[x]` |
| Phase 2: Editors + catalog endpoints + showInCollections integration | Высокий | `[x]` |
| Phase 3: Landing templates bridge + ranking presets + docs | Средний | `[x]` |

Архитектура: `docs/Collections-Architecture.md`, `docs/Landings-Architecture.md`.

---

## Collections + Landings Hardening (Focused)

> Контекст: работаем в существующей модели Collections/Landings, без смены доменной модели; цель — убрать техдолг и довести UX/стабильность до production-grade.

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Phase 1: Landing editor без JSON textarea (`LandingContent.blocks`, typed blocks, dnd, inline validation, migration `jsonToBlocksMigration`) | Критический | `[x]` |
| Phase 2: Collection preview UX v2 (`sort/page/pageSize/debugScore`, compare before/after diff, catalog-like preview cards) | Высокий | `[x]` |
| Phase 3: Status workflow hardening (state machine, transition guards, audit history) | Высокий | `[x]` |
| Phase 4: Ranking engine hardening (weighted scoring + debug API + калибровка весов) | Критический | `[x]` |
| Phase 5: Featured landings analytics (`impression/click/conversion`, analytics API, priorityScore, A/B) | Средний | `[x]` |
| Phase 6: Bridge contract tests (`catalog.bridge.spec.ts`, snapshots, CI test) | Средний | `[x]` |

Definition of Done (Focused):

- нет JSON textarea в `LandingEdit`, блоки строго типизированы;
- preview в `CollectionEdit` показывает before/after diff и поддерживает сортировку/пагинацию;
- статусы переходят только по разрешенным правилам с аудитом;
- ranking объясним и дебажится через scoring endpoint;
- featured landings имеют измеряемую аналитику и управляемую приоритизацию;
- bridge endpoints защищены e2e контрактами в CI.

---

## FULL TECH DEBT CLOSURE — волны A, B, C ✅

> **Программа завершена** (24.03.2026). Все три волны выполнены.

### Wave A (приоритет: 1 → 4 → 3)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Phase 1: Data Quality & Publish Gate (PublishGateService, publish blocking, UI блок «Готовность» в EventEdit, нормалайзеры) | Критический | `[x]` |
| Phase 4: Buyer account + YooKassa (metadata orderId/userId, ownership checks, edge cases, e2e checkout/buyer) | Критический | `[x]` |
| Phase 3: Supplier Reports acceptance/disputes (ACC-1..4: миграции, accept/dispute API, history, docs) | Высокий | `[x]` |

### Wave B ✅

| Phase 2: Supplier Finance / Legal | Phase 5: SEO Gate 3 | Phase 6: Collections/Landings v2 |
|--------|-----------|--------|
| Высокий `[x]` | Критический `[x]` | Средний `[x]` |

### Wave C ✅

| Phase 7: UI normalization | Phase 8: Observability | Phase 9: Promo/Marketing |
|--------|-----------|--------|
| Средний `[x]` | Средний `[x]` | Низкий `[x]` |

---

## Приоритеты (prod уже в бою; ниже — развитие и качество)

1. **Полный контур поставщика** — замкнуть цикл: регистрация → события → заказы → оплата → выплаты.
2. **YooKassa / платежи** — довести чеклист Gate 1 (ключи, sandbox-сценарии, наблюдаемость) при необходимости поверх уже работающего деплоя.
3. **Базовый контент** — SEO-описания городов/площадок, ТОП-лендинги (см. Gate 3).
4. ~~**Деплой на prod** — Gate 0b~~ **выполнено** (DNS, SSL, бэкапы, CI/CD).

**Отложено 6+ мес:** Planner, Unified Checkout, ML, PWA, gRPC-оптимизации (расширенная CI уже есть).

---

## Легенда

- **Приоритет**: Критический / Высокий / Средний / Низкий
- **Статус**: `[ ]` не начато, `[~]` в работе, `[x]` выполнено, `[-]` отменено
- **Отложено 6+ мес**: помечено `(⏸ 6+ мес)` — возврат к задаче не ранее Q3 2026

---

# Часть I — Закрытые задачи (Выполнено)

> Сводка выполненных работ по темам. Исторические детали — `docs/archive/Diary.md`.

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

# Часть II — Открытые задачи (Gates)

> Часть I остаётся историей; фактический статус — по Gate 0–3 и волнам A/B/C вверху. **Разделы ACC, YK, C-Gate в конце — выполнены** (Wave A, P3.2+, Task 10); оставлены как справочник.
> Задачи ниже разбиты по “воротам” (Gates). Всё, что не попало в них, — в блоке «После запуска / 6+ мес».
>
> **Актуализация 21.03.2026:** Gate **0b (prod)** и **CI/CD (GitHub Actions)** закрыты в эксплуатации. **Gate 1:** код YooKassa реализован в репозитории; **prod всё ещё на PAYMENT_PROVIDER=STUB** — включение YooKassa = отдельный шаг (ключи, .env, runbook). Открытыми остаются **Gate 2.x** (частично), **Gate 3**, **UA-3–UA-7** (админка), бэклог.

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

> **Двухэтапный подход:** сначала Gate 0a (staging), затем Gate 0b (prod). **Gate 0 (0a+0b) закрыт.** Команды: `bash scripts/close-gate0.sh` (0a) и `bash scripts/close-gate0.sh --prod` (0b).

#### Gate 0a — Staging ✅

- [x] **Критический**: VPS на Timeweb Cloud (2 CPU, 4 GB RAM, 50 GB) ✅
- [x] **Критический**: DNS A: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru → IP VPS ✅
- [x] **Критический**: SSH, `bash scripts/bootstrap-staging.sh` (или `close-gate0.sh` после первого bootstrap) ✅
- [x] **Критический**: TC_API_TOKEN, TC_WIDGET_TOKEN в .env (1:1 из локального) ✅
- [x] **Критический**: `bash scripts/close-gate0.sh` — deploy, migrate, backup, verify ✅
- [x] **Высокий**: https://staging.daibilet.ru, https://admin-staging.daibilet.ru, https://api-staging.daibilet.ru/api/v1/health ✅
- [x] **Средний**: SSL: `STAGING_ONLY=1 bash scripts/init-letsencrypt.sh` + `bash scripts/enable-ssl-staging.sh` ✅
- [x] **Средний**: Бэкап: `bash scripts/backup-staging-db.sh` ✅

#### Gate 0b — Production ✅

- [x] **Критический**: DNS A: daibilet.ru, www.daibilet.ru, api.daibilet.ru, admin.daibilet.ru → IP prod ✅
- [x] **Критический**: `bash scripts/close-gate0.sh --prod` ✅
- [x] **Высокий**: https://daibilet.ru, https://admin.daibilet.ru, https://daibilet.ru/api/v1/health ✅
- [x] **Средний**: SSL prod (Let's Encrypt, SAN 4 домена, cron renewal) ✅
- [x] **Средний**: `bash scripts/backup-production-db.sh` (скрипт есть в `scripts/`; запускать на prod VPS) ✅

### Gate 1 — принимаем платежи end-to-end (код готов; prod на STUB)

- [x] **Критический**: .env production: YooKassa ключи, PAYMENT_PROVIDER=YOOKASSA ✅
- [x] **Критический**: Зарегистрировать магазин в YooKassa, получить shopId + secretKey ✅
- [x] **Критический**: Подключить YooKassa SDK → `payment.service` (createPayment, refund), STUB для dev ✅
- [x] **Критический**: POST /webhooks/yookassa — IP whitelist, `WebhookIdempotencyService`, `PaymentEventLog` ✅
- [x] **Критический**: Обработка webhook → BullMQ `fulfillment.processor` (yookassa-webhook) ✅
- [x] **Критический**: Sandbox-сценарии покрыты unit/e2e-тестами (`payment.service.spec`, `payment-e2e.spec.ts` и др.) ✅
- [x] **Высокий**: Fulfilment идемпотентен; тесты payment e2e; `PaymentEventLog` ✅
- [x] **Высокий**: Страницы `/payment/success`, `/payment/fail` («Оплата прошла» / «Оплата не прошла») ✅
- [x] **Высокий**: Sentry: `PAYMENT_FAILED` в `payment.service`, `all-exceptions.filter` для 5xx ✅
- [x] **Средний**: GiftCertificate в checkout — поле «Ввести код», `POST /checkout/validate-gift-certificate`, применение к сессии ✅
- [x] **Средний**: Лендинг `salyut` — исправление `getPrice` (`price ?? amount`), тесты `collection.service.spec.ts` (salyut), теги `salyut-s-vody` в enrichment ✅
- [ ] **Средний**: SQL-отчёт по категоризации (аудит качества каталога) — отдельный инструмент
- [ ] **Критический**: Gate 1b — включить YooKassa в prod (PAYMENT_PROVIDER=YOOKASSA, ключи в .env, smoke-тесты)

### Buyer Account / ЛК покупателя (MVP, 15.03.2026)

- [x] **Высокий**: Аудит текущего состояния (User, CheckoutSession, auth, orders, track) → `docs/archive/BuyerAccountAudit.md` ✅
- [x] **Высокий**: Архитектурная спецификация → `docs/BuyerAccountSpecs.md` ✅
- [x] **Высокий**: Prisma: `userId` в CheckoutSession, миграция ✅
- [x] **Высокий**: Привязка заказа к пользователю при создании сессии (опциональный JWT) ✅
- [x] **Высокий**: Backend API: GET /account/me, /account/orders, /account/orders/:id, /account/tickets, GET/PATCH /account/profile, ownership checks ✅
- [x] **Высокий**: Backend GET /account/purchases — единый список покупок с типами карточек (INTERNAL_TICKET, EXTERNAL_VOUCHER, BOOKING_CONFIRMATION, AWAITING_PAYMENT, MANUAL_CONFIRMATION) ✅
- [x] **Высокий**: Frontend: layout /account, dashboard, заказы, деталь заказа, билеты, избранное (редирект), профиль ✅
- [x] **Высокий**: Frontend /account/purchases — единый экран «Мои покупки» с визуальным различием типов карточек ✅
- [x] **Высокий**: Навигация: «Мои покупки» в header (desktop + mobile) → /account/purchases, «Личный кабинет» → /account; редирект после логина по умолчанию на /account/purchases ✅
- [x] **Средний**: Read‑model и тесты Buyer Account: вынесен `PurchaseReadService` + маппер `PurchaseListItemDto`, capability‑хелперы `getPurchaseDisplayType` + `derivePurchaseActions` и helper `computeTicketAvailable` покрыты unit‑тестами; добавлены controller‑level интеграционные тесты для `/account/purchases`, `/account/orders`, `/account/orders/:id` (в т.ч. 403 при чужом заказе), `/account/tickets`, `/checkout/track/:shortCode` ✅
- [x] **Низкий**: Реальная интеграция YooKassa: metadata.orderId/userId в payment init ✅

#### Buyer Account — Тестовое событие и страница события (Daibilet Event PDP)

- [x] **Средний**: Тестовое событие `test-event-buyer-account` для сценариев Buyer Account / Event Page:
  - Venue «Сквер Достоевского» (реальный `Venue` в СПб, привязка к событию, корректный адрес/метро),
  - возраст 0+ (не скрывается на фронте, корректный рендер `0+` в Hero и карточках фактов),
  - 1–2 тестовых тега для фильтрации/UX (`test-family`, `test-evening`),
  - оффер с активной ценой и бейджем, сид‑сценарий `db:seed:buyer-test`.
- [x] **Средний**: Сеансы для тестового события (`db:seed:event-sessions-test`):
  - минимум 10 активных `EventSession` с разными датами/временем,
  - карточка «Ближайшие сеансы» на PDP показывает максимум 5 ближайших слотов,
  - BuyModal/BuyButton умеют работать с 10+ слотов как с базой для гибридного выбора дата‑время.
- [x] **Средний**: Рейтинг события:
  - backend: `CatalogService.getDisplayedEventRating(eventId, rawRating, reviewCount)` — детерминированный псевдорейтинг 4.5–5.0 при `<10` отзывов и фактический рейтинг при `>=10`, без изменения хранимых данных `Event.rating`,
  - применяется для: листингов (`getEvents`/`enrichWithBadges`), детальной страницы события (`fetchEvent`), блока «Похожие события»,
  - frontend: бейдж рейтинга на карточке (`EventCard`) и на PDP (`RatingBadge`) всегда видим, даже при малом числе отзывов.
- [x] **Средний**: Контентные блоки PDP события (PageTemplateSpecs → `EventContentTemplateData`):
  - реализованы блоки под описанием события строго в порядке:
    1) «Особенности» (`advantages[]`),
    2) «Программа» (`program`),
    3) «Маршрут» (`routeDescription`),
    4) «Меню» (`menu`),
    5) «Транспорт» (`visitRules`),
    6) «Памятка гостя» (`visitorTips`),
    7) «Частые вопросы» (`extraFaq[]`),
    8) «Правила обмена и возврата» (backend‑поле `refundPolicyResolved` с fallback на `bookingRules`),
  - каждый блок рендерится только при наличии данных в `contentTemplateData` / `refundPolicyResolved`, без дублирования старого `templateData`.
- [x] **Средний**: Refund policy inheritance на PDP:
  - backend: `RefundPolicyResolutionService.resolveEventRefundPolicy` уже собирает финальную политику по цепочке Supplier → Venue → Event, результат отдан в поле `refundPolicyResolved`,
  - frontend: EventPageView показывает уже **резолвленную** политику (без собственной логики наследования), либо fallback `bookingRules` из `contentTemplateData`, блок всегда подпиcан «Правила обмена и возврата».
- [x] **Средний**: Hero / CTA / рейтинг:
  - CTA в Hero стал «прайсовым»: компактный бейдж с «ОТ» и ценой `formatPrice(priceFrom)` (с символом рубля), по клику мягко скроллит к блоку покупки (`id="buy-card"`),
  - возраст 0+ не скрывается из‑за falsy‑проверок (`minAge >= 0`),
  - Hero‑рейтинг использует display‑rating с backend (с псевдорейтингом при `<10` отзывов).

### Gate 2 — ежедневные ops в текущей админке

- [x] **Высокий**: Admin UI — поиск заказа (id/code/email/paymentId) + resend, retry fulfilment (OrderDetail) ✅
- [x] **Высокий**: Cache invalidate в Settings (scope + ids → /admin/cache/invalidate) ✅
- [x] **Средний**: Support escalation checklist (документ не создан; при необходимости — отдельная задача) ✅

### Gate 2.x — Популярные направления (лендинги, подборки, авто-материализация)

- [x] **Высокий**: `CollectionMaterializerService` — авто-пересчёт `isActive` для подборок (Wave B Phase 6). ✅
- [x] **Средний**: `meteor-petergof`, `salyut-s-vody` и др. в `canonical-tag-enrichment.ts` + тесты. ✅
- [x] **Средний**: `bus-tour`, `rooftop`, `walking` — event-classifier (BUS/ROOFTOP/WALKING), tc-sync/tep-sync, seed-collections; коллекция obzornye-avtobusnye-ekskursii. ✅
- [x] **Средний**: Витрина «Обзорные автобусные экскурсии» — seed + `filterTags: ['bus-tour']`. ✅
- [ ] **Низкий**: Динамический блок «Популярные направления» на странице города — `getTopTagsByCity` / `getTopCollectionsByCity` + отображение ТОП тем с ссылками на /tags и /podborki по городу. См. `docs/archive/PopularDirectionsBlueprint.md` §4.
- [x] **Средний**: `SyncProcessor` full-sync: TC + TEP + retag + combo + `LandingMaterializerService.materialize`; см. `docs/Runbook-CatalogSync.md`, `Project.md`. После появления `CollectionMaterializerService` — дописать в runbook. ✅

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
- [x] **Высокий**: PageTemplateSpecs — гибридная модель (11.03): core + content JSON + refund policy; аудит соответствия ✅ (аудит в archive/specs/)
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

**Дальнейшая разработка:** см. `archive/DevelopmentScenario.md` — этапы A (Supplier UX), B (Admin UX), C (регрессия), Phases 2–9.

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
- [x] Лимит boosted-слотов в Popular (макс. 4 в топе)
- [x] Audit log при изменении manualBoost
- [x] Бейдж «Продвижение» в админке при manualBoost > 0

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
- [x] **P3-3: Admin API/UX** — metaJson.history при PATCH status (admin-finance); CRUD счетов (PATCH/DELETE/set-primary) в supplier API.
- [x] **P3-4: Supplier API** — API + тесты + gating + UI-блок «Реквизиты» (SupplierFinanceWidget) на дашборде поставщика.
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

- [x] **P3-3 — Admin API/UX**
  - [x] Admin: `GET /admin/finance/suppliers/profiles` — список профилей с фильтром по статусу (в т.ч. `?status=INCOMPLETE` — очередь на верификацию).
  - [x] Admin: `GET /admin/finance/suppliers/profiles/:operatorId` — деталка профиля со всеми счетами.
  - [x] Admin: `PATCH /admin/finance/suppliers/profiles/:operatorId/status` — смена статуса (VERIFIED с фиксацией verifiedBy/verifiedAt; REJECTED с обязательным comment).
  - [x] Admin: при PATCH status — запись в metaJson.history (кто из админов аппрувнул/отклонил), cap 50 записей.
  - [x] Supplier: CRUD счетов (PATCH/DELETE/set-primary) — `PATCH /supplier/profile/bank-accounts/:id`, `DELETE`, `POST .../set-primary`.
  - [x] Admin UI: вкладка «Финансы и реквизиты» в `SupplierDetail` — статус, юр. данные, счета (primary ⭐), история, кнопки Одобрить/Отклонить (модалка с комментарием). Компонент `SupplierLegalProfileView`.

- [x] **P3-4 — Supplier API/UX**
  - [x] Supplier: `GET/PATCH /supplier/profile/legal` — просмотр/редактирование собственных юр. данных (ИНН/КПП/ОГРН, emails); при изменении статус профиля сбрасывается в `INCOMPLETE`.
  - [x] Supplier: `GET/POST /supplier/profile/bank-accounts` — управление своими счетами (создание, переключение primary, без изменения snapshot старых payout’ов).
  - [x] Supplier Dashboard: блок «Реквизиты» (SupplierFinanceWidget) при `profileRequisites` из `/supplier/dashboard`; страница `/requisites` — форма юр. профиля, счета, «Отправить на проверку».

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

- [x] **P3.1-1 — Расширение налогового профиля**
  - [x] Prisma: enum `TaxMode { OSNO, USN_6, USN_15, AUSN, NPD }`, поля `taxMode`, `isVatPayer`, `defaultVatRate` в `SupplierLegalProfile`.
  - [x] Snapshot в `SupplierReport.snapshotJson.legalProfile` содержит `taxMode`, `isVatPayer`, `defaultVatRate`.
  - [x] UI: форма TaxSettingsSection на странице «Реквизиты» (select режима, checkbox плательщик НДС, input ставки).

- [x] **P3.1-2 — Tax Matrix (декларативная логика)**
  - [x] Создан `tax.config.ts` с `TAX_MATRIX: Record<TaxMode, TaxBehavior>` (поведение по режимам, а не if/else по строкам).
  - [x] `TaxBehavior` как минимум описывает: `requiresVat`, `defaultVatRate`, `mainDocumentType`, `needsInvoice`, `needsNpdReceiptLink`.
  - [x] Юнит‑тесты на Tax Matrix для базовых режимов (OSNO, USN, NPD): `tax.config.spec.ts` (22 теста) — ОСНО (выделение НДС, net/vat), УСН (vat 0), НПД (флаг «налог у поставщика»), агентская комиссия до/после налогов, краевые кейсы (нулевая сумма, деление на ноль). Добавлен `tax-calculations.ts` (vatFromGross, commissionFromGross) как единый источник формул.

- [x] **P3.1-3 — Нумерация НДС‑документов**
  - [x] Prisma: модель `DocumentSequence` (operatorId, year, type, lastNumber).
  - [x] Сервис `DocumentNumberService` с методом `nextNumber({ operatorId, year, type })` → строка `ГГГГ-XXXXXX`. Типы: INVOICE, UPD_1, UPD_2, AGENT_REPORT.
  - [x] Вызов `nextNumber` в `SupplierDocumentService.generateDocumentsForReport` при генерации AGENT_REPORT.
  - [x] Юнит‑тесты: `document-number.service.spec.ts` (9 тестов) — формат YYYY-XXXXXX, изоляция по operatorId, смена года (новый год = 000001), независимые последовательности по типу (AGENT_REPORT/INVOICE/UPD_1/UPD_2).

- [x] **P3.1-4 — Заготовка payload НДС‑документов**
  - [x] Выделен `buildVatDocumentPayload` поверх TAX_MATRIX и `tax-calculations`; возвращает totals (netAmount, vatAmount, commissionAmount) и lines.
  - [x] В `SupplierDocumentService.generateDocumentsForReport` payload и snapshot формируются через `buildVatDocumentPayload`; в snapshotJson — честные netAmount, vatAmount, commission по матрице.
  - [x] Расширение payload: `invoicePayload` с блоками `supplier` (name, inn, kpp, address, bankAccount), `tax` (taxMode, isVatPayer, vatRate), `customer` (type, name, inn), `items` (title, quantity, price, vatRate, vatAmount).
- [x] **P3.1-5 — Документация**
  - [x] `finance.md`: раздел «Invoice / UPD payload example» с примером JSON для счёта‑фактуры/УПД.


---

## UX Admin Refactor (EH alignment)

- **Приоритет:** Высокий

---

## Supplier Finance Demo Documents (dev)

| Задача | Приоритет | Статус |
|--------|-----------|--------|
| Seed demo генерации документов (`db:seed:finance-docs-demo`) + HTML/PDF файлы + dev endpoint `/admin/dev/finance-documents-demo` | Средний | `[x]` |

| Settlement Foundation Stage 1 (manual-first): `SupplierSettlement`, document policy, manual issue/regenerate APIs, invoice toggle default off | Высокий | `[x]` |

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
- [x] `StatCard` — есть в `packages/shared-ui` (`StatCard.tsx`), используется в кабинете поставщика (Dashboard). ✅
- [ ] (позже) `DataTableShell`, `StatusBadge`, `DetailSlideOver` — для единого list-паттерна админки (UA-4–UA-6).
- [x] **ЛК поставщика:** Dashboard, Settings, Orders, Events, Reviews, Availability, Reports, Balance, Notifications, Team, Integrations — на `PageHeader`/`SectionCard`/`EmptyState` и т.д. ✅
- [x] **Админка (frontend-admin):** UX-контур UA-3…UA-7 закрыт; аналитика вынесена в отдельный трек `AN-1`.

### UA-3 — Admin Dashboard как операционный центр `[x]`

- [x] Пересобрать `/` в полноценный dashboard:
  - 4–6 `StatCard` с KPI (активные события, заказы сегодня, выручка, новые отзывы, события на модерации).
  - блок «Требует внимания» (проблемные события/отзывы),
  - блок активности поставщиков (top N).
- [x] Использовать только существующие backend endpoints.

### UA-4 — Единый list-паттерн (на примере Events) `[x]`

- [x] Привести `EventsListPage` к шаблону:
  - `PageHeader` (title/subtitle/actions),
  - `FilterBar` (поиск, статус, город, поставщик),
  - `DataTableShell` (таблица с `StatusBadge` и warnings),
  - `EmptyState`/`LoadingState`/`ErrorState`.

### UA-5 — Распространение list-паттерна на Suppliers/Venues/Cities/Tags `[x]`

- [x] Применить тот же шаблон к:
  - `SuppliersListPage`,
  - `VenuesListPage`,
  - `CitiesListPage`,
  - `TagsListPage`.

### UA-6 — Операционные экраны (Moderation, Orders, Reviews) `[x]`

- [x] Привести `ModerationQueuePage`, `OrdersListPage`, `ReviewsListPage` к одному UX-паттерну:
  - `PageHeader`, `FilterBar`, `DataTableShell`, единые пустые/ошибочные состояния.
  - Для деталей — `DetailSlideOver` или единообразный detail-экран на базе `SectionCard`.

### UA-7 — Settings как вкладочные формы `[x]`

- [x] Превратить `SettingsPage` в много вкладочный экран:
  - Tabs: `General`, `SEO`, `Marketing`, `Integrations` (MVP можно сделать заглушками).
  - Внутри вкладок использовать `FormSection`, `FormGrid`, `FormActions`.

### AN-1 — Dashboard Analytics Hardening `[ ]`

#### Analytics policy (MVP)

- `GET /admin/dashboard/analytics-tabs` — временный агрегирующий endpoint для UI-дешборда.
- Endpoint **не является источником истины** для финансов/операций.
- Endpoint **не используется** для:
  - биллинга,
  - выплат поставщикам,
  - официальной отчетности.
- Новые метрики в `analytics-tabs` добавлять только по явному согласованию.
- Scope ограничения: максимум 8–10 агрегатов, без сложных JOIN-цепочек в runtime.

#### Источники метрик (MVP, dashboard-only)

- `content.qualityCards`  
  Source: `events` (`isActive`, `isDeleted`, проверки полноты)  
  Type: `approximate`  
  Usage: `dashboard only`
- `content.citiesCoverage`  
  Source: `cities` + связка `events`  
  Type: `exact`  
  Usage: `dashboard only`
- `content.popularCategories`  
  Source: `events.category` groupBy  
  Type: `approximate`  
  Usage: `dashboard only`
- `operations.recentOrders`  
  Source: `packages.createdAt` (7d)  
  Type: `exact`  
  Usage: `dashboard only`
- `operations.paymentIssues`  
  Source: `payment_intents.status in (FAILED, CANCELLED)` (7d)  
  Type: `approximate`  
  Usage: `dashboard only`
- `operations.refundsAndCancels`  
  Source: `payment_intents.status=REFUNDED` (30d)  
  Type: `approximate`  
  Usage: `dashboard only`
- `marketing.eventsConversion`  
  Source: `payment_intents` (PAID / all attempts, 30d)  
  Type: `approximate`  
  Usage: `dashboard only`
- `marketing.promoEfficiency`  
  Source: `checkout_sessions.appliedPromoCodeSnapshot` (30d)  
  Type: `approximate`  
  Usage: `dashboard only`
- `marketing.popularTopics`  
  Source: `event_tags` + `tags` (top by usage)  
  Type: `approximate`  
  Usage: `dashboard only`

#### Backlog AN-1

- [ ] sinceDays (7/30/90) + единый контракт периодов
- [ ] caching strategy (TTL + invalidation rules)
- [ ] query optimization + индексы для тяжелых агрегаций
- [ ] SLA: p95 response time и алерты на деградацию

### UA-8 — Supplier Cabinet: выравнивание с admin-паттернами `[x]`

- [x] Sidebar / навигация ЛК поставщика (Dashboard, события, отзывы, уведомления, отчёты, настройки, баланс, команда и др.) — реализовано в `Layout`/`AppShell`. ✅
- [x] Shared-компоненты `PageHeader`, `SectionCard`, `EmptyState`, `LoadingState`, `ErrorState`, `StatCard` — используются по основным экранам кабинета поставщика. ✅

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
- [x] **Закрыто иначе**: MANUAL EVENTS / MANUAL VENUES — через `PromoCollectionItem`; AUTO — через `PromoCollectionRule` + `PromoCollectionResolverService`. ✅

## После запуска / 6+ мес

- [x] CI/CD: GitHub Actions ✅
- [ ] gRPC: фильтры Cities/Venues
- [ ] Web Vitals: LCP, CLS
- [ ] Planner MVP, ML-рекомендации

---

## Бэклог

Детали — см. Gates выше и `archive/specs/`.

---

## YooKassa — PaymentMode & Agent Scheme ✅ (P3.2+, Architecture §9)

> **Выполнено.** OperatorPaymentSettings, Admin API, Supplier read-only, docs.

- [x] **YK-1** — OperatorPaymentSettings (paymentMode, agentSchemeEnabled, splitEnabled) ✅
- [x] **YK-2** — Admin: GET/PATCH `/admin/operators/:id/payment-settings` ✅
- [x] **YK-3** — Supplier: `GET /supplier/finance/settings` (read-only) ✅
- [x] **YK-4** — finance.md, Architecture.md §9 ✅

---

## Gate — Supplier Reports Acceptance & Disputes ✅ (Wave A Phase 3)

> **Выполнено.** ACC-1..ACC-4: миграции, accept/disputes API, metaJson.history, docs.

- [x] **ACC-1 — Prisma миграции**
  - [x] supplierAcceptedAt, acceptedBySupplierUserId в SupplierReport ✅
  - [x] Выполнено enum’ы типов леджера/строк отчёта (`CHARGEBACK_ADJUSTMENT`, `FEE_RECHARGE`).
  - [x] Миграции применены и убедиться, что `prisma generate` проходит без ошибок.

- [x] **ACC-2 — Backend / API** ✅

- [x] **ACC-3 — History** ✅
  - [x] metaJson.history в finance.md ✅

- [x] **ACC-4 — Docs** ✅
  - [x] finance.md, Architecture.md §8 ✅

---

## Gate — Content / PageTemplateSpecs (C-Gate) ✅ (Task 10 Phase C, Content Model)

> **Выполнено.** contentTemplateData, venueTemplateData в admin; RefundPolicyResolutionService; Architecture §5, archive/specs/PageTemplateSpecs.

- [x] **C-1** — Admin: contentTemplateData, venueTemplateData, refundPolicy в формах Event/Venue ✅
- [x] **C-2** — Валидация JSON при create/update (Zod-схемы в shared) ✅
- [x] **C-3** — ageLimit/minAge: Event.minAge как единый источник ✅
- [x] **C-4** — Docs: Architecture.md, archive/specs/PageTemplateSpecs.md ✅
