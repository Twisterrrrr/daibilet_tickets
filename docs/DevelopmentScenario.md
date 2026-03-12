# Сценарий дальнейшей разработки

> Последнее обновление: 2026-03-12  
> Основа: Roadmap Admin + Supplier upgrade, Пункт 4 (UX-полировка под Event Horizon Hub), аудит текущего состояния.

---

## 1. Цели и принципы

- **Цель:** довести админку и ЛК поставщика до консистентного «флагманского» состояния, не ломая текущую архитектуру.
- **Принципы:** фаза за фазой, минимальный дифф, использование shared-ui, единый паттерн списков (PageHeader + Card-фильтры + DataTable).

---

## 2. Ближайшие этапы (приоритет)

### Этап A — UX-полировка Supplier Cabinet (средний)

| Задача | Файл | Действие | Приоритет |
|-------|------|----------|-----------|
| A1. StatCard на дашборде | `frontend-supplier/pages/Dashboard.tsx` | Заменить KPI через SectionCard на StatCard из shared-ui (заказы, выручка, trust, лимит) | Высокий |
| A2. Reviews — shared-ui | `frontend-supplier/pages/Reviews.tsx` | Добавить PageHeader, SectionCard, LoadingState, ErrorState | Высокий |
| A3. Balance — tooltips | `frontend-supplier/pages/Balance.tsx` | Добавить tooltip/подсказки по статусам заявок (NEW, APPROVED, REJECTED, PAID) и срокам обработки | Средний |
| A4. EventsList — визуал | `frontend-supplier/pages/events/EventsList.tsx` | Унифицировать бейджи/иконки статусов (как в Event Horizon Hub) | Средний |

**Definition of Done A:**  
Dashboard, EventsList, EventEdit, Reviews, Balance, Reports, Settings, Notifications — везде PageHeader, SectionCard, EmptyState, ErrorState, LoadingState. KPI через StatCard.

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

### Phase 2 — Supplier Orders / Booking Operations

- Supplier: страница «Заказы» с фильтрами (дата, событие, статус), таблицей, drawer детали.
- Admin: унификация Orders, видимость dispute/issue.
- **Зависимости:** API для заказов поставщика (уже есть PaymentIntent с supplierId; возможно OrderRequest/CheckoutSession).

### Phase 3 — Availability / Sessions / Inventory

- Supplier: страница «Доступность» / «Календарь» — управление сессиями, датами, вместимостью.
- Admin: диагностика доступности по событию/поставщику.
- **Зависимости:** Уже есть `PUT /supplier/events/:eventId/sessions`; нужна UI-страница.

### Phase 4 — Listing Health / Quality Layer

- Supplier: панель «Здоровье листинга» (отсутствующие фото, расписание, цены, отклонённые события).
- Admin: «Качество каталога» / «Здоровье поставщика» — скоринг по событию/поставщику.

### Phase 5 — Supplier Analytics

- Supplier: отчёты (выручка, заказы, топ-события, тренды).
- Admin: отчёты по поставщикам, городам, категориям.

### Phase 6 — Pricing & Promotions

- Supplier: промокоды, скидки, early bird / last minute.
- Admin: модерация промо, featured placements.
- **Важно:** без динамического ценообразования, только rule-based скидки.

### Phase 7 — Ranking / Merchandising

- Admin: featured events/suppliers, boost, подавление низкокачественных.
- Supplier: подсказки по видимости и качеству.

### Phase 8 — Integrations / Connectivity

- Supplier: страница интеграций, статус подключения, маппинг внешних систем.
- Платформа: extension points для sync (availability, price, bookings, cancellation).
- **Важно:** без реализации полноценного partner ecosystem — только точки расширения.

### Phase 9 — Team / Roles / Support

- Supplier: мульти-пользователь, роли, центр поддержки.
- Admin: supplier support operations, audit trail.

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
