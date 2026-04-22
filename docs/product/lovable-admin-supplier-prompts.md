# Промпты для генерации Admin / Supplier UI (Lovable)

**Проект:** Daibilet  
**Назначение:** пошаговые промпты для инструмента вроде Lovable: сначала контекст и оболочки, затем модули. Бэкенд не меняем — только фронтенд под существующие контракты.

**Обогащённый второй проход** (DTO, JSON, enum’ы, табы по модулям): [`lovable-prompts-admin-supplier-v2-enriched.md`](lovable-prompts-admin-supplier-v2-enriched.md).

**Классификация на формах Event/Venue** (1 primary + до 2 secondary + теги отдельно; три follow-up сообщения для Lovable): [`lovable-prompts-admin-supplier-v3-production-tight.md` §13](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue).
**Интеграции поставщиков в админке** (operational: connection/mapping/runs/issues; URL-state): [`lovable-prompts-admin-supplier-v3-production-tight.md` §14](lovable-prompts-admin-supplier-v3-production-tight.md#14-admin-supplier-integrations).

**Порядок использования:** давать промпты **по номерам** (1 → 2 всегда как напоминание ограничений в каждом задачном запросе → 3 → 4/5 → модули 6–12). При сборке **форм классификации** на detail **Event** и **Venue** (Admin и Supplier) — отдельно **[v3 §13 — Classification UI](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue)** (основной промпт + 2 коротких follow-up). Затем разделы **13–16** этого файла (shared UI, states, buyer ref, venue admission).

---

## Оглавление

| # | Раздел |
|---|--------|
| 1 | [MASTER CONTEXT PROMPT](#1-master-context-prompt) · [заметка: контентные хабы (RU)](#11-note-content-hubs-ru) |
| 2 | [GLOBAL HARD CONSTRAINTS PROMPT](#2-global-hard-constraints-prompt) |
| 3 | [Архитектура двух frontend-приложений](#3-prompt--архитектура-двух-frontend-приложений) |
| 4 | [Admin app shell](#4-prompt--admin-app-shell) |
| 5 | [Supplier app shell](#5-prompt--supplier-app-shell) |
| + | [Классификация Event/Venue — **v3 §13** (категории + теги, три сообщения)](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue) |
| 6–12 | [Модули (Events, Suppliers, Orders, Supplier …)](#6-prompt--admin-events-list--detail) |
| 13 | [Shared UI rules](#13-prompt--admin--supplier-shared-ui-rules) |
| 14 | [State-cases](#14-prompt--state-cases) |
| 15 | [Buyer account — только референс](#15-prompt--buyer-account--только-как-референс) |
| 16 | [Venue Admission (open-date)](#16-prompt--venue-admission-open-date-ticket-product) |
| — | [Шаблон «один модуль» (контракт)](#шаблон-один-модуль--спека-для-интеграции) |

---

## 1. MASTER CONTEXT PROMPT

Это стартовый базовый промт, который надо дать первым.

```
Project: Daibilet

You are helping build UI applications for an existing event marketplace platform.

There are 4 platform surfaces:
1. Public frontend — public catalog, SEO pages, event/venue/city pages, collections, landings, checkout entry
2. Buyer account — customer account area inside the public frontend
3. Admin frontend — internal platform administration panel
4. Supplier frontend — supplier cabinet for partners

Important architectural rule:
The backend already exists and is the single source of truth.
Do not redesign backend architecture.
Do not invent a new database schema.
Do not introduce Supabase, Firebase, or any replacement backend.
Do not infer new API endpoints unless explicitly specified.
Do not replace existing routing or role model unless explicitly instructed.

Your task in this workspace:
Generate frontend UI only for:
- Admin frontend
- Supplier frontend

Do NOT generate:
- backend logic
- database schema
- auth architecture
- server functions
- fake business rules not present in the provided contracts

Product context:
Daibilet works with three event/inventory channels:
1. Imported events from external providers such as Ticketscloud and Teplohod.info, usually sold through external widgets
2. Native internal events created by suppliers in supplier cabinet or by admins manually
3. API-integrated partner events coming from external ticketing systems

Because of this, event records may be:
- fully editable
- partially editable
- read-only with local overrides
- integration-controlled

UI must respect source-aware behavior:
- imported/source-owned fields are often read-only
- native fields may be editable
- API-integrated fields may be read-only or partially overrideable
- the UI must not pretend everything is editable

Information architecture — content hubs (Cities, Venues, Landings):
- Cities, Venues, and Landings are not only reference/catalog “directories”: they are also SEO surfaces and navigational entry points. Treat them as content hubs, not trivial rows.
- Organic and navigational traffic often lands on hub pages first (intent queries like “what to do in SPb”, “river cruises SPb”, “museum X tickets”), not only on individual event detail pages.
- City page: large SEO/nav hub for a city — demand, collections, categories, venues, thematic entry points.
- Venue page: hub around a specific place — venue story, current events, permanent/admission products when applicable, media, SEO surface (e.g. /venues/:slug).
- Landing page: intent-driven thematic or commercial hub (e.g. river cruises, bridges, jazz on water) — often city-scoped canonical URLs such as /cities/:citySlug/:landingSlug.
- Multi-city landings: treat as one landing concept that may have city-specific instances with their own canonical, SEO, hero, curated events — not necessarily a single flat page for all cities.
- In Admin UI, City / Venue / Landing detail must support full editorial surfaces where the contract allows: SEO fields, hero and content blocks, curated links to events/collections/articles/promo, readiness/quality/indexability signals — not only minimal name/slug forms.
- Public frontend (reference for alignment): a network of hubs (city hubs, venue hubs, landing hubs) with events as detail endpoints inside funnels; admin modules should reflect that importance.

Event and Venue classification (strict, shared across Admin and Supplier):
- Platform categories: exactly 1 PRIMARY required, 0–2 SECONDARY optional, never more than 3 category selections total; fixed top-level category set controlled by the platform.
- Tags are optional supplemental labels only; tags do not replace categories; do not merge category and tag pickers into one undifferentiated multiselect.
- Reuse one classification component family on Admin Event Detail, Supplier Event Detail, Admin Venue Detail, Supplier Venue Detail. Detailed copy-paste prompt: see companion doc v3 §13 «CLASSIFICATION UI FOR EVENT AND VENUE» (three Lovable messages: main + ambiguity guard + consistency across screens).

Applications to build:
1. Admin app — full internal operator interface
2. Supplier app — supplier-scoped cabinet, only for the supplier’s own entities and sales

Do not mix admin and supplier into one application.
Treat them as separate frontend apps with shared design language and shared platform concepts.

Design style:
- clean professional B2B interface
- practical, not decorative
- medium-high information density
- clear tables, filters, tabs, drawers, forms
- reusable patterns
- predictable navigation
- explicit states: loading, empty, error, read-only, partially editable, sync issues, archived, unpublished

Implementation bias:
- production-oriented React UI
- modular pages and components
- consistent list/detail patterns
- no speculative analytics widgets
- no visual experiments
- no marketing-style landing design in admin or supplier apps

When uncertain:
- prefer read-only over editable
- prefer minimal reversible UI decisions
- prefer existing provided contract over invention
- mark TODOs instead of guessing business logic
```

### 1.1 Note: content hubs (RU)

Каноническая формулировка:

> **Города / площадки / лендинги** — не только «справочники», но и SEO, и навигационные входы.

Дальше — то же, что в MASTER CONTEXT:

- Интентный трафик часто приходит на хабы раньше, чем на карточку события.
- **Город** — крупный хаб спроса внутри города (подборки, категории, площадки, тематические входы).
- **Площадка** — хаб вокруг места (события, постоянные продукты, контент, SEO вокруг точки).
- **Лендинг** — тематический/коммерческий хаб под запрос; **мультилендинг** — одна смысловая концепция + **отдельные city-bound** страницы с каноном и контентом на город, а не обязательно одна страница «на все города».
- В **админке** для этих сущностей нужны полноценные экраны: SEO, блоки контента, связи с событиями/коллекциями/статьями/промо, сигналы готовности — в рамках контракта API.

Канон по лендингам: [`product/landings.md`](landings.md). Верхний вход по продукту: [`PROJECT-FOUNDATION.md`](../PROJECT-FOUNDATION.md).

---

## 2. GLOBAL HARD CONSTRAINTS PROMPT

Этот кусок лучше повторять почти в каждом отдельном запросе.

```
Hard constraints for this task:
- Existing backend is fixed
- Existing API contracts are fixed
- Existing role model is fixed
- Existing permissions are fixed
- Existing routing conventions are fixed unless explicitly stated otherwise
- Imported/source-owned fields must remain read-only unless explicitly marked editable
- Do not invent hidden business logic
- Do not create new entities unless explicitly requested
- Do not simplify supplier/admin permission boundaries
- Do not replace URL-state driven filters with local-only UI state
- Do not generate backend code
- Do not generate database code
- Do not generate auth implementation
```

---

## 3. PROMPT — архитектура двух frontend-приложений

Этот промт нужен, чтобы сначала собрать структуру, а не полезть сразу в случайные страницы.

```
Design the high-level frontend architecture for two separate React applications for Daibilet:

1. Admin frontend
2. Supplier frontend

Important:
- This is frontend-only planning and scaffolding
- Backend already exists and must not be changed
- Do not merge admin and supplier into a single app
- Public frontend and buyer account are out of scope for this task

Requirements:
- Propose a clean route structure for each app
- Propose shared layout patterns
- Propose shared UI primitives that can be reused across both apps
- Propose folder/module structure
- Propose navigation structure for both apps
- Show which modules are shared conceptually and which are app-specific
- Respect source-aware event behavior and role-scoped access
- Keep the architecture production-oriented and modular
- Cities, Venues, and Landings are content-hub modules in admin: plan routes and detail layouts for SEO, editorial blocks, linking to events/collections/articles, and quality/readiness — not only minimal CRUD list/detail for name/slug

Admin app should cover:
- dashboard
- events
- venues
- categories (catalog; classification on event/venue forms — v3 §13)
- tags (catalog; classification on event/venue forms — v3 §13)
- cities
- suppliers
- orders
- users
- refunds
- support
- articles
- collections
- landings
- promo blocks
- SEO audit
- settings
- logs/diagnostics

Supplier app should cover:
- dashboard
- my events (including same classification UI family as admin where contract allows — v3 §13)
- my venues / admission when applicable (same classification rules on venue detail — v3 §13)
- my sales/orders
- refunds/statuses relevant to supplier
- profile/company info
- support
- reports
- integrations / sync status for API/imported suppliers

Output:
- recommended frontend architecture
- route map
- module breakdown
- shared component ideas
- layout guidance
- no backend changes
```

---

## 4. PROMPT — Admin app shell

Это первый реальный этап визуальной реализации.

```
Implement the initial shell for the Daibilet Admin frontend.

Context:
- This is a separate internal application
- Backend already exists and must not be changed
- Build frontend UI shell only
- Use a practical B2B admin style
- Prefer React production-ready code structure

Hard constraints:
- Do not generate backend code
- Do not invent APIs
- Do not merge supplier functionality into admin navigation
- Use clear reusable patterns
- Keep navigation scalable

Admin app requirements:
Create the main application shell including:
- sidebar navigation
- top bar / page header area
- content container structure
- route placeholders for major modules
- consistent page layout system
- support for list/detail pages
- support for filters above tables
- support for tabs on detail pages
- support for loading / empty / error states
- support for permission-aware action placement
- City, Venue, and Landing detail areas should reserve space for hub-style surfaces (SEO tab, content blocks, linked entities) per contracts — not treat them as secondary “directory” forms only

Main admin sections:
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

UX requirements:
- medium-high information density
- practical and calm visual language
- clear hierarchy
- no marketing-style visuals
- explicit state handling
- room for table actions, badges, and diagnostics

Generate:
- admin shell structure
- sidebar navigation
- layout scaffolding
- placeholder pages for all sections
- reusable page container patterns
- reusable list/detail page skeleton patterns
```

---

## 5. PROMPT — Supplier app shell

Отдельно, не смешивая с admin.

```
Implement the initial shell for the Daibilet Supplier frontend.

Context:
- This is a separate supplier-facing application
- Backend already exists and must not be changed
- Build frontend UI shell only
- This is not a smaller copy of the admin app
- This is a supplier-scoped cabinet focused on the supplier’s own inventory, sales, profile, and integrations

Hard constraints:
- Do not generate backend code
- Do not invent APIs
- Do not expose admin-only sections
- Respect supplier scope
- Respect source-aware read-only vs editable behavior

Supplier app requirements:
Create the main application shell including:
- sidebar navigation
- top bar / page header
- content layout
- route placeholders
- dashboard area
- list/detail layouts
- loading / empty / error states
- read-only and partially editable states
- integration diagnostics areas

Main supplier sections:
- Dashboard
- My Events
- My Orders / Sales
- Refunds / Requests status
- Reports
- Integrations
- Support
- Company Profile

Product behavior:
Supplier may work in different modes:
- manual / native
- imported
- API-integrated
- hybrid

This means UI must support:
- editable native records
- read-only imported records
- partially editable API records
- diagnostics and sync status for integration-controlled records

Generate:
- supplier shell structure
- supplier navigation
- layout scaffolding
- placeholder pages
- reusable supplier-scoped page patterns
```

---

## 6. PROMPT — Admin Events list + detail

Один из ключевых модулей.

```
Implement the Admin Events module for Daibilet:
1. Events List page
2. Event Detail page layout

Context:
- Existing backend already has event domain logic
- This task is frontend-only
- Do not invent backend changes
- Admin must see source-aware event information

Important event channel context:
Events may come from:
- Ticketscloud import
- Teplohod import
- native internal creation
- partner API integration

Admin UI must clearly reflect:
- inventory source
- sales mode
- supplier
- sync/integration state
- read-only vs editable areas
- override presence
- publication state
- SEO/quality hints

Events List requirements:
- search
- filters
- source filter
- supplier filter
- publish status filter
- sync state filter
- quick filters for SEO/quality issues if available
- sortable columns
- pagination
- row actions
- URL-state driven filters and sorting

Suggested columns:
- title
- supplier
- source
- sales mode
- publish status
- sync/integration status
- last session or activity
- updated at
- quality/SEO indicators
- actions

Event Detail layout requirements:
Use tabbed detail layout, such as:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- SEO / Quality
- Integration / Source
- Orders / Sales summary
- Activity / Logs

Important UI behavior:
- source-owned fields should be visibly read-only
- partially editable groups should be clearly labeled
- imported/API-origin metadata should be visible
- external IDs and last sync data should be visible in integration/source areas
- admin actions should be explicit and grouped by risk

Generate:
- production-oriented React UI structure
- list page
- detail page layout
- reusable badges and sections for source/sync/read-only states
- no backend code
```

---

## 7. PROMPT — Admin Suppliers list + detail

```
Implement the Admin Suppliers module for Daibilet:
1. Suppliers List page
2. Supplier Detail page layout

Context:
- Frontend only
- Existing backend is fixed
- Admin must manage all suppliers across multiple operating modes

Supplier operating modes:
- manual
- API
- hybrid
- imported/external-oriented

Suppliers List requirements:
- search
- status filter
- supplier mode filter
- source/integration filter if applicable
- pagination
- sorting
- row actions
- URL-state driven filters

Suggested columns:
- supplier name
- mode
- status
- events count
- orders/sales count if available
- integration status summary
- updated at
- actions

Supplier Detail page tabs:
- Overview
- Events
- Orders / Sales
- Integrations
- Profile / Company Info
- Support / Requests
- Activity / Logs

Important detail behavior:
- clearly show supplier mode
- show whether supplier uses native events, imports, API integration, or hybrid flow
- show operational status
- show integration health summary if relevant
- avoid finance over-engineering at this stage
- use clear action hierarchy

Generate:
- list page
- detail page layout
- badges and summary cards for supplier mode and integration health
- modular React UI
- no backend logic
```

---

## 8. PROMPT — Admin Orders + Refunds

```
Implement the Admin Orders and Refunds module for Daibilet:
1. Orders List page
2. Order Detail page layout
3. Refund Requests list/page section

Context:
- Frontend only
- Existing backend already defines order lifecycle and projections
- Orders may come from internal checkout and external/imported channels
- Admin is the full operator layer over all order sources

Critical product rule:
The same core Order entity may be visible in:
- Admin
- Buyer account
- Supplier cabinet

Do not model them as separate orders.
Admin sees the full operational representation.

Orders List requirements:
- search by order number, email, phone, customer
- status filter
- source filter
- supplier filter
- refund status filter
- date range filter
- pagination
- sorting
- row actions
- URL-state driven filters

Suggested columns:
- order number / id
- customer
- event / offer summary
- supplier
- source
- amount
- status
- refund status
- purchased at
- actions

Order Detail layout:
- Overview
- Customer
- Items / Tickets
- Payment / Source
- Supplier Attribution
- Refunds / Requests
- Timeline / Activity

Refund Requests area:
- show refund requests linked to order
- show statuses clearly
- show manual-processing oriented UX
- do not assume fully automated refund engine
- show notes / status history placeholders if needed

Important UI behavior:
- clearly show order source
- clearly show whether the order is customer-visible and supplier-relevant
- show operational status without inventing financial engine behavior
- support manual and mixed operational workflows

Generate:
- orders list page
- order detail layout
- refund request list/section UI
- reusable status badges
- frontend only
```

---

## 9. PROMPT — Supplier Dashboard

```
Implement the Supplier Dashboard for Daibilet.

Context:
- Frontend only
- Supplier sees only their own scoped data
- Supplier may be manual, imported, API-integrated, or hybrid
- Dashboard should be operational, not decorative

Dashboard goals:
- give supplier a quick overview of their presence on the platform
- show sales / orders summary
- show event health summary
- show integration or sync warnings if relevant
- show pending requests / moderation states if relevant
- show practical next actions

Suggested dashboard blocks:
- total active events
- draft / unpublished / moderation-needed events
- recent orders / sales summary
- refunds / requests summary
- integration status summary
- support/request shortcuts
- recent activity
- quick links to key sections

Behavior:
- manual suppliers should see content/action-oriented blocks
- API/imported suppliers should see integration/status-oriented blocks
- hybrid suppliers should see both kinds where relevant

Important:
- do not invent advanced finance widgets
- do not invent backend analytics not provided in contracts
- prefer practical and believable dashboard content

Generate:
- dashboard page layout
- reusable summary cards
- alert/warning sections
- quick action components
- frontend only
```

---

## 10. PROMPT — Supplier My Events

```
Implement the Supplier “My Events” module for Daibilet:
1. My Events List page
2. My Event Detail page layout

Context:
- Frontend only
- Supplier can only see their own events
- Event records may be native, imported, API-integrated, or hybrid
- UI must respect read-only vs editable rules

My Events List requirements:
- search
- filters
- source filter
- publication/moderation status filter
- sync status filter if relevant
- pagination
- sorting
- URL-state driven filters

Suggested columns:
- title
- source
- publication/moderation state
- editability state
- sync/integration state
- last session / activity
- updated at
- actions

My Event Detail requirements:
Use tabbed layout, such as:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- Orders / Sales
- Integration / Source
- Support / Requests

Key behavior:
- clearly show which fields are editable
- clearly show which are read-only because they are source-owned
- for imported/API records, show sync/source diagnostics
- for native records, support a more editable UI
- for hybrid records, show mixed editable and read-only sections without confusion

Do not:
- expose admin-only controls
- expose platform-global taxonomy controls
- expose full internal diagnostics meant only for admin
- invent publish workflows beyond the provided business rules

Generate:
- list page
- detail page layout
- reusable read-only / partially editable section patterns
- frontend only
```

---

## 11. PROMPT — Supplier Orders / Sales

```
Implement the Supplier Orders / Sales module for Daibilet.

Context:
- Frontend only
- Supplier only sees orders relevant to their own inventory
- Orders may originate from internal checkout or external/imported/API channels
- Supplier sees a scoped operational view, not the full internal admin representation

Orders/Sales List requirements:
- search
- date range
- status filter
- source filter
- refund/request status filter
- pagination
- sorting
- URL-state driven filters

Suggested columns:
- order number
- event / product
- amount
- source
- status
- refund/request status
- purchased at
- actions

Detail requirements:
- Overview
- Purchased items summary
- Customer info if allowed by business rules
- Refund/request section
- Source / channel information
- Activity / history summary

Important:
- do not expose internal admin-only fields
- do not invent a full finance engine
- do not assume payout mechanics
- keep this module operational and believable

Generate:
- supplier orders list
- detail layout
- status badges and filters
- frontend only
```

---

## 12. PROMPT — Supplier Integrations

```
Implement the Supplier Integrations module for Daibilet.

Context:
- Frontend only
- This module is especially relevant for API-integrated, imported, and hybrid suppliers
- It is not a full self-service integration studio
- It is an operational visibility and diagnostics surface

Goals:
- show current integration/source connections
- show sync health
- show last sync time
- show warning/error states
- show imported/API channel summary
- show basic request/support entry points

Suggested sections:
- Integration Summary
- Connected Sources
- Sync Status
- Last Sync / Last Error
- Imported Records Summary
- Issues / Warnings
- Support / Request actions

Important constraints:
- do not invent webhook management
- do not invent credentials management unless explicitly requested
- do not invent mapping UI
- do not invent advanced self-service API tooling
- focus on visibility and diagnostics

Generate:
- integrations page
- source cards
- sync health components
- warnings/errors presentation
- frontend only
```

---

## 13. PROMPT — Admin + Supplier shared UI rules

```
Create a shared UI language proposal for two related B2B applications:
- Daibilet Admin frontend
- Daibilet Supplier frontend

Requirements:
- They must feel related but not identical in scope
- Admin should feel broader, more operational, and denser
- Supplier should feel simpler, calmer, and more scoped
- Both should reuse similar primitives where possible

Define and demonstrate reusable patterns for:
- page header
- section header
- hub-entity detail layouts (city / venue / landing): SEO + editorial sections + linked content, distinct from plain operational CRUD
- filter bar
- data table shell
- status badges
- source badges
- sync/integration health badges
- tabbed detail pages
- summary cards
- empty states
- error states
- read-only field groups
- partially editable field groups
- warning/diagnostic banners
- actions menus

Avoid:
- decorative marketing patterns
- one-off visual styles
- inconsistent spacing logic
- playful styles
- concept-only mockups

Output:
- shared component recommendations
- visual behavior rules
- app-specific differences between admin and supplier
- production-oriented UI guidance
```

---

## 14. PROMPT — State-cases

Лучше подключать после shell и основных страниц.

```
Refine the Daibilet Admin and Supplier UI patterns to properly support realistic operational states.

Focus on these states:
- loading
- empty
- error
- archived
- unpublished
- moderation required
- integration sync warning
- integration sync error
- read-only imported record
- partially editable hybrid record
- deleted / unavailable record
- optimistic lock conflict placeholder
- no results in filtered table
- permission restricted action

Requirements:
- produce practical UI patterns, not abstract notes
- show how these states should appear in list pages
- show how these states should appear in detail pages
- keep behavior consistent across admin and supplier apps
- avoid decorative or exaggerated alert design

Output:
- state handling patterns
- reusable components or visual patterns
- examples for events, suppliers, and orders pages
```

---

## 15. PROMPT — Buyer account — только как референс

Не основная задача Lovable-контура admin/supplier; пригодится отдельно.

```
Design a buyer account area for Daibilet that lives inside the public frontend.

Context:
- This is not part of admin or supplier apps
- Buyer account is customer-facing
- It should be order-centric
- Existing backend already defines orders and refund-request behavior

Main sections:
- My Orders
- Order Detail
- Refund Requests
- Profile
- Support entry points

Important:
- customer only sees their own orders
- refund flow is request-based, not necessarily a fully automated money flow
- orders may come from internal checkout and external/imported/provider-linked channels
- the buyer should still see a unified order history where available

Design goals:
- simple and clear
- customer-friendly but not overly playful
- focused on “what I bought”, “where is my ticket”, “can I request a refund”

Generate:
- account area structure
- key pages
- simple route map
- page layout concepts
- frontend only
```

---

## 16. PROMPT — Venue Admission (open-date ticket product)

Расширение модели **Venue**: площадка может продавать **входные билеты** (open-date / период действия) как отдельный продуктовый слой, не смешивая с Event.

Перед задачей повторить **§1 MASTER CONTEXT** и **§2 HARD CONSTRAINTS**. Поля API и PATCH/POST — **не выдумывать**: вставить реальные DTO из бэкенда в блок «Backend contract» перед генерацией.

```
Task: Extend Venue model UI to support admission (open-date ticket product)

CONTEXT

In Daibilet, a Venue is not only a content hub.
It can also act as a sellable product via admission tickets.

A venue may:
- have no sales
- have only events
- have only admission
- have both (hybrid)

HARD CONSTRAINTS

- Do not force admission into Event model
- Treat admission as separate product layer
- Do not assume sessions are required
- Support open-date usage
- Do not invent API endpoints or persistence; use provided contracts only

MODULE SCOPE

Implement:

1. Venue Admission section in Admin
2. Venue Admission section in Supplier app
3. Indicators in Venue List

DATA MODEL (UI-level)

venueSalesMode:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

admissionType:
- OPEN_DATE
- DATE_RANGE

Admission fields:
- title
- description
- price tiers
- currency
- validity period (optional)
- rules / conditions

UI REQUIREMENTS

Admin:
- tab: "Admission"
- editable form
- visible status
- clear separation from Events

Supplier:
- editable (if allowed by contract/permissions)
- clear difference from events

List:
- show badges:
  - Admission
  - Events
  - Hybrid

Public (reference only):
- show "Buy ticket" CTA
- separate from events list

STATES

- no admission
- admission active
- admission disabled
- hybrid mode

OUTPUT

Generate:
- Admin Venue Admission tab
- Supplier Venue Admission UI
- Venue list indicators
- clear separation from events
```

---

## Шаблон «один модуль» — спека для интеграции

Для **каждого** отдельного модуля после shell имеет смысл давать один запрос с полем ниже (можно копировать и заполнять вручную или из OpenAPI).

| Поле | Содержание |
|------|------------|
| **Что строим** | Экраны, сценарии, границы модуля |
| **Контекст** | Роль (admin/supplier), домен, ссылки на канон-доки репозитория |
| **Hard constraints** | Повторить §2 + специфичные для модуля |
| **DTO** | Типы запроса/ответа, ссылки на существующие типы в коде |
| **Query params** | Фильтры, сортировка, пагинация, `lite`, версии |
| **Response example** | Один реальный пример JSON (без выдуманных полей) |
| **Readonly / editable** | По полям или группам полей |
| **Tabs** | Состав вкладок detail |
| **Allowed actions** | Кнопки, меню, риск (destructive / нужно подтверждение) |
| **Required states** | loading, empty, error, read-only, sync, moderation, 403 |

---

## Связь с репозиторием

- Канон админки в репо: [`docs/ADMIN_V3.md`](../ADMIN_V3.md), план: [`docs/admin-v3/grand-master-plan.md`](../admin-v3/grand-master-plan.md).
- Поставщик (отложенное): [`docs/future/SUPPLIER.md`](../future/SUPPLIER.md).

При интеграции сгенерированного UI с текущим кодом — сверять маршруты и контракты с существующим `packages/frontend-admin-v3` и бэкендом, а не дублировать выдуманные эндпоинты.
