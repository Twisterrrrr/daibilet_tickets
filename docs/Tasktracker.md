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
- [x] **Средний**: Read‑model и тесты Buyer Account: вынесен `PurchaseReadService` + маппер `PurchaseListItemDto`, capability‑хелперы `getPurchaseDisplayType` + `derivePurchaseActions` покрыты unit‑тестами; добавлены controller‑level интеграционные тесты для `/account/purchases`, `/account/orders/:id`, `/checkout/track/:shortCode` ✅
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
