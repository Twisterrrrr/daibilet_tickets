# Roadmap Phases 2–9 — Implementation Architecture

> Последнее обновление: 2026-03-12  
> Основа: инспекция кодовой базы, Project.md, DevelopmentScenario.md. Репозиторий: packages/backend, packages/frontend-admin, packages/frontend-supplier.

---

## A. Gap Analysis

### Phase 2 — Supplier Orders / Booking

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| OrderRequest | ✅ schema, state machine | — |
| PaymentIntent.supplierId | ✅ | — |
| Partner API orders | ✅ GET/POST confirm/reject | Фильтр по eventIds в listOrders **сломан** (where не использует eventIds). Supplier Portal **не имеет** orders API. |
| CheckoutSession → OrderRequest | ✅ | — |
| Supplier orders projection | — | **Нужен** SupplierOrdersService + projection (OrderRequest по eventOffer.operatorId) |
| UI Supplier «Заказы» | — | **Нет** страницы |
| Admin order→checkout link | Частично (admin-checkout) | Унификация OrdersList, связь order↔dispute/support |

### Phase 3 — Availability / Sessions

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| EventSession | ✅ schema, offerId, capacityTotal, canceledAt | — |
| GET/PUT supplier/events/:id/sessions | ✅ list + sync (MANUAL-only) | — |
| Source-based editability | ✅ `event.source !== 'MANUAL'` → reject | EventSession не хранит source; sync перезаписывает. |
| Supplier calendar UI | — | **Нет** страницы «Доступность» / «Календарь» |
| Admin availability diagnostics | — | **Нет** (events without sessions, expired sessions) |
| PackageItem / sold per session | ✅ в syncSessions | — |

### Phase 4 — Listing Health

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| Trust Catalog block | ✅ в SupplierTrustService | Отдельный deterministic ListingHealthService |
| EventOverride.qualityStatus | ✅ в schema | Не заполняется автоматически |
| Supplier health panel | — | **Нет** |
| Admin catalog health report | — | **Нет** |

### Phase 5 — Analytics

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| supplier/reports/sales | ✅ PaymentIntent + CSV | — |
| supplier/reports/sessions | ✅ ReportsService.getSessionOccupancy | — |
| ReportsRepository | ✅ getSalesByOperatorDay, getSalesByEvent | — |
| Pre-aggregated metrics | EventSessionStats (soldLast24h) | Нет daily supplier/event aggregates |
| Admin reports | ReportsController (admin) | — |
| CSV export | ✅ streamCsv | — |

### Phase 6 — Pricing & Promotions

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| PromoCode | — | **Нет** модели |
| PromoBlock / PromoCollection | ✅ для featured | Отдельно для промокодов |
| Checkout validation | — | Логика применения промокода |
| Early bird / last minute | PricingConfig (lastMinutePercent) | Только конфиг, не rule engine |

### Phase 7 — Ranking / Merchandising

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| EventOverride.isHidden | ✅ | — |
| PromoBlockEvent, PromoCollection | ✅ | — |
| manualBoost / suppress | — | **Нет** полей |
| Catalog sort | CatalogService | Нет влияния boost/suppress |
| Supplier visibility hints | — | **Нет** |

### Phase 8 — Integrations ✅

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| TcSync, TepSync | ✅ | — |
| Partner API | ✅ | — |
| SyncAdapter interface | ✅ | — |
| Supplier integrations page | ✅ | — |

### Phase 9 — Team / Roles / Support ✅

| Компонент | Существует | Отсутствует |
|-----------|------------|-------------|
| SupplierUser, SupplierRole | ✅ OWNER, MANAGER, CONTENT, ACCOUNTANT | — |
| RBAC checks | ✅ SupplierRolesGuard, requireSupplierRole | — |
| Invitations | ✅ SupplierInvitation | — |
| SupportTicket | ✅ admin | Связь supplier↔ticket, audit trail |

---

## B. Target Architecture by Phase

### Phase 2 — Projection over OrderRequest, no SupplierOrder table

- **Source of truth:** OrderRequest, CheckoutSession, PaymentIntent.
- **Projection:** `SupplierOrderProjection` = OrderRequest where eventOffer.operatorId = operatorId, с join на event, eventOffer, checkoutSession.
- **Unified list:** OrderRequest (REQUEST flow) + PaymentIntent PAID (platform, для «история заказов»). Две сущности в одном списке с общим DTO.
- **Actions:** confirm, reject (OrderRequest). «Mark completed» = опционально, т.к. CheckoutSession.state machine не имеет явного «completed» для supplier line.

### Phase 3 — EventSession, source-based editability

- **EventSession:** уже есть; sync-source (TC/Teplohod) сессии **read-only** для supplier. MANUAL — полный CRUD.
- **Не добавлять** колонку `editSource` в EventSession: источник выводится из Event.source.
- **Bulk generation:** расширить PUT sessions payload (batch create N дат).

### Phase 4 — Deterministic ListingHealthService

- **Правила:** missing photo, weak description (<200 chars), no sessions, no price, venue gaps. Каждое правило = отдельная проверка, возвращает `{ code, message, field }`.
- **Score:** сумма штрафов (0–100). Объяснимый, не black-box.
- **Compute:** on-read с кешем (Redis, TTL 1h) или materialize при изменении event/offer.

### Phase 5 — PaymentIntent as source of truth, optional pre-aggregation

- **Source:** PaymentIntent (status=PAID) для выручки; OrderRequest для заявок.
- **Pre-aggregation:** при росте — таблица `supplier_daily_metrics` (operatorId, date, ordersCount, grossKopecks, netKopecks). Cron раз в день.
- **MVP:** без pre-aggregation, прямые запросы к PaymentIntent.

### Phase 6 — PromoCode model, rule-based

- **PromoCode:** code, type (PERCENT/FIXED), value, operatorId?, eventIds[], validFrom/To, maxUses.
- **Conflict policy:** один промокод на checkout. При нескольких применимых — первый по приоритету.
- **Checkout:** валидация в одном месте (PaymentService или CheckoutService), детерминированная.

### Phase 7 — Event-level boost/suppress

- **Хранение:** EventOverride: `manualBoost: Int?`, `suppressLowQuality: Boolean?` (или отдельная таблица EventMerchandising).
- **Catalog:** сортировка учитывает manualBoost; suppress = exclude из выдачи.
- **Без ML.**

### Phase 8 — Thin interfaces only

- **SyncAdapter:** `syncAll(): Promise<SyncResult>` — маппинг TcSyncService/TepSyncService.
- **AvailabilityProvider:** `getAvailability(offerId): Promise<Availability>` — опционально.
- **BookingProvider:** уже есть (TcBookingProvider, PartnerBookingProvider). Интерфейс не обязательно менять.
- **UI:** read-only статус (TC OK, Teplohod OK, Partner API).

### Phase 9 — SupplierInvitation, extend RBAC

- **SupplierInvitation:** email, operatorId, role, token, expiresAt, acceptedAt.
- **API:** POST /supplier/invitations, GET /supplier/invitations, POST /supplier/invitations/:token/accept.
- **Audit:** расширить AuditLog или SupplierActionLog (entity=Event, actor=SupplierUser).

---

## C. Recommended Implementation Order

```
Phase 2 (Orders)     ─┬─► Phase 5 (Analytics) — зависит от orders как источника
                      │
Phase 3 (Sessions)   ─┼─► Phase 4 (Listing Health) — независима
                      │
Phase 4 (Health)     ─┼─► Phase 7 (Ranking) — health как вход
                      │
Phase 6 (Pricing)    ─┼─► независима
                      │
Phase 8 (Integrations) ─┼─► низкий приоритет
                      │
Phase 9 (Team/Roles) ─┘
```

**Порядок:** 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

**PR Slices:**
1. **PR-1:** Phase 2 backend (SupplierOrdersService, API, fix Partner listOrders) + Phase 2 frontend (Orders page).
2. **PR-2:** Phase 3 backend (availability diagnostics) + Phase 3 frontend (Sessions/Calendar page).
3. **PR-3:** Phase 4 (ListingHealthService, API, UI).
4. Далее: 5, 6, 7, 8, 9 — отдельными PR.

---

## D. Prisma Model Changes

| Phase | Изменения | Обоснование |
|-------|-----------|-------------|
| 2 | **Нет** новых таблиц | Projection над OrderRequest |
| 3 | **Нет** | EventSession достаточно |
| 4 | **Нет** (опц. `listing_health_cache`) | On-read + Redis кеш |
| 5 | Опц. `supplier_daily_metrics` | Pre-aggregation, позже |
| 6 | **PromoCode** | code, type, value, operatorId?, eventIds[], validFrom/To, maxUses, usedCount |
| 7 | EventOverride: `manualBoost Int?`, `suppressLowQuality Boolean?` | Или EventMerchandising |
| 8 | **Нет** | Только интерфейсы |
| 9 | **SupplierInvitation** | email, operatorId, role, token, expiresAt, acceptedAt |

---

## E. Indexes (Phase 2)

```sql
-- OrderRequest: supplier filter
CREATE INDEX idx_order_request_event_offer_operator 
  ON order_requests (event_offer_id);
-- + use event_offers.operator_id in join

-- Или составной через event:
CREATE INDEX idx_order_request_event_created 
  ON order_requests (event_id, created_at DESC);
```

Рекомендация: фильтр `eventId IN (SELECT id FROM events WHERE operator_id = ?)`. Индекс `events(operator_id)` уже есть. `order_requests(event_id)` есть. Достаточно.

---

## F. Backend Module Plan

| Phase | Модуль | Файлы |
|-------|--------|-------|
| 2 | supplier | `SupplierOrdersService`, `SupplierOrdersController` (или расширить SupplierController) |
| 2 | partner | Fix `listOrders` where eventId in eventIds |
| 3 | supplier | Расширить sessions API; `AdminAvailabilityController` diagnostics |
| 4 | catalog | `ListingHealthService`, `GET /supplier/listing-health`, `GET /admin/catalog/health` |
| 5 | reports | Расширить ReportsService/Repository; без новых модулей |
| 6 | promo | `PromoCodeService`, `PromoCode` model, checkout validation |
| 7 | catalog | Учёт manualBoost/suppress в CatalogService.fetchEvents |
| 8 | catalog | `SyncAdapter` interface; маппинг TcSync/TepSync (рефакторинг необязателен) |
| 9 | supplier | `SupplierInvitationService`, `SupplierInvitation` model, RBAC |

---

## G. API Contract Draft

### Phase 2

```
GET  /supplier/orders
  ?status=PENDING|CONFIRMED|REJECTED|EXPIRED
  ?from=ISO
  ?to=ISO
  ?eventId=UUID
  ?page=1
  ?limit=25
Response: { items: SupplierOrderDto[], total, page, pages }

GET  /supplier/orders/:id
Response: SupplierOrderDetailDto

POST /supplier/orders/:id/confirm
Body: { notes?: string }

POST /supplier/orders/:id/reject
Body: { reason: string }
```

### Phase 3

```
GET  /supplier/events/:eventId/sessions  (exists)
PUT  /supplier/events/:eventId/sessions  (exists, extend for bulk)
GET  /admin/catalog/availability-diagnostics
  ?operatorId=...
  ?cityId=...
Response: { eventsWithoutSessions, expiredSessions, zeroCapacitySessions }
```

### Phase 4

```
GET /supplier/listing-health
Response: { score, issues: { code, message, eventId? }[], recommendations }

GET /admin/catalog/health
  ?operatorId=...
  ?cityId=...
Response: { byEvent: [...], byOperator: [...], aggregates }
```

### Phase 6

```
POST /checkout/validate
Body: { ..., promoCode?: string }
Response: { valid, discountedTotal, appliedPromo? }
```

---

## H. Risks / Migration / Compatibility

| Phase | Риск | Митигация |
|-------|------|-----------|
| 2 | Mixed basket: supplier видит только свои OrderRequest | Projection по eventOffer.operatorId. PaymentIntent.supplierId для platform. |
| 3 | Sync перезаписывает MANUAL сессии | Только MANUAL редактируемы; sync не трогает event.source=MANUAL. |
| 4 | Пересчёт health на каждый запрос | Кеш Redis 1h по operatorId. |
| 5 | Объём PaymentIntent | Индексы (supplierId, paidAt). При росте — pre-aggregation. |
| 6 | Конфликт промокодов | Один промокод на checkout, явная политика. |
| 7 | Catalog perf | manualBoost — доп. поле в ORDER BY, индекс. |
| 9 | Один owner → мульти | Обратная совместимость: owner без invitations работает как раньше. |

---

## I. Docs to Create/Update

| Документ | Действие |
|----------|----------|
| docs/SupplierOrdersArchitecture.md | Создать |
| docs/AvailabilityAndSessionsArchitecture.md | Создать |
| docs/ListingHealthArchitecture.md | Создать |
| docs/SupplierAnalyticsArchitecture.md | Создать |
| docs/PricingAndPromotionsArchitecture.md | Создать |
| docs/RankingAndMerchandisingArchitecture.md | Создать |
| docs/IntegrationsExtensionPoints.md | Создать |
| docs/TeamRolesSupportArchitecture.md | Создать |
| docs/Project.md | Добавить ссылки на новые архитектуры |
| docs/DevelopmentScenario.md | Обновить Phases 2–9 ссылками |
| docs/Tasktracker.md | Добавить задачи Phases 2–9 |
| docs/RoadmapPhases2-9.md | Ссылка на Architecture |

---

## J. Phased Task Checklist

### Phase 2

- [ ] SupplierOrdersService: projection OrderRequest by eventOffer.operatorId
- [ ] GET /supplier/orders, GET /supplier/orders/:id
- [ ] POST /supplier/orders/:id/confirm, reject
- [ ] Fix Partner listOrders (eventId in eventIds)
- [ ] Supplier Portal: OrdersListPage (PageHeader, filters, DataTable, drawer)
- [ ] Admin: OrdersList — link to CheckoutSession, dispute/support hint
- [ ] Indexes: verify event_id, event_offer.operator_id

### Phase 3

- [ ] Supplier: SessionsPage / CalendarOrdersView
- [ ] GET /supplier/events/:id/sessions (exists)
- [ ] PUT sessions: bulk date generation (optional)
- [ ] Admin: GET /admin/catalog/availability-diagnostics
- [ ] Sync-source sessions: document read-only, enforce in PUT guard

### Phase 4

- [ ] ListingHealthService (deterministic rules)
- [ ] GET /supplier/listing-health
- [ ] GET /admin/catalog/health
- [ ] Supplier UI: ListingHealthPanel
- [ ] Admin UI: CatalogHealthReport
- [ ] Cache: Redis TTL 1h (optional)

### Phase 5

- [ ] Extend ReportsService (grouping, trends)
- [ ] Supplier: Analytics page (charts, export)
- [ ] Admin: reports by operator/city/category
- [ ] Pre-aggregation (LATER)

### Phase 6

- [ ] PromoCode model + migration
- [ ] PromoCodeService
- [ ] Checkout: validate promoCode
- [ ] Supplier: PromoCodes CRUD
- [ ] Admin: promo moderation

### Phase 7

- [ ] EventOverride.manualBoost, suppressLowQuality (или EventMerchandising)
- [ ] CatalogService: apply boost/suppress in sort/filter
- [ ] Admin: boost/suppress UI
- [ ] Supplier: visibility hints (LATER)

### Phase 8

- [ ] SyncAdapter interface (thin)
- [ ] Map TcSync/TepSync to interface (doc only)
- [ ] Supplier: IntegrationsStatusPage (read-only)

### Phase 9

- [ ] SupplierInvitation model + migration
- [ ] SupplierInvitationService
- [ ] POST/GET /supplier/invitations, accept
- [ ] RBAC: extend permissions matrix
- [ ] Support: link ticket ↔ supplier
- [ ] Audit: SupplierActionLog (optional)
