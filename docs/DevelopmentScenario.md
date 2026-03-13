# Сценарий дальнейшей разработки

> Последнее обновление: 2026-03-12  
> Основа: Roadmap Admin + Supplier upgrade, Пункт 4 (UX-полировка под Event Horizon Hub), аудит текущего состояния.

---

## 1. Цели и принципы

- **Цель:** довести админку и ЛК поставщика до консистентного «флагманского» состояния, не ломая текущую архитектуру.
- **Принципы:** фаза за фазой, минимальный дифф, использование shared-ui, единый паттерн списков (PageHeader + Card-фильтры + DataTable).

---

## 2. Ближайшие этапы (приоритет)

### Этап A — UX-полировка Supplier Cabinet (средний) ✅

| Задача | Файл | Действие | Статус |
|-------|------|----------|--------|
| A1. StatCard на дашборде | `Dashboard.tsx` | KPI через StatCard (заказы, выручка, trust, лимит) | ✅ |
| A2. Reviews — shared-ui | `Reviews.tsx` | PageHeader, SectionCard, LoadingState, ErrorState, retry | ✅ |
| A3. Balance — tooltips | `Balance.tsx` | PAYOUT_STATUS_LABELS + title tooltips (сроки обработки) | ✅ |
| A4. EventsList — визуал | `EventsList.tsx` | STATUS_ICONS с badgeClass (rounded-full, цвета) | ✅ |

**Definition of Done A:**  
Dashboard, Reviews, Balance, EventsList — StatCard, shared-ui, tooltips, бейджи унифицированы.

---

### Этап B — UX-полировка Admin Panel (средний)

| Задача | Файл | Действие | Приоритет |
|-------|------|----------|-----------|
| B1. Checkout — единый паттерн | `frontend-admin/pages/checkout/CheckoutSessionsList.tsx` | Добавить PageHeader из shared-ui; при необходимости обернуть фильтры в Card | Высокий |
| B2. Support — shared-ui | `frontend-admin/pages/support/SupportList.tsx` | Добавить PageHeader, EmptyState, ErrorState; привести layout к общему паттерну | Высокий |
| B3. Moderation — (опционально) | `frontend-admin/pages/moderation/ModerationQueue.tsx` | Обернуть список в SectionCard; при необходимости перейти на DataTable | Низкий |
| B4. Payouts — тюнинг | `frontend-admin/pages/payouts/PayoutsListPage.tsx` | Финальный тюнинг: размеры шрифтов, цвета бейджей, подсказки под Event Horizon Hub | Средний |
| B5. Навигация и заголовки | — | Проверить единообразие кнопок и иконок в sidebar/header | Низкий |

**Definition of Done B:**  
Events, Orders, Checkout, Payouts, Suppliers, Reviews, Support, Moderation — единый паттерн PageHeader + фильтры в Card + DataTable (где применимо).

---

### Этап C — Мини-регрессия (критический) ✅

| Задача | Область | Действие |
|-------|---------|----------|
| C1. Critical Path Supplier | S1–S9 | Логин → Dashboard → Events → Create → Reviews → Reports → Balance → Notifications → Settings |
| C2. Critical Path Admin | A1–A11 | Логин → Dashboard → Events → Orders → Checkout → Payouts → Suppliers → Moderation → Reviews → Support → Settings |
| C3. Ошибки | DevTools | Отсутствие 500/404, «висящих» спиннеров, явных JS-ошибок в Console |
| C4. Чек-лист | `docs/RegressionChecklist.md` | Critical Path зафиксирован, использовать перед коммитом UX |
| C5. UI_GUIDE | `packages/shared-ui/UI_GUIDE.md` | StatCard (§10), паттерн списков (§11), ссылка на RegressionChecklist (§12) |

**Definition of Done C:**  
RegressionChecklist.md и UI_GUIDE обновлены. Critical Path — минимальный набор для проверки перед A/B.

---

## 3. Roadmap Phases 2–9 (после этапов A–C)

Архитектура и implementation plan: `docs/RoadmapPhases2-9Architecture.md`.

| Phase | Детали | Документ |
|-------|--------|----------|
| 2 | Supplier Orders / Booking | [SupplierOrdersArchitecture.md](SupplierOrdersArchitecture.md) |
| 3 | Availability / Sessions | [AvailabilityAndSessionsArchitecture.md](AvailabilityAndSessionsArchitecture.md) |
| 4 | Listing Health | [ListingHealthArchitecture.md](ListingHealthArchitecture.md) |
| 5 | Supplier Analytics | [SupplierAnalyticsArchitecture.md](SupplierAnalyticsArchitecture.md) |
| 6 | Pricing & Promotions | [PricingAndPromotionsArchitecture.md](PricingAndPromotionsArchitecture.md) |
| 7 | Ranking / Merchandising | [RankingAndMerchandisingArchitecture.md](RankingAndMerchandisingArchitecture.md) |
| 8 | Integrations Extension Points | [IntegrationsExtensionPoints.md](IntegrationsExtensionPoints.md) |
| 9 | Team / Roles / Support | [TeamRolesSupportArchitecture.md](TeamRolesSupportArchitecture.md) |

### Phase 2 — Supplier Orders / Booking Operations
Supplier: страница «Заказы», фильтры, confirm/reject. Projection над OrderRequest (без SupplierOrder). Partner listOrders: fix filter.

### Phase 3 — Availability / Sessions / Inventory
Supplier: страница «Доступность». MANUAL editable, TC/Teplohod read-only. Admin diagnostics: events without sessions.

### Phase 4 — Listing Health / Quality Layer
Deterministic ListingHealthService. Supplier: панель «Здоровье». Admin: каталог health.

### Phase 5 — Supplier Analytics
ReportsService расширение. PaymentIntent = source of truth. CSV export есть.

### Phase 6 — Pricing & Promotions
PromoCode model, rule-based. Один промокод на checkout.

### Phase 7 — Ranking / Merchandising
manualBoost, suppressLowQuality. Catalog учитывает при sort.

### Phase 8 — Integrations
Thin SyncAdapter/BookingProvider. UI: read-only status.

### Phase 9 — Team / Roles / Support
SupplierInvitation, RBAC, support link, audit.

---

## 4. Shared UX Rules (для всех новых страниц)

- **PageHeader** — заголовок и subtitle/actions.
- **SectionCard** — группировка контента.
- **DataTable** (admin) / список в SectionCard (supplier) — единообразные отступы и шрифты.
- **EmptyState** — когда нет данных.
- **LoadingState** — вместо спиннеров.
- **ErrorState** — при ошибке загрузки.
- **StatCard** — компактные метрики на дашбордах.
- **FilterBar** (в Card) — фильтры над таблицей.

---

## 5. Рекомендуемый порядок работ

1. **Сначала:** Этап C (регрессия) — выявить критические баги.
2. **Затем:** Этап A (Supplier UX) — быстрые улучшения, минимальный риск.
3. **Далее:** Этап B (Admin UX) — Checkout, Support, Payouts.
4. **Потом:** Phase 2 (Orders) — бизнес-ценность для поставщика.
5. **Дальше:** Phase 3 (Availability) — критично для MANUAL-событий.

---

## 6. Отложено / не в приоритете

- Полный CRUD trust override (trustManualOverrideLevel/Score/Reason/ExpiresAt) — отдельная задача.
- Документ `SupplierTrustSpec.md` с формулами — при усложнении модели.
- Динамическое ценообразование.
- Полноценный partner ecosystem (Phase 8 — только extension points).
- Skeleton вместо LoadingState — по желанию, не блокер.

---

## 7. Связанные документы

- `docs/Project.md` — архитектура, Supplier Trust.
- `docs/Tasktracker.md` — статус задач.
- `docs/Diary.md` — технические решения.
- `docs/UI_GUIDE.md` (shared-ui) — паттерны компонентов.
