# Lovable — обогащённый пакет (второй проход): Admin + Supplier

**Проект:** Daibilet  
**Назначение:** полный второй проход по промптам с контрактами, DTO, JSON-примерами, enum’ами, allowed actions, readonly/editable, табами и состояниями.

**Связь:** базовый пакет без расширенных DTO по модулям — [`lovable-admin-supplier-prompts.md`](lovable-admin-supplier-prompts.md). Finance — [`lovable-finance-prompts.md`](lovable-finance-prompts.md). Ещё более жёсткий слой для критичных экранов — [`lovable-prompts-admin-supplier-v3-production-tight.md`](lovable-prompts-admin-supplier-v3-production-tight.md).

> Это пакет не «под идеальный backend из воздуха», а под закреплённую модель: public отдельно; buyer account внутри public; admin и supplier отдельно; единый backend и core-сущности; source-aware inventory (**PORTAL, ADMIN, TICKETSCLOUD, TEPLOHOD, PARTNER_API**); единый Order/projection; refunds как request/status; venue как hub / events-only / admission-only / hybrid.

---

## Первичные разделы и документы

| Что | Где |
|-----|-----|
| Старт и оболочки | Этот файл §1–5 |
| Модули с DTO §6–§15 | [`lovable-prompts-admin-supplier-v2-modules-6-15.md`](lovable-prompts-admin-supplier-v2-modules-6-15.md) |
| Production-tight модули §1–§12 | [`lovable-prompts-admin-supplier-v3-production-tight.md`](lovable-prompts-admin-supplier-v3-production-tight.md) |
| **Классификация Event/Venue (категории + теги, три сообщения Lovable)** | [v3 **§13**](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue) |
| **Admin Supplier Integrations** | [v3 **§14**](lovable-prompts-admin-supplier-v3-production-tight.md#14-admin-supplier-integrations) |
| Shared UI + edge cases | Этот файл §16–17 |
| Базовый трек без расширенных DTO | [`lovable-admin-supplier-prompts.md`](lovable-admin-supplier-prompts.md) (оглавление, в т.ч. строка **+** → v3 §13) |

---

## Как пользоваться

**Не скармливай всё одним сообщением.**

Рекомендуемый порядок:

1. Master context (§1)  
2. Shared UI / app split (§2–3)  
3. Admin shell (§4)  
4. Supplier shell (§5)  
5. Дальше **по одному модулю:** Events → Venues → Cities → Suppliers → Orders → Supplier Dashboard → My Events → My Venues/Admission → Supplier Orders → Integrations  
6. Затем §16–17 (shared UI rules, states)  
7. Для **классификации** (категории + теги) на detail Event/Venue в Admin и Supplier — отдельный production-tight блок: [v3 §13](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue) (основной промпт + 2 коротких follow-up)

---

## 1. MASTER CONTEXT PROMPT (обогащённый)

```
Project: Daibilet

You are helping build two separate frontend applications for an existing event marketplace platform:

1. Admin frontend
2. Supplier frontend

The public frontend and buyer account already belong to a separate public/customer surface and are not the primary scope of this task.

Important architecture rules:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- Do NOT invent database schema.
- Do NOT introduce Supabase, Firebase, or any replacement backend.
- Do NOT change the role model.
- Do NOT invent endpoints unless explicitly specified.
- Generate frontend UI only.

Platform model:
Daibilet works with multiple inventory and sales channels.

Inventory origin / source:
- PORTAL
- ADMIN
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Sales mode:
- INTERNAL_CHECKOUT
- EXTERNAL_WIDGET
- EXTERNAL_API

Supplier mode:
- MANUAL
- API
- HYBRID

Because of this:
- some records are fully editable
- some are partially editable
- some are source-owned and mostly read-only
- UI must clearly show read-only vs editable zones

Venue model:
A venue is not only a content hub.
A venue may also:
- have no direct sales
- sell only admission/open-date tickets
- sell only events
- be hybrid (admission + events)

Venue sales mode:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

Core surfaces:
- Admin = full platform operations
- Supplier = scoped cabinet for supplier-owned data and workflows

Main source-aware product entities:
- Event
- Venue
- Offer
- Session
- Supplier
- Order
- RefundRequest
- Landing
- PromoBlock
- City
- User

Important order principle:
There is one core Order projection.
It may be visible differently in:
- Admin
- Supplier
- Buyer account

Do not model them as different orders.

Your job:
Generate production-oriented React UI structure and pages for Admin and Supplier applications only.

When uncertain:
- prefer read-only over editable
- prefer minimal reversible decisions
- add TODO instead of guessing backend logic
```

---

## 2. GLOBAL HARD CONSTRAINTS PROMPT

```
Hard constraints for all Daibilet admin/supplier tasks:

- Existing backend is fixed
- Existing API contracts are fixed
- Existing permissions are fixed
- Existing role model is fixed
- Existing routing conventions are fixed unless explicitly stated
- Imported/source-owned fields must remain read-only unless explicitly marked editable
- Do not invent hidden business logic
- Do not create new entities unless explicitly requested
- Do not simplify supplier/admin boundaries
- Use URL-state for filters, pagination, sorting
- Do not generate backend code
- Do not generate database code
- Do not generate auth implementation
- Do not assume all products are event/session-based only
- Respect venue admission/open-date product behavior where relevant
```

---

## 3. APP SPLIT + FRONTEND ARCHITECTURE PROMPT

```
Task: Design the high-level frontend architecture for two separate React applications for Daibilet

CONTEXT

This is frontend-only planning and scaffolding.
Backend already exists and is fixed.

Applications:
1. Admin frontend
2. Supplier frontend

Public frontend and buyer account exist separately and are out of primary scope.

GOAL

Propose production-oriented architecture for:
- route structure
- module structure
- shared UI primitives
- shared app conventions
- app-specific navigation

KEY PRODUCT RULES

- Admin sees full platform scope
- Supplier sees only supplier-scoped data
- Inventory is source-aware
- Orders are unified across channels
- Venue may be a content hub and/or a sellable admission product
- City, Venue, Landing pages are content hubs and important SEO entry points

ADMIN MAJOR MODULES
- Dashboard
- Events
- Venues
- Cities
- Suppliers
- Orders
- Users
- Refunds
- Support
- Articles
- Collections
- Landings
- Promo Blocks
- SEO Audit
- Settings
- Logs / Diagnostics

SUPPLIER MAJOR MODULES
- Dashboard
- My Events
- My Venues / Admission products
- My Orders / Sales
- Refund / Request statuses
- Reports
- Integrations
- Support
- Company Profile

OUTPUT
- high-level architecture
- route map
- module map
- shared/admin/supplier boundaries
- list/detail conventions
- no backend changes
```

---

## 4. ADMIN SHELL PROMPT (обогащённый)

```
Task: Implement the initial shell for the Daibilet Admin frontend

CONTEXT

This is a separate internal application.
Frontend-only.
Backend already exists and is fixed.

GOAL

Build the shell and route placeholders for the Admin application.

ADMIN NAVIGATION
- Dashboard
- Events
- Venues
- Cities
- Suppliers
- Orders
- Users
- Refunds
- Support
- Articles
- Collections
- Landings
- Promo Blocks
- SEO Audit
- Settings
- Logs / Diagnostics

SHARED UI PATTERNS REQUIRED
- sidebar navigation
- topbar / page header
- page container
- filter bar zone
- table/list content zone
- tabbed detail layout
- detail header with actions
- loading / empty / error states
- warning / diagnostic banners
- read-only section styling
- partially editable section styling

VISUAL RULES
- practical B2B interface
- medium-high density
- no marketing-style layout
- room for status badges, source badges, diagnostics

OUTPUT
- Admin app shell
- navigation scaffolding
- placeholder route screens
- reusable admin page skeletons
```

---

## 5. SUPPLIER SHELL PROMPT (обогащённый)

```
Task: Implement the initial shell for the Daibilet Supplier frontend

CONTEXT

This is a separate supplier-facing application.
Frontend-only.
Backend already exists and is fixed.

GOAL

Build the shell and route placeholders for the Supplier application.

SUPPLIER NAVIGATION
- Dashboard
- My Events
- My Venues / Admission
- My Orders / Sales
- Refunds / Requests
- Reports
- Integrations
- Support
- Company Profile

KEY PRODUCT RULES
Supplier may work in one or more modes:
- MANUAL
- API
- HYBRID

Supplier records may be:
- native/editable
- imported/read-only
- API-controlled/partially editable
- hybrid

Supplier may also manage venue admission/open-date products when allowed.

SHARED UI PATTERNS REQUIRED
- sidebar navigation
- page header
- list/detail layouts
- read-only and partially editable blocks
- integration diagnostics areas
- state banners
- scoped action menus

OUTPUT
- Supplier app shell
- navigation
- placeholder routes
- supplier-specific page skeletons
```

---

## 6–15. Модули с DTO (полный текст)

Из‑за объёма детальные промпты **§6 Admin Events** … **§15 Supplier Integrations** вынесены в отдельный файл, чтобы основной документ оставался удобным для навигации:

**→ [`lovable-prompts-admin-supplier-v2-modules-6-15.md`](lovable-prompts-admin-supplier-v2-modules-6-15.md)**

---

## 16. SHARED UI RULES PROMPT

```
Task: Define shared UI rules for Daibilet Admin and Supplier applications

CONTEXT

Both apps should feel related, but not identical.

Admin:
- broader
- denser
- more operational

Supplier:
- calmer
- simpler
- more scoped

GOAL

Define reusable patterns for:
- page header
- section header
- filter bar
- data table shell
- status badges
- source badges
- sync badges
- sales mode badges
- venue sales mode badges
- tabbed detail pages
- summary cards
- empty states
- read-only groups
- partially editable groups
- warning banners
- action menus

RULES

- practical B2B interface
- no decorative or marketing-like patterns
- consistent spacing
- predictable tables and detail layouts
- strong visibility of source-aware states

OUTPUT
- shared component guidance
- visual differentiation rules for admin vs supplier
- reusable UI patterns
```

---

## 17. REALISTIC STATES / EDGE CASES PROMPT

```
Task: Refine Daibilet Admin and Supplier UI patterns for realistic operational states

FOCUS STATES

- loading
- empty
- error
- no results after filtering
- archived record
- unpublished record
- read-only imported record
- partially editable API/hybrid record
- integration warning
- integration error
- venue with no admission
- venue admission active
- hybrid venue
- refund request present
- permission-restricted action

REQUIREMENTS

- show how these states appear on list pages
- show how these states appear on detail pages
- keep behavior consistent across admin and supplier
- use practical B2B tone
- avoid exaggerated alert design

OUTPUT
- reusable state patterns
- examples for events, venues, suppliers, and orders
```

---

## После генерации в Lovable

Сверить эндпоинты и поля с `packages/backend` и существующим `packages/frontend-admin-v3`; подставить реальные DTO вместо примеров из промптов.
