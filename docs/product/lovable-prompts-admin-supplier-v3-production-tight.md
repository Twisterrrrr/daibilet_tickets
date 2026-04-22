# Lovable — v3: production-tight промпты (критичные модули)

**Проект:** Daibilet  
**Назначение:** более жёсткий формат, ближе к **прямой вставке без правок** для самых критичных модулей **и кросс-модульной классификации (§13)**. В каждом блоке уже есть: контекст, ограничения, DTO, query params, JSON-примеры, readonly/editable, табы, состояния, UI expectations. **§13** — отдельно от §1–§12: единое семейство UI классификации на detail Event/Venue в Admin и Supplier.

**Связь с предыдущими пакетами:**

| Пакет | Файл | Когда использовать |
|--------|------|---------------------|
| v1 | [`lovable-admin-supplier-prompts.md`](lovable-admin-supplier-prompts.md) | Старт: MASTER, shells, общая логика |
| v2 | [`lovable-prompts-admin-supplier-v2-enriched.md`](lovable-prompts-admin-supplier-v2-enriched.md) + [`lovable-prompts-admin-supplier-v2-modules-6-15.md`](lovable-prompts-admin-supplier-v2-modules-6-15.md) | Полный обзор модулей с DTO |
| **v3** | этот файл | **Один модуль = один промпт**, максимально «закрытый» контракт перед генерацией UI |

**Стоит ли делать v3 отдельно?** Да, если цель — **меньше расхождений с контрактом** и меньше правок после Lovable. Минус: дублирование с v2 — при изменении API **обновлять оба** или держать v3 как «эталон для копипаста» и периодически сверять с бэкендом.

**Порядок использования:** не склеивать все § в одно сообщение; давать **по одному** промпту + при необходимости повтор **GLOBAL HARD CONSTRAINTS** из v1/v2.

| § | Модуль |
|---|--------|
| [1](#1-admin-events) | Admin Events |
| [2](#2-admin-venues) | Admin Venues |
| [3](#3-admin-orders) | Admin Orders |
| [4](#4-supplier-my-events) | Supplier My Events |
| [5](#5-supplier-my-venues--admission) | Supplier My Venues / Admission |
| [6](#6-supplier-orders--sales) | Supplier Orders / Sales |
| [7](#7-admin-suppliers) | Admin Suppliers |
| [8](#8-admin-cities--landings-as-content-hubs) | Admin Cities + Landings (хабы) |
| [9](#9-admin-settings) | Admin Settings |
| [10](#10-admin-promo-blocks--storefront-control) | Admin Promo Blocks / Storefront |
| [11](#11-admin-seo-audit) | Admin SEO Audit |
| [12](#12-admin-support) | Admin Support |
| [13](#13-classification-ui-for-event-and-venue) | Classification UI (Event / Venue) |
| [14](#14-admin-supplier-integrations) | Admin Supplier Integrations |

---

## 1. ADMIN EVENTS

```
Task: Implement the Admin Events module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- Do NOT invent database schema.
- Do NOT invent new endpoints.
- Do NOT generate backend code.
- Do NOT simplify permissions.
- Use production-oriented React UI structure.
- Use URL-state for filters, pagination, and sorting.

This module belongs to the Admin application.
Admin sees all events across all suppliers and all inventory/sales channels.

Daibilet event source model:
Inventory source:
- PORTAL
- ADMIN
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Sales mode:
- INTERNAL_CHECKOUT
- EXTERNAL_WIDGET
- EXTERNAL_API

Because of this:
- some events are fully editable
- some are source-owned and mostly read-only
- some are partially editable / override-capable
- UI must clearly distinguish read-only vs editable zones

Implement:
1. Events List page
2. Event Detail page
3. Reusable badges and source/sync state components

Backend contract

Endpoints:
GET /api/v1/admin/events
GET /api/v1/admin/events/:id

Query params for list:
- search?: string
- supplierId?: string
- source?: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- salesMode?: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API'
- status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
- syncStatus?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
- hasSeoIssues?: boolean
- hasQualityIssues?: boolean
- isEditable?: boolean
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'lastSessionAt'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    title: string
    slug: string
    supplierId: string | null
    supplierName: string | null
    source: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    salesMode: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API'
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    syncStatus?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
    isEditable: boolean
    hasOverrides: boolean
    hasSeoIssues: boolean
    hasQualityIssues: boolean
    venueName?: string | null
    lastSessionAt?: string | null
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  slug: string
  supplier: {
    id: string | null
    name: string | null
    mode?: 'MANUAL' | 'API' | 'HYBRID' | null
  }
  source: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
  salesMode: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isEditable: boolean
  hasOverrides: boolean
  sync: {
    status?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
    lastSyncAt?: string | null
    providerName?: string | null
    externalEventId?: string | null
  }
  venue: {
    id?: string | null
    name?: string | null
  }
  content: {
    title: string
    shortDescription?: string | null
    fullDescription?: string | null
  }
  pricingSummary?: {
    minPrice?: number | null
    maxPrice?: number | null
    currency: 'RUB'
  }
  sessionsSummary?: {
    hasSessions: boolean
    nextSessionAt?: string | null
    lastSessionAt?: string | null
  }
  seo: {
    hasSeoIssues: boolean
    issues: string[]
  }
  quality: {
    hasQualityIssues: boolean
    issues: string[]
  }
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "evt_1",
      "title": "Пять разводных мостов",
      "slug": "pyat-razvodnyh-mostov",
      "supplierId": "sup_1",
      "supplierName": "Невский Фарватер",
      "source": "TEPLOHOD",
      "salesMode": "EXTERNAL_WIDGET",
      "status": "PUBLISHED",
      "syncStatus": "OK",
      "isEditable": false,
      "hasOverrides": true,
      "hasSeoIssues": false,
      "hasQualityIssues": false,
      "venueName": "Синопская наб., 10",
      "lastSessionAt": "2026-04-25T20:00:00Z",
      "updatedAt": "2026-04-21T12:00:00Z"
    },
    {
      "id": "evt_2",
      "title": "Воскресный джаз на воде",
      "slug": "voskresnyj-dzhaz-na-vode",
      "supplierId": "sup_1",
      "supplierName": "Невский Фарватер",
      "source": "PORTAL",
      "salesMode": "INTERNAL_CHECKOUT",
      "status": "DRAFT",
      "syncStatus": null,
      "isEditable": true,
      "hasOverrides": false,
      "hasSeoIssues": true,
      "hasQualityIssues": false,
      "venueName": "Синопская наб., 10",
      "lastSessionAt": null,
      "updatedAt": "2026-04-21T15:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1240
}

Readonly / editable rules:
- source = PORTAL or ADMIN -> usually editable
- source = TICKETSCLOUD or TEPLOHOD -> core content, pricing, schedule are usually read-only
- source = PARTNER_API -> partially editable, usually content/media override allowed, pricing/schedule often read-only
- sync metadata and external ids are visible but not directly editable
- if hasOverrides = true, show clear override state in UI

Allowed actions:
List:
- search
- filter
- sort
- open detail
- archive / unarchive only if action slot is supported
Detail:
- edit allowed fields only
- inspect source/integration metadata
- inspect SEO/quality issues
- navigate to supplier
- navigate to venue
- navigate to orders/sales
- publish/unpublish only if action slot is supported

UI requirements — List page:
- Page header
- filter bar
- table
- URL-state sync
- row actions
- dense B2B layout

Columns:
- Title
- Supplier
- Source
- Sales mode
- Status
- Sync
- Venue
- Last session
- Updated at
- Actions

Required badges:
- source badge
- sales mode badge
- status badge
- sync badge
- SEO issue indicator
- quality issue indicator
- read-only / editable indicator if useful

UI requirements — Detail page:
Use a tabbed layout.

Required tabs:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- SEO / Quality
- Integration / Source
- Orders / Sales
- Activity

Detail page behavior:
- clearly show event origin (source + sales mode)
- clearly show editable vs read-only groups
- show sync diagnostics if applicable
- show external provider metadata when present
- show action area in header
- practical admin-first layout, not decorative

Required states:
- loading
- empty
- error
- no results
- archived
- unpublished
- read-only imported record
- partially editable API record
- sync warning
- sync error

Output:
Generate production-oriented React UI for:
- Admin Events List page
- Admin Event Detail page
- reusable badges/components for source/sync/read-only states
Do not generate backend code.
```

---

## 2. ADMIN VENUES

*(Полный текст совпадает с предоставленным пользователем: Task через Output — см. исходное сообщение; из‑за объёма в репозитории хранится полная копия ниже.)*

```
Task: Implement the Admin Venues module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- Do NOT invent new entities beyond the provided contract.
- Do NOT force venue admission into the Event model.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

This module belongs to the Admin application.

Critical product rule:
A Venue in Daibilet is not only a content hub.
A Venue may also be a sellable product through admission tickets.

Venue sales mode:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

Admission type:
- OPEN_DATE
- DATE_RANGE

This means:
- a venue may have no direct ticket sales
- a venue may sell admission without event sessions
- a venue may only host events
- a venue may be hybrid (admission + events)

Implement:
1. Venues List page
2. Venue Detail page
3. Venue Admission tab
4. Reusable venue sales mode badges

Backend contract

Endpoints:
GET /api/v1/admin/venues
GET /api/v1/admin/venues/:id

Query params:
- search?: string
- cityId?: string
- salesMode?: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
- isPublished?: boolean
- hasSeoIssues?: boolean
- hasQualityIssues?: boolean
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'title'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    title: string
    slug: string
    cityName?: string | null
    salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
    hasAdmission: boolean
    eventsCount: number
    isPublished: boolean
    hasSeoIssues: boolean
    hasQualityIssues: boolean
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  slug: string
  city: {
    id?: string | null
    name?: string | null
  }
  salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
  isPublished: boolean
  content: {
    shortDescription?: string | null
    fullDescription?: string | null
    address?: string | null
  }
  admission?: {
    enabled: boolean
    admissionType?: 'OPEN_DATE' | 'DATE_RANGE' | null
    title?: string | null
    description?: string | null
    validityStart?: string | null
    validityEnd?: string | null
    priceTiers: Array<{
      id: string
      title: string
      price: number
      currency: 'RUB'
    }>
  }
  eventsSummary: {
    eventsCount: number
    activeEventsCount: number
  }
  seo: {
    hasSeoIssues: boolean
    issues: string[]
  }
  quality: {
    hasQualityIssues: boolean
    issues: string[]
  }
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "ven_1",
      "title": "Музей воды",
      "slug": "muzej-vody",
      "cityName": "Санкт-Петербург",
      "salesMode": "HYBRID",
      "hasAdmission": true,
      "eventsCount": 4,
      "isPublished": true,
      "hasSeoIssues": false,
      "hasQualityIssues": false,
      "updatedAt": "2026-04-20T10:00:00Z"
    },
    {
      "id": "ven_2",
      "title": "Парк Северный",
      "slug": "park-severnyj",
      "cityName": "Санкт-Петербург",
      "salesMode": "ADMISSION_ONLY",
      "hasAdmission": true,
      "eventsCount": 0,
      "isPublished": true,
      "hasSeoIssues": false,
      "hasQualityIssues": true,
      "updatedAt": "2026-04-19T11:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 420
}

Readonly / editable rules:
- venue content is admin-editable unless restricted by future source rules
- admission is a separate venue-level product layer
- admission OPEN_DATE must not force session UI
- venue may be published as a content hub independently from events count
- hybrid mode must clearly show both admission and event sections

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- edit content
- manage admission product fields
- inspect linked events summary
- inspect SEO/quality
- publish/unpublish only if action slot is supported

UI requirements — List page:
- page header
- filter bar
- data table
- URL-state sync

Columns:
- Title
- City
- Sales mode
- Admission
- Events count
- Published
- SEO / Quality
- Updated at
- Actions

Required indicators:
- venue sales mode badge
- has admission indicator
- SEO issue indicator
- quality issue indicator

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Content
- Admission
- Events
- Media
- SEO / Quality
- Activity

Detail page behavior:
- clearly show venue as content hub + optional sellable product
- clearly separate admission from events
- show sales mode prominently in header
- show admission state even when no events exist
- practical admin-first layout

Required states:
- loading
- empty
- error
- no admission
- admission active
- admission disabled
- hybrid venue
- unpublished

Output:
Generate production-oriented React UI for:
- Admin Venues List page
- Admin Venue Detail page
- Admission tab with price tiers and validity display
- reusable venue sales mode badges
Do not generate backend code.
```

---

## 3. ADMIN ORDERS

```
Task: Implement the Admin Orders module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign order architecture.
- There is one core Order projection.
- Do NOT model admin, supplier, and buyer orders as separate entities.
- Do NOT invent finance logic beyond the provided fields.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

This module belongs to the Admin application.
Admin sees the full operational representation of orders.

Order source model:
- INTERNAL
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Order ingestion source:
- CHECKOUT
- TICKETSCLOUD_MIRROR
- TEPLOHOD_EMAIL
- PARTNER_API_SYNC
- MANUAL

Order status:
- PENDING
- PAID
- FAILED
- CANCELLED
- REFUND_REQUESTED
- REFUNDED
- PARTIALLY_REFUNDED

Refund request status:
- NEW
- IN_REVIEW
- APPROVED
- REJECTED
- COMPLETED
- CANCELLED

Implement:
1. Orders List page
2. Order Detail page
3. Refund Requests section inside detail
4. Reusable source/status/visibility badges

Backend contract

Endpoints:
GET /api/v1/admin/orders
GET /api/v1/admin/orders/:id

Query params:
- search?: string
- source?: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
- supplierId?: string
- refundStatus?: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
- from?: string
- to?: string
- page?: number
- pageSize?: number
- sortBy?: 'purchasedAt' | 'amount' | 'updatedAt'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    orderNumber: string
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    ingestionSource: 'CHECKOUT' | 'TICKETSCLOUD_MIRROR' | 'TEPLOHOD_EMAIL' | 'PARTNER_API_SYNC' | 'MANUAL'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    supplierName: string | null
    customerEmail: string | null
    eventTitle: string | null
    amount: number
    currency: 'RUB'
    refundAmount?: number
    isVisibleInBuyerAccount: boolean
    isVisibleInSupplierCabinet: boolean
    purchasedAt: string
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  orderNumber: string
  source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
  ingestionSource: 'CHECKOUT' | 'TICKETSCLOUD_MIRROR' | 'TEPLOHOD_EMAIL' | 'PARTNER_API_SYNC' | 'MANUAL'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  supplier: {
    id: string | null
    name: string | null
  }
  customer: {
    userId: string | null
    name: string | null
    email: string | null
    phone: string | null
  }
  item: {
    eventId: string | null
    eventTitle: string | null
    titleSnapshot: string | null
    dateSnapshot: string | null
  }
  financials: {
    gross: number
    refundAmount: number
    currency: 'RUB'
  }
  sourceContext: {
    salesMode: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API'
    inventorySource: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    externalOrderId?: string | null
    providerName?: string | null
    lastSyncAt?: string | null
  }
  visibility: {
    isVisibleInBuyerAccount: boolean
    isVisibleInSupplierCabinet: boolean
  }
  refundRequests: Array<{
    id: string
    status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
    requestedAmount?: number | null
    reason?: string | null
    createdAt: string
    updatedAt: string
  }>
  createdAt: string
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "ord_1",
      "orderNumber": "DB-2026-000341",
      "source": "INTERNAL",
      "ingestionSource": "CHECKOUT",
      "status": "PAID",
      "supplierName": "Невский Фарватер",
      "customerEmail": "user@example.com",
      "eventTitle": "Пять разводных мостов",
      "amount": 4200,
      "currency": "RUB",
      "refundAmount": 0,
      "isVisibleInBuyerAccount": true,
      "isVisibleInSupplierCabinet": true,
      "purchasedAt": "2026-04-21T10:24:00Z",
      "updatedAt": "2026-04-21T10:25:00Z"
    },
    {
      "id": "ord_2",
      "orderNumber": "DB-2026-000412",
      "source": "TEPLOHOD",
      "ingestionSource": "TEPLOHOD_EMAIL",
      "status": "REFUND_REQUESTED",
      "supplierName": "Невский Фарватер",
      "customerEmail": "guest@example.com",
      "eventTitle": "Воскресный джаз на воде",
      "amount": 10000,
      "currency": "RUB",
      "refundAmount": 0,
      "isVisibleInBuyerAccount": true,
      "isVisibleInSupplierCabinet": true,
      "purchasedAt": "2026-04-20T15:00:00Z",
      "updatedAt": "2026-04-21T08:10:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 3812
}

Readonly / editable rules:
- orders are inspection-focused in this module
- source and ingestion metadata are always read-only
- refund requests are workflow records, not instant automated refunds
- buyer/supplier visibility flags must be inspectable
- external provider context is visible in detail
- do not imply that every order has the same checkout/payment path

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- inspect customer
- inspect linked item/event
- inspect source/channel context
- inspect refund requests
- navigate to linked supplier/user/event
- dedicated refund workflow actions only if action slot is supported

UI requirements — List page:
- page header
- filter bar
- table
- URL-state sync

Columns:
- Order number
- Source
- Status
- Supplier
- Customer email
- Event
- Amount
- Refund amount
- Purchased at
- Visibility
- Actions

Required indicators:
- source badge
- ingestion badge if useful
- status badge
- buyer visibility indicator
- supplier visibility indicator
- refund present indicator

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Customer
- Item / Event
- Source / Channel
- Refund Requests
- Activity

Detail page behavior:
- clearly show unified order model
- clearly show source/channel metadata
- show buyer/supplier visibility explicitly
- show refund requests as a workflow timeline/list
- practical operations-focused layout

Required states:
- loading
- empty
- error
- no results
- refund request present
- external source order
- buyer/supplier visibility mismatch

Output:
Generate production-oriented React UI for:
- Admin Orders List page
- Admin Order Detail page
- Refund Requests section
- reusable source/status/visibility badges
Do not generate backend code.
```

---

## 4. SUPPLIER MY EVENTS

```
Task: Implement the Supplier My Events module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- This module belongs to the Supplier application.
- Supplier sees only supplier-scoped events.
- Do NOT expose admin-only controls.
- Do NOT invent editability rules beyond the provided contract.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Supplier event records may be:
- native/editable
- imported/read-only
- API-integrated/partially editable
- hybrid override-capable

Inventory source:
- PORTAL
- ADMIN
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Implement:
1. My Events List page
2. My Event Detail page
3. Reusable read-only / partially editable section patterns

Backend contract

Endpoints:
GET /api/v1/supplier/events
GET /api/v1/supplier/events/:id

Query params:
- search?: string
- source?: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
- syncStatus?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
- page?: number
- pageSize?: number

List DTO:
{
  items: Array<{
    id: string
    title: string
    source: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    isEditable: boolean
    hasOverrides: boolean
    syncStatus?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
    lastSessionAt?: string | null
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  source: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isEditable: boolean
  hasOverrides: boolean
  sync?: {
    status?: 'OK' | 'WARNING' | 'ERROR' | 'STALE'
    lastSyncAt?: string | null
    externalEventId?: string | null
  }
  content: {
    shortDescription?: string | null
    fullDescription?: string | null
  }
  pricingSummary?: {
    minPrice?: number | null
    maxPrice?: number | null
    currency: 'RUB'
  }
  sessionsSummary?: {
    hasSessions: boolean
    nextSessionAt?: string | null
  }
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "evt_7",
      "title": "Воскресный джаз на воде",
      "source": "TEPLOHOD",
      "status": "PUBLISHED",
      "isEditable": false,
      "hasOverrides": true,
      "syncStatus": "OK",
      "lastSessionAt": "2026-04-27T20:00:00Z",
      "updatedAt": "2026-04-21T09:00:00Z"
    },
    {
      "id": "evt_8",
      "title": "Семейный квиз на воде",
      "source": "PORTAL",
      "status": "DRAFT",
      "isEditable": true,
      "hasOverrides": false,
      "syncStatus": null,
      "lastSessionAt": null,
      "updatedAt": "2026-04-21T13:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 28
}

Readonly / editable rules:
- source = PORTAL -> usually editable
- source = ADMIN in supplier app should usually be treated carefully / mostly inspection unless explicitly editable by backend
- source = TICKETSCLOUD or TEPLOHOD -> mostly read-only, but may have local overrides
- source = PARTNER_API -> partially editable
- if isEditable = false, core fields must not appear editable
- if hasOverrides = true, UI should show override-capable / override-present state
- sync/external metadata is visible, not editable

Allowed actions:
List:
- search
- filter
- open detail
Detail:
- edit allowed fields only
- inspect integration/source state
- open orders/sales if linked
- open support/request flow
- no admin-only publish/structure controls unless explicitly supported

UI requirements — List page:
- page header
- filter bar
- table
- URL-state sync

Columns:
- Title
- Source
- Status
- Editability
- Sync
- Last session
- Updated at
- Actions

Required indicators:
- source badge
- status badge
- read-only / editable badge
- override indicator
- sync badge

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- Orders / Sales
- Integration / Source
- Support / Requests

Detail page behavior:
- clearly show what is editable vs read-only
- clearly show source type
- show sync diagnostics when present
- keep supplier scope simple and believable
- do not expose platform-global controls

Required states:
- loading
- empty
- error
- no results
- read-only imported record
- partially editable API record
- sync warning
- sync error
- archived

Output:
Generate production-oriented React UI for:
- Supplier My Events List page
- Supplier My Event Detail page
- reusable read-only / partially editable section patterns
Do not generate backend code.
```

---

## 5. SUPPLIER MY VENUES / ADMISSION

```
Task: Implement the Supplier My Venues / Admission module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- Do NOT force admission products into the Event model.
- This module belongs to the Supplier application.
- Supplier sees only supplier-scoped venues and venue-linked admission products.
- Do NOT expose admin-only controls.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Critical product rule:
A Venue in Daibilet may be:
- only a content/location entity
- an admission-only sellable product
- an events-only venue
- a hybrid venue (admission + events)

Venue sales mode:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

Admission type:
- OPEN_DATE
- DATE_RANGE

This means:
- admission may exist without sessions
- admission is separate from event flow
- hybrid venue must show both admission and events clearly

Implement:
1. My Venues List page
2. My Venue Detail page
3. Admission tab / section
4. Reusable venue sales mode badges

Backend contract

Endpoints:
GET /api/v1/supplier/venues
GET /api/v1/supplier/venues/:id

Query params:
- search?: string
- salesMode?: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
- hasAdmission?: boolean
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'title'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    title: string
    slug: string
    salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
    hasAdmission: boolean
    eventsCount: number
    isEditable: boolean
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  slug: string
  salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
  isEditable: boolean
  content: {
    shortDescription?: string | null
    fullDescription?: string | null
    address?: string | null
  }
  admission?: {
    enabled: boolean
    admissionType?: 'OPEN_DATE' | 'DATE_RANGE' | null
    title?: string | null
    description?: string | null
    validityStart?: string | null
    validityEnd?: string | null
    priceTiers: Array<{
      id: string
      title: string
      price: number
      currency: 'RUB'
    }>
  }
  eventsSummary: {
    eventsCount: number
    activeEventsCount: number
  }
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "ven_12",
      "title": "Музей на воде",
      "slug": "muzej-na-vode",
      "salesMode": "ADMISSION_ONLY",
      "hasAdmission": true,
      "eventsCount": 0,
      "isEditable": true,
      "updatedAt": "2026-04-21T08:00:00Z"
    },
    {
      "id": "ven_13",
      "title": "Пространство Север",
      "slug": "prostranstvo-sever",
      "salesMode": "HYBRID",
      "hasAdmission": true,
      "eventsCount": 7,
      "isEditable": true,
      "updatedAt": "2026-04-21T09:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 5
}

Readonly / editable rules:
- supplier may edit venue content only if isEditable = true
- admission is a separate editable block when enabled and permitted
- OPEN_DATE admission must not render session management UI
- when salesMode = EVENTS_ONLY, Admission tab should clearly show "No admission product"
- when salesMode = HYBRID, UI must show both Admission and Events as first-class sections

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- edit allowed content fields
- edit admission fields and price tiers if allowed
- inspect linked events summary
- navigate to support/request flow
- no admin-only global publish or taxonomy actions

UI requirements — List page:
- page header
- filter bar
- table
- URL-state sync

Columns:
- Title
- Sales mode
- Admission
- Events count
- Editable
- Updated at
- Actions

Required indicators:
- venue sales mode badge
- admission present indicator
- editable/read-only indicator

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Content
- Admission
- Events
- Support / Requests

Detail page behavior:
- clearly show venue as supplier-scoped inventory surface
- clearly separate admission from event inventory
- show sales mode in header
- show admission price tiers in practical editable form/table
- keep layout operational and simple

Required states:
- loading
- empty
- error
- no admission
- admission active
- hybrid venue
- read-only venue
- no events
- no admission + no events

Output:
Generate production-oriented React UI for:
- Supplier My Venues List page
- Supplier My Venue Detail page
- Admission tab/section
- reusable venue sales mode badges
Do not generate backend code.
```

---

## 6. SUPPLIER ORDERS / SALES

```
Task: Implement the Supplier Orders / Sales module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Supplier application.
- Supplier sees only supplier-scoped orders related to their own inventory.
- Orders may come from multiple channels.
- Do NOT expose admin-only internals.
- Do NOT invent payout logic.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Order source model:
- INTERNAL
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Order status:
- PENDING
- PAID
- FAILED
- CANCELLED
- REFUND_REQUESTED
- REFUNDED
- PARTIALLY_REFUNDED

Refund request status:
- NEW
- IN_REVIEW
- APPROVED
- REJECTED
- COMPLETED
- CANCELLED

Implement:
1. Supplier Orders / Sales List page
2. Supplier Order Detail page
3. Refund Requests section inside detail
4. Reusable source/status badges

Backend contract

Endpoints:
GET /api/v1/supplier/orders
GET /api/v1/supplier/orders/:id

Query params:
- search?: string
- source?: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
- status?: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
- refundStatus?: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
- from?: string
- to?: string
- page?: number
- pageSize?: number
- sortBy?: 'purchasedAt' | 'amount' | 'updatedAt'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    orderNumber: string
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    eventTitle: string | null
    customerName?: string | null
    customerEmail?: string | null
    amount: number
    currency: 'RUB'
    refundAmount?: number
    purchasedAt: string
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  orderNumber: string
  source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  item: {
    eventTitle: string | null
    dateSnapshot: string | null
  }
  customer: {
    name: string | null
    email: string | null
  }
  financials: {
    gross: number
    refundAmount: number
    currency: 'RUB'
  }
  refundRequests: Array<{
    id: string
    status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
    requestedAmount?: number | null
    createdAt: string
    updatedAt: string
  }>
  purchasedAt: string
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "ord_51",
      "orderNumber": "DB-2026-001122",
      "source": "TEPLOHOD",
      "status": "PAID",
      "eventTitle": "Воскресный джаз на воде",
      "customerName": "Иван Петров",
      "customerEmail": "ivan@example.com",
      "amount": 10000,
      "currency": "RUB",
      "refundAmount": 0,
      "purchasedAt": "2026-04-20T15:00:00Z",
      "updatedAt": "2026-04-20T15:01:00Z"
    },
    {
      "id": "ord_52",
      "orderNumber": "DB-2026-001130",
      "source": "INTERNAL",
      "status": "REFUND_REQUESTED",
      "eventTitle": "Семейный квиз на воде",
      "customerName": "Мария Сергеева",
      "customerEmail": "maria@example.com",
      "amount": 3600,
      "currency": "RUB",
      "refundAmount": 0,
      "purchasedAt": "2026-04-21T11:10:00Z",
      "updatedAt": "2026-04-21T14:05:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 148
}

Readonly / editable rules:
- orders in supplier app are inspection-oriented
- no admin-only source internals
- no platform-global visibility flags
- refunds remain request-based workflow objects
- source should remain visible because sales come from multiple channels
- customer info should remain minimal and scoped

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- inspect order
- inspect refund request status
- navigate to support if available
- no admin-only refund workflow actions unless explicitly exposed by backend

UI requirements — List page:
- page header
- filter bar
- table
- URL-state sync

Columns:
- Order number
- Source
- Status
- Event
- Customer
- Amount
- Refund amount
- Purchased at
- Actions

Required indicators:
- source badge
- status badge
- refund-present indicator

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Item
- Customer
- Refund Requests
- Activity

Detail page behavior:
- supplier-friendly operations layout
- clear order source
- simple customer block
- clear refund request timeline/list
- no admin-only technical clutter

Required states:
- loading
- empty
- error
- no results
- refund request present
- refunded
- partially refunded

Output:
Generate production-oriented React UI for:
- Supplier Orders / Sales List page
- Supplier Order Detail page
- Refund Requests section
- reusable source/status badges
Do not generate backend code.
```

---

## 7. ADMIN SUPPLIERS

```
Task: Implement the Admin Suppliers module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- Admin sees all suppliers and their operating modes.
- Do NOT invent backend logic.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Supplier operating modes:
- MANUAL
- API
- HYBRID

Supplier status:
- ACTIVE
- INACTIVE
- DRAFT

Relevant provider/integration types:
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

A supplier may:
- manage native events
- have imported inventory
- have API-integrated inventory
- have venue admission products
- be hybrid across multiple models

Implement:
1. Suppliers List page
2. Supplier Detail page
3. Reusable supplier mode and integration health badges

Backend contract

Endpoints:
GET /api/v1/admin/suppliers
GET /api/v1/admin/suppliers/:id

Query params:
- search?: string
- mode?: 'MANUAL' | 'API' | 'HYBRID'
- status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
- integrationStatus?: 'OK' | 'WARNING' | 'ERROR'
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'name'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    name: string
    slug: string
    mode: 'MANUAL' | 'API' | 'HYBRID'
    status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
    eventsCount: number
    venuesCount?: number
    hasAdmissionProducts?: boolean
    integrationStatus?: 'OK' | 'WARNING' | 'ERROR'
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  name: string
  slug: string
  mode: 'MANUAL' | 'API' | 'HYBRID'
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
  profile: {
    legalName?: string | null
    email?: string | null
    phone?: string | null
  }
  stats: {
    eventsCount: number
    venuesCount: number
    admissionProductsCount?: number
    ordersCount?: number
  }
  integrations?: Array<{
    provider: 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'OK' | 'WARNING' | 'ERROR'
    lastSyncAt?: string | null
  }>
  updatedAt: string
}

Response example for list:
{
  "items": [
    {
      "id": "sup_1",
      "name": "Невский Фарватер",
      "slug": "nevsky-farvater",
      "mode": "HYBRID",
      "status": "ACTIVE",
      "eventsCount": 28,
      "venuesCount": 2,
      "hasAdmissionProducts": true,
      "integrationStatus": "OK",
      "updatedAt": "2026-04-20T09:00:00Z"
    },
    {
      "id": "sup_2",
      "name": "Городской Музей",
      "slug": "gorodskoj-muzej",
      "mode": "MANUAL",
      "status": "ACTIVE",
      "eventsCount": 6,
      "venuesCount": 1,
      "hasAdmissionProducts": true,
      "integrationStatus": null,
      "updatedAt": "2026-04-19T17:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 115
}

Readonly / editable rules:
- supplier detail is mostly operational inspection + profile editing surface
- mode and integration health must be clearly visible
- integrations here are visibility-level, not full credential management
- admission product presence should be visible in stats/context
- do not fake finance or payout controls in this module

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- inspect events
- inspect venues/admission
- inspect orders/sales
- inspect integrations
- edit profile/status only if action slot is supported

UI requirements — List page:
- page header
- filter bar
- table
- URL-state sync

Columns:
- Name
- Mode
- Status
- Events
- Venues
- Admission products
- Integration status
- Updated at
- Actions

Required indicators:
- supplier mode badge
- supplier status badge
- integration health badge

UI requirements — Detail page:
Use tabbed layout.

Required tabs:
- Overview
- Events
- Venues / Admission
- Orders / Sales
- Integrations
- Profile / Company
- Support / Requests
- Activity

Detail page behavior:
- show supplier mode prominently
- show operational scope summary
- show integrations in a practical diagnostics style
- keep layout operator-focused and not decorative

Required states:
- loading
- empty
- error
- inactive supplier
- draft supplier
- integration warning
- integration error
- no integrations

Output:
Generate production-oriented React UI for:
- Admin Suppliers List page
- Admin Supplier Detail page
- reusable supplier mode and integration health badges
Do not generate backend code.
```

---

## 8. ADMIN CITIES + LANDINGS AS CONTENT HUBS

```
Task: Implement Admin Cities and Landings content-hub surfaces for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- City pages and Landing pages are content hubs and SEO entry points.
- Do NOT treat them as simple reference records.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Critical product rule:
In Daibilet:
- City pages are content hubs
- Venue pages may be content hubs
- Landing pages are intent-driven content hubs
- Multi-city landing concepts may result in city-specific pages such as /cities/{citySlug}/{landingSlug}

This module should support hub-oriented editorial/admin behavior.

Implement:
1. Cities List page
2. City Detail page
3. Landings List page
4. Landing Detail page
5. Reusable content-hub readiness / SEO badges

Backend contract

Endpoints:
GET /api/v1/admin/cities
GET /api/v1/admin/cities/:id
GET /api/v1/admin/landings
GET /api/v1/admin/landings/:id

City query params:
- search?: string
- isPublished?: boolean
- hasSeoIssues?: boolean
- page?: number
- pageSize?: number

City List DTO:
{
  items: Array<{
    id: string
    title: string
    slug: string
    eventsCount: number
    venuesCount: number
    landingsCount: number
    isPublished: boolean
    hasSeoIssues: boolean
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

City Detail DTO:
{
  id: string
  title: string
  slug: string
  isPublished: boolean
  hero?: {
    title?: string | null
    subtitle?: string | null
    imageUrl?: string | null
  }
  seo: {
    title?: string | null
    description?: string | null
    hasSeoIssues: boolean
    issues: string[]
  }
  hubStats: {
    eventsCount: number
    venuesCount: number
    landingsCount: number
  }
  updatedAt: string
}

Landing query params:
- search?: string
- cityId?: string
- type?: 'CITY' | 'MULTI_CITY'
- isPublished?: boolean
- hasSeoIssues?: boolean
- page?: number
- pageSize?: number

Landing List DTO:
{
  items: Array<{
    id: string
    title: string
    slug: string
    cityName?: string | null
    type: 'CITY' | 'MULTI_CITY'
    isPublished: boolean
    hasSeoIssues: boolean
    linkedEventsCount?: number
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Landing Detail DTO:
{
  id: string
  title: string
  slug: string
  type: 'CITY' | 'MULTI_CITY'
  city?: {
    id?: string | null
    name?: string | null
  }
  isPublished: boolean
  hero?: {
    title?: string | null
    subtitle?: string | null
    imageUrl?: string | null
  }
  seo: {
    title?: string | null
    description?: string | null
    hasSeoIssues: boolean
    issues: string[]
  }
  linkedContent: {
    eventsCount?: number
    collectionsCount?: number
    articlesCount?: number
  }
  updatedAt: string
}

Response example for cities list:
{
  "items": [
    {
      "id": "city_spb",
      "title": "Санкт-Петербург",
      "slug": "spb",
      "eventsCount": 640,
      "venuesCount": 182,
      "landingsCount": 24,
      "isPublished": true,
      "hasSeoIssues": false,
      "updatedAt": "2026-04-21T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 18
}

Response example for landings list:
{
  "items": [
    {
      "id": "land_1",
      "title": "Речные прогулки",
      "slug": "river-cruises",
      "cityName": "Санкт-Петербург",
      "type": "CITY",
      "isPublished": true,
      "hasSeoIssues": false,
      "linkedEventsCount": 36,
      "updatedAt": "2026-04-21T09:00:00Z"
    },
    {
      "id": "land_2",
      "title": "Салют 9 мая",
      "slug": "salute-9-may",
      "cityName": null,
      "type": "MULTI_CITY",
      "isPublished": false,
      "hasSeoIssues": true,
      "linkedEventsCount": 12,
      "updatedAt": "2026-04-19T14:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 56
}

Readonly / editable rules:
- city and landing are editable content-hub entities
- SEO fields are first-class, not secondary metadata
- landing type CITY vs MULTI_CITY should be clearly visible
- do not flatten multi-city landing into a generic page without city context
- these screens are editorial/SEO-oriented, not simple reference CRUD

Allowed actions:
Cities:
- search
- filter
- sort
- open detail
- edit content / SEO if action slot is supported
Landings:
- search
- filter
- sort
- open detail
- inspect linked content
- edit content / SEO if action slot is supported

UI requirements — Cities List:
Columns:
- Title
- Slug
- Events
- Venues
- Landings
- Published
- SEO
- Updated at
- Actions

UI requirements — City Detail:
Required tabs:
- Overview
- Content / Hero
- SEO
- Linked Landings
- Linked Venues
- Activity

UI requirements — Landings List:
Columns:
- Title
- Slug
- City
- Type
- Published
- SEO
- Linked events
- Updated at
- Actions

UI requirements — Landing Detail:
Required tabs:
- Overview
- Content / Hero
- SEO
- Linked Content
- Activity

Required indicators:
- published status badge
- SEO issue indicator
- landing type badge
- content-hub readiness indicator if useful

Required states:
- loading
- empty
- error
- unpublished city
- unpublished landing
- SEO issues present
- no linked content

Output:
Generate production-oriented React UI for:
- Admin Cities List page
- Admin City Detail page
- Admin Landings List page
- Admin Landing Detail page
- reusable content-hub / SEO badges
Do not generate backend code.
```

---

## 9. ADMIN SETTINGS

```
Task: Implement the Admin Settings module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- Do NOT redesign backend architecture.
- Do NOT invent settings that are not in the provided contract.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Keep this module practical and operator-friendly.

This module is for internal platform settings, not supplier-facing settings.

Implement:
1. Settings landing page
2. Feature Flags section
3. App SEO Settings section
4. System Settings section
5. Reusable settings forms and save-state UI

Backend contract

Endpoints:
GET /api/v1/admin/feature-flags
PATCH /api/v1/admin/feature-flags

GET /api/v1/admin/settings/app/seo
PATCH /api/v1/admin/settings/app/seo

GET /api/v1/admin/settings/app/system
PATCH /api/v1/admin/settings/app/system

Feature flags DTO:
{
  items: Array<{
    key: string
    title: string
    description?: string | null
    enabled: boolean
  }>
}

App SEO settings DTO:
{
  defaultTitle?: string | null
  defaultDescription?: string | null
  siteName?: string | null
  robotsDefault?: 'index,follow' | 'noindex,nofollow'
  ogImageUrl?: string | null
}

System settings DTO:
{
  supportEmail?: string | null
  supportPhone?: string | null
  defaultCurrency: 'RUB'
  allowSupplierCabinet: boolean
  allowPublicCheckout: boolean
  maintenanceMode: boolean
}

Response examples:
{
  "items": [
    {
      "key": "SUPPLIER_CABINET_ENABLED",
      "title": "Supplier Cabinet Enabled",
      "description": "Allow supplier-facing application access",
      "enabled": true
    },
    {
      "key": "INTERNAL_CHECKOUT_ENABLED",
      "title": "Internal Checkout Enabled",
      "description": "Allow internal checkout flow for native products",
      "enabled": true
    }
  ]
}

{
  "defaultTitle": "Daibilet",
  "defaultDescription": "Билеты на экскурсии, музеи и мероприятия",
  "siteName": "Daibilet",
  "robotsDefault": "index,follow",
  "ogImageUrl": "https://cdn.example.com/default-og.jpg"
}

{
  "supportEmail": "support@daibilet.ru",
  "supportPhone": "+7 812 000-00-00",
  "defaultCurrency": "RUB",
  "allowSupplierCabinet": true,
  "allowPublicCheckout": true,
  "maintenanceMode": false
}

Readonly / editable rules:
- all fields in this module are admin-only
- feature flags should be displayed clearly as operational toggles
- SEO defaults and system settings should be grouped and easy to scan
- do not invent advanced environment management UI

Allowed actions:
- edit feature flags
- edit app SEO settings
- edit system settings
- save changes
- reset form state if useful
- show save success / save error / unsaved changes state

UI requirements:
- Settings landing with grouped sections/cards
- each section can be either inline form or dedicated panel
- clear save buttons and dirty-state behavior
- no decorative dashboard gimmicks

Suggested structure:
- Settings Home
  - Feature Flags
  - App SEO
  - System

Required states:
- loading
- empty
- error
- saving
- save success
- save error
- unsaved changes

Output:
Generate production-oriented React UI for:
- Settings landing page
- Feature Flags editor
- App SEO settings form
- System settings form
- reusable save-state and dirty-state patterns
Do not generate backend code.
```

---

## 10. ADMIN PROMO BLOCKS / STOREFRONT CONTROL

```
Task: Implement the Admin Promo Blocks module for Daibilet as a storefront control layer

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- Promo blocks are not just visual banners; they are storefront control objects.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Critical product rule:
Promo blocks are placement-based storefront control records.
They may compete for the same placement and resolve based on status, priority, order, timing, and scope.

Implement:
1. Promo Blocks List page
2. Promo Block Detail page
3. Resolved Preview / Diagnostics section
4. Reusable promo status and diagnostic badges

Backend contract

Endpoints:
GET /api/v1/admin/promo-placement-blocks
GET /api/v1/admin/promo-placement-blocks/:id
GET /api/v1/admin/promo-placement-blocks/:id/resolved-preview

Query params:
- search?: string
- placement?: string
- isPublished?: boolean
- hasSeoIssues?: boolean
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'priority'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    title: string
    placement: string
    isPublished: boolean
    priority: number
    sortOrder: number
    isCurrentlyActive: boolean
    targetType?: 'EVENT' | 'VENUE' | 'CITY' | 'LANDING' | 'URL' | null
    preview?: {
      displayTitle?: string | null
      subtitle?: string | null
    }
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  placement: string
  isPublished: boolean
  priority: number
  sortOrder: number
  startAt?: string | null
  endAt?: string | null
  targetType?: 'EVENT' | 'VENUE' | 'CITY' | 'LANDING' | 'URL' | null
  targetId?: string | null
  preview?: {
    displayTitle?: string | null
    subtitle?: string | null
    imageUrl?: string | null
    resolvedUrl?: string | null
  }
  updatedAt: string
}

Resolved preview DTO:
{
  winnerId?: string | null
  activeTotal: number
  activeTruncated: boolean
  comparisonToWinner?: {
    outcome: 'WINNER' | 'OUTRANKED' | 'INACTIVE' | 'NOT_ELIGIBLE'
    reasons: Array<
      'LOWER_PRIORITY' |
      'HIGHER_SORT_ORDER' |
      'OLDER_UPDATED_AT_TIEBREAKER' |
      'NOT_PUBLISHED' |
      'WINDOW_NOT_STARTED' |
      'WINDOW_EXPIRED' |
      'SCOPE_MISMATCH'
    >
  }
  resolvedAll: Array<{
    id: string
    title: string
    isPublished: boolean
    priority: number
    sortOrder: number
    isCurrentlyActive: boolean
  }>
}

Response example for list:
{
  "items": [
    {
      "id": "pb_1",
      "title": "Речные прогулки — hero",
      "placement": "home_hero",
      "isPublished": true,
      "priority": 100,
      "sortOrder": 10,
      "isCurrentlyActive": true,
      "targetType": "LANDING",
      "preview": {
        "displayTitle": "Речные прогулки",
        "subtitle": "По Неве и каналам"
      },
      "updatedAt": "2026-04-21T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 86
}

Readonly / editable rules:
- list and detail are admin-only
- resolved preview is inspection/diagnostic UI
- diagnostics must be explicit and operator-readable
- do not hide conflict reasons behind vague labels

Allowed actions:
List:
- search
- filter
- sort
- open detail
Detail:
- inspect preview and placement data
- inspect resolution diagnostics
- edit if action slot is supported
- publish/unpublish if action slot is supported

UI requirements — List page:
Columns:
- Title
- Placement
- Published
- Priority
- Sort order
- Active now
- Target type
- Updated at
- Actions

Required indicators:
- published badge
- active-now badge
- target-type badge
- diagnostics indicator if useful

UI requirements — Detail page:
Required tabs:
- Overview
- Content / Preview
- Placement / Scope
- Resolved Preview / Diagnostics
- Activity

Resolved diagnostics behavior:
- clearly show whether block wins
- clearly show why block loses if outranked
- show comparison reasons as explicit compact labels
- show candidate list for placement resolution

Required states:
- loading
- empty
- error
- published but inactive
- not published
- outranked
- winner
- window expired
- scope mismatch

Output:
Generate production-oriented React UI for:
- Promo Blocks List page
- Promo Block Detail page
- Resolved Preview / Diagnostics section
- reusable promo diagnostics badges
Do not generate backend code.
```

---

## 11. ADMIN SEO AUDIT

```
Task: Implement the Admin SEO Audit module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- SEO Audit in Daibilet is soft validation and operational visibility, not a publish-blocking system by default.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Critical product rule:
SEO Audit must work across multiple entity types:
- EVENT
- VENUE
- CITY
- LANDING

It should expose issues clearly and support deep-link navigation into entities.

Implement:
1. SEO Audit Overview page
2. SEO Audit Issues table
3. Filters and deep-link flow
4. Reusable issue severity / issue-type badges

Backend contract

Endpoints:
GET /api/v1/admin/seo-audit/summary
GET /api/v1/admin/seo-audit/issues

Issues query params:
- entityType?: 'EVENT' | 'VENUE' | 'CITY' | 'LANDING'
- issueCode?: string
- severity?: 'INFO' | 'WARNING' | 'ERROR'
- search?: string
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'severity' | 'entityType'
- sortOrder?: 'asc' | 'desc'

Summary DTO:
{
  totals: {
    entitiesChecked: number
    issuesTotal: number
    errors: number
    warnings: number
    infos: number
  }
  byEntityType: Array<{
    entityType: 'EVENT' | 'VENUE' | 'CITY' | 'LANDING'
    issuesTotal: number
    errors: number
    warnings: number
    infos: number
  }>
}

Issues list DTO:
{
  items: Array<{
    id: string
    entityType: 'EVENT' | 'VENUE' | 'CITY' | 'LANDING'
    entityId: string
    entityTitle: string
    issueCode: string
    severity: 'INFO' | 'WARNING' | 'ERROR'
    message: string
    updatedAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Response examples:
{
  "totals": {
    "entitiesChecked": 2180,
    "issuesTotal": 936,
    "errors": 132,
    "warnings": 581,
    "infos": 223
  },
  "byEntityType": [
    {
      "entityType": "EVENT",
      "issuesTotal": 602,
      "errors": 90,
      "warnings": 391,
      "infos": 121
    },
    {
      "entityType": "VENUE",
      "issuesTotal": 141,
      "errors": 18,
      "warnings": 83,
      "infos": 40
    }
  ]
}

{
  "items": [
    {
      "id": "seo_1",
      "entityType": "EVENT",
      "entityId": "evt_2",
      "entityTitle": "Воскресный джаз на воде",
      "issueCode": "NO_SESSIONS",
      "severity": "WARNING",
      "message": "No published sessions found",
      "updatedAt": "2026-04-21T11:00:00Z"
    },
    {
      "id": "seo_2",
      "entityType": "LANDING",
      "entityId": "land_2",
      "entityTitle": "Салют 9 мая",
      "issueCode": "NO_META_DESCRIPTION",
      "severity": "ERROR",
      "message": "Meta description is missing",
      "updatedAt": "2026-04-21T09:20:00Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 936
}

Readonly / editable rules:
- this module is inspection and navigation UI
- issues are read-only in this surface
- actions should deep-link to the relevant entity detail page
- do not frame SEO audit as a hard blocker unless explicitly stated

Allowed actions:
- filter
- search
- sort
- inspect summary
- open entity detail via deep-link
- view issue grouping

UI requirements — Overview:
- KPI summary cards
- issue distribution by entity type
- quick filter links into issues table

UI requirements — Issues table:
Columns:
- Entity type
- Entity title
- Issue code
- Severity
- Message
- Updated at
- Open entity action

Required indicators:
- severity badge
- entity type badge
- issue code label

Required states:
- loading
- empty
- error
- filtered no results

Output:
Generate production-oriented React UI for:
- SEO Audit Overview page
- SEO Audit Issues table
- reusable severity/entity-type badges
- deep-link oriented workflow
Do not generate backend code.
```

---

## 12. ADMIN SUPPORT

```
Task: Implement the Admin Support module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- This module belongs to the Admin application.
- Support in Daibilet covers operational requests and customer/supplier issues.
- Do NOT invent a full CRM or omnichannel backend.
- Do NOT generate backend code.
- Use production-oriented React UI.
- Use URL-state for filters, pagination, and sorting.

Support should be practical and operator-focused.

Implement:
1. Support Tickets List page
2. Support Ticket Detail page
3. Reusable status / participant / source badges

Backend contract

Endpoints:
GET /api/v1/admin/support/tickets
GET /api/v1/admin/support/tickets/:id

Query params:
- search?: string
- status?: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
- source?: 'BUYER' | 'SUPPLIER' | 'ADMIN_INTERNAL'
- relatedType?: 'ORDER' | 'EVENT' | 'VENUE' | 'LANDING' | 'GENERAL'
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'status'
- sortOrder?: 'asc' | 'desc'

List DTO:
{
  items: Array<{
    id: string
    title: string
    status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
    source: 'BUYER' | 'SUPPLIER' | 'ADMIN_INTERNAL'
    relatedType?: 'ORDER' | 'EVENT' | 'VENUE' | 'LANDING' | 'GENERAL'
    relatedTitle?: string | null
    participantName?: string | null
    updatedAt: string
    createdAt: string
  }>
  page: number
  pageSize: number
  total: number
}

Detail DTO:
{
  id: string
  title: string
  status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
  source: 'BUYER' | 'SUPPLIER' | 'ADMIN_INTERNAL'
  relatedType?: 'ORDER' | 'EVENT' | 'VENUE' | 'LANDING' | 'GENERAL'
  relatedId?: string | null
  relatedTitle?: string | null
  participant: {
    name?: string | null
    email?: string | null
  }
  messages: Array<{
    id: string
    authorType: 'ADMIN' | 'BUYER' | 'SUPPLIER' | 'SYSTEM'
    text: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

Response examples:
{
  "items": [
    {
      "id": "sup_ticket_1",
      "title": "Проблема с импортом расписания",
      "status": "OPEN",
      "source": "SUPPLIER",
      "relatedType": "EVENT",
      "relatedTitle": "Пять разводных мостов",
      "participantName": "Невский Фарватер",
      "updatedAt": "2026-04-21T12:40:00Z",
      "createdAt": "2026-04-21T09:10:00Z"
    },
    {
      "id": "buy_ticket_2",
      "title": "Запрос на возврат по заказу",
      "status": "IN_PROGRESS",
      "source": "BUYER",
      "relatedType": "ORDER",
      "relatedTitle": "DB-2026-001130",
      "participantName": "Мария Сергеева",
      "updatedAt": "2026-04-21T14:00:00Z",
      "createdAt": "2026-04-21T13:20:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 204
}

{
  "id": "sup_ticket_1",
  "title": "Проблема с импортом расписания",
  "status": "OPEN",
  "source": "SUPPLIER",
  "relatedType": "EVENT",
  "relatedId": "evt_1",
  "relatedTitle": "Пять разводных мостов",
  "participant": {
    "name": "Невский Фарватер",
    "email": "partner@example.com"
  },
  "messages": [
    {
      "id": "msg_1",
      "authorType": "SUPPLIER",
      "text": "После синхронизации не обновились новые рейсы",
      "createdAt": "2026-04-21T09:10:00Z"
    },
    {
      "id": "msg_2",
      "authorType": "ADMIN",
      "text": "Проверяем источник и журнал синхронизации",
      "createdAt": "2026-04-21T10:00:00Z"
    }
  ],
  "createdAt": "2026-04-21T09:10:00Z",
  "updatedAt": "2026-04-21T12:40:00Z"
}

Readonly / editable rules:
- this module is operational inspection + response workflow surface
- ticket thread is read-only unless reply actions are explicitly supported elsewhere
- related entity links should be visible and easy to open
- do not invent a full helpdesk suite beyond the contract

Allowed actions:
- search
- filter
- sort
- open detail
- open related entity
- inspect thread
- change status / add reply only if action slot is supported

UI requirements — List page:
Columns:
- Title
- Status
- Source
- Related type
- Related title
- Participant
- Updated at
- Created at
- Actions

Required indicators:
- ticket status badge
- ticket source badge
- related type badge

UI requirements — Detail page:
Required tabs or sections:
- Overview
- Conversation / Messages
- Related Entity
- Activity

Detail page behavior:
- operator-friendly support layout
- clear source and participant context
- readable message timeline
- easy access to related order/event/venue/landing

Required states:
- loading
- empty
- error
- no results
- unresolved ticket
- waiting state
- resolved ticket
- no related entity

Output:
Generate production-oriented React UI for:
- Support Tickets List page
- Support Ticket Detail page
- reusable status/source/related-type badges
Do not generate backend code.
```

---

## 13. CLASSIFICATION UI FOR EVENT AND VENUE

**Зачем отдельный §:** Lovable на формах классификации часто смешивает категории и теги, даёт один multiselect, убирает иерархию primary/secondary. Этот блок это запрещает.

**Как кормить Lovable (3 сообщения):**

1. Ниже — **основной промпт** (одним сообщением).
2. Затем — блок **«Сообщение 2»** (усиление: категории vs теги при двусмысленности).
3. Затем — блок **«Сообщение 3»** (единое семейство компонентов на всех четырёх экранах).

---

### Основной промпт (сообщение 1)

```
Task: Implement the classification UI for Event and Venue forms in Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend classification architecture.
- Do NOT merge categories and tags.
- Do NOT invent free-form taxonomy logic.
- Do NOT generate backend code.
- Use production-oriented React UI.

CRITICAL CLASSIFICATION RULES (STRICT)

The platform has exactly 5 top-level categories.
They are fixed and controlled by the platform.

For every catalog entity (Event or Venue):
- exactly 1 PRIMARY category is required
- 0 to 2 SECONDARY categories are allowed
- total categories must never exceed 3

This means:
- no entity may have 0 primary categories
- no entity may have more than 1 primary category
- no entity may have more than 2 secondary categories
- no entity may have more than 3 categories total

Tags are separate:
- tags are optional
- tags are flexible
- tags do not replace categories
- tags do not define core classification

UI must clearly distinguish:
- Primary category
- Secondary categories
- Tags

Do not present categories and tags as the same type of selector.

======================================================================
MODULE SCOPE
======================================================================

Implement reusable classification form sections for:
1. Event Detail form
2. Venue Detail form

These sections must be reusable across:
- Admin app
- Supplier app

With role-aware behavior:
- Admin can usually fully control classification
- Supplier may have more limited ability depending on backend permissions

======================================================================
BACKEND CONTRACT
======================================================================

Categories endpoint:
GET /api/v1/admin/categories
GET /api/v1/supplier/categories

Tags endpoint:
GET /api/v1/admin/tags
GET /api/v1/supplier/tags

Entity classification DTO shape:

{
  primaryCategoryId: string | null,
  secondaryCategoryIds: string[],
  tagIds: string[]
}

Categories response DTO:
{
  items: Array<{
    id: string,
    name: string,
    slug: string,
    status: 'ACTIVE' | 'INACTIVE',
    isTopLevel: boolean,
    level: number,
    parentId?: string | null,
    parentName?: string | null
  }>
}

Tags response DTO:
{
  items: Array<{
    id: string,
    name: string,
    slug: string,
    status: 'ACTIVE' | 'INACTIVE'
  }>
}

Response example for categories:
{
  "items": [
    {
      "id": "cat_excursions",
      "name": "Экскурсии",
      "slug": "excursions",
      "status": "ACTIVE",
      "isTopLevel": true,
      "level": 0,
      "parentId": null,
      "parentName": null
    },
    {
      "id": "cat_water",
      "name": "Водные прогулки",
      "slug": "water-cruises",
      "status": "ACTIVE",
      "isTopLevel": false,
      "level": 1,
      "parentId": "cat_excursions",
      "parentName": "Экскурсии"
    }
  ]
}

Response example for tags:
{
  "items": [
    {
      "id": "tag_water",
      "name": "На воде",
      "slug": "on-water",
      "status": "ACTIVE"
    },
    {
      "id": "tag_family",
      "name": "Для детей",
      "slug": "for-kids",
      "status": "ACTIVE"
    }
  ]
}

Entity example:
{
  "primaryCategoryId": "cat_excursions",
  "secondaryCategoryIds": ["cat_water"],
  "tagIds": ["tag_water", "tag_family"]
}

======================================================================
UX MODEL
======================================================================

The UI must have 3 clearly separated blocks:

1. PRIMARY CATEGORY
- exactly one selected value
- required
- if empty, show validation error
- should feel strict and structural
- use a single-select control

2. SECONDARY CATEGORIES
- optional
- max 2 selections
- should feel supportive / additional
- use multi-select with hard limit = 2
- if user tries to add 3rd, prevent it and show clear inline feedback

3. TAGS
- optional
- flexible
- use multi-select / searchable chips
- tags are independent from category limit
- do not visually place tags inside the categories block

======================================================================
STRICT UI RULES
======================================================================

- Primary category must be visually dominant
- Secondary categories must be visibly subordinate to primary
- Tags must be visually separated from categories
- Categories should feel governed and structural
- Tags should feel lighter and more flexible

Must show helper text:
- Primary category: required, exactly one
- Secondary categories: optional, up to two
- Tags: optional additional labels

Must show current counts:
- Secondary selected: 0/2, 1/2, 2/2
- Tags count optional
- Total categories should be inferable and must never exceed 3

Do NOT:
- use one common multiselect for categories + tags
- allow choosing multiple primary categories
- allow more than 2 secondary categories
- hide the rule system from the user

======================================================================
VALIDATION RULES
======================================================================

UI validation must enforce:

Primary:
- required
- exactly one

Secondary:
- max 2
- cannot duplicate primary category
- cannot contain duplicate values

Tags:
- no duplicate tags

When validation fails:
- show inline field errors
- do not rely only on toast
- keep error text practical and short

Required validation messages:
- "Выберите основную категорию"
- "Можно выбрать не более двух дополнительных категорий"
- "Основная категория не может дублироваться в дополнительных"
- "Категория уже выбрана"

======================================================================
ROLE-AWARE BEHAVIOR
======================================================================

Admin version:
- fully editable classification UI
- can edit primary, secondary, tags

Supplier version:
- same UI family
- but may have restricted editing depending on permissions
- if read-only, show values as locked chips/rows
- if partially editable, show only editable block as active
- do not hide classification if read-only; show it clearly

======================================================================
RECOMMENDED UI STRUCTURE
======================================================================

Section title:
"Классификация"

Subsections:
1. Основная категория
2. Дополнительные категории
3. Теги

Recommended controls:
- Primary category: searchable Select / Command-based single select
- Secondary categories: searchable multi-select with chips and hard max 2
- Tags: searchable chip-based multi-select

Recommended layout:
- a section card/panel
- vertical stack
- helper text under each block
- current selected values visible as chips or rows

======================================================================
REQUIRED STATES
======================================================================

- loading categories/tags
- empty categories result
- empty tags result
- validation error
- read-only classification
- partially editable classification
- no secondary categories selected
- no tags selected
- max secondary reached

======================================================================
VISUAL / UX STYLE
======================================================================

- practical B2B admin form
- clean and strict
- not decorative
- categories block should feel more important than tags
- use consistent chips/badges for selected values
- avoid excessive whitespace
- clear field grouping and hierarchy

======================================================================
OUTPUT
======================================================================

Generate production-oriented React UI for:
- reusable Event/Venue classification section
- Admin version
- Supplier version
- validation states
- primary/secondary/tags separation
- read-only and partially editable variants

Do not generate backend code.
```

**Почему это важно:** без явного разделения Lovable чаще всего делает один общий multiselect, неограниченное число категорий, теги вперемешку с категориями, без primary/secondary иерархии. Этот промпт это закрывает.

---

### Сообщение 2 — усиление (категории vs теги)

Скопируйте **отдельным следующим сообщением** после ответа Lovable на основной промпт (или сразу после сообщения 1, если хотите зафиксировать до генерации).

```
Important:
Categories are strict catalog structure.
Tags are only optional supplemental labels.

If there is any ambiguity:
- preserve category constraints
- do not relax the 1 primary + up to 2 secondary rule
- do not use tags as fallback classification
```

---

### Сообщение 3 — единообразие на всех экранах

```
Apply this classification UI consistently in:
- Admin Event Detail
- Supplier Event Detail
- Admin Venue Detail
- Supplier Venue Detail

Do not create different classification UX patterns for each page.
Reuse the same classification component family everywhere.
```

---

## 14. ADMIN SUPPLIER INTEGRATIONS

```
Task: Implement the Admin Supplier Integrations module for Daibilet

You are building frontend UI only.

Important:
- The backend already exists and is the single source of truth.
- Do NOT redesign backend architecture.
- Do NOT invent database schema.
- Do NOT invent new endpoints.
- Do NOT generate backend code.
- Do NOT simplify permissions.
- Use production-oriented React UI structure.
- Use URL-state for filters, pagination, and sorting.

This module belongs to the Admin application.
This is an internal platform module for managing supplier integrations with external inventory providers.

Key principle:
Integrations are operational objects:
- connection parameters (masked)
- mapping and matching mode (safe edits only)
- sync runs history
- issues / errors list
- health indicators

Implement:
1. Supplier Integrations List page
2. Supplier Integration Detail page
3. Integration Runs tab (history)
4. Integration Issues tab
5. Reusable integration status / environment / health badges

======================================================================
BACKEND CONTRACT
======================================================================

Routes:
GET    /api/v1/admin/supplier-integrations
GET    /api/v1/admin/supplier-integrations/:id
POST   /api/v1/admin/supplier-integrations
PATCH  /api/v1/admin/supplier-integrations/:id
POST   /api/v1/admin/supplier-integrations/:id/test-connection
POST   /api/v1/admin/supplier-integrations/:id/run-sync
GET    /api/v1/admin/supplier-integrations/:id/runs
GET    /api/v1/admin/supplier-integrations/:id/issues

List query params:
- q?: string
- supplierId?: string[]          // multi
- adapterCode?: string[]         // multi
- status?: string[]              // multi
- acquisitionMode?: string[]     // multi
- environment?: string[]         // multi
- hasErrors?: boolean
- hasOpenIssues?: boolean
- sortBy?: string
- sortDir?: 'asc' | 'desc'
- page?: number
- pageSize?: number

List DTO:
{
  items: Array<{
    id: string
    supplierId: string
    supplierName: string
    adapterCode: string
    adapterName: string
    name: string
    acquisitionMode: string
    status: string
    environment: string
    syncMode: string
    lastSuccessAt?: string | null
    lastErrorAt?: string | null
    consecutiveErrorCount: number
    openIssuesCount: number
    lastRunSummary?: string | null
  }>
  total: number
}

Detail DTO:
{
  id: string
  supplierId: string
  supplierName: string
  adapterCode: string
  adapterName: string
  name: string
  acquisitionMode: string
  status: string
  environment: string
  syncMode: string
  connection: {
    endpointUrl?: string | null
    authType?: string | null
    maskedCredentials?: Record<string, unknown> | null
  }
  capabilities?: Record<string, unknown> | null
  mapping?: {
    categoryMapping?: Record<string, unknown> | null
    cityMapping?: Record<string, unknown> | null
    venueMatchingMode?: string | null
    contentMode?: string | null
  } | null
  health?: { flags: string[] } | null
  lastSuccessAt?: string | null
  lastErrorAt?: string | null
  consecutiveErrorCount: number
}

Runs DTO (table):
{
  items: Array<{
    id: string
    status: string
    startedAt: string
    finishedAt?: string | null
    summary?: string | null
    counters?: Record<string, number> | null
  }>
  total: number
}

Issues DTO (table):
{
  items: Array<{
    id: string
    entityType?: string | null
    severity: 'INFO' | 'WARNING' | 'ERROR' | string
    code?: string | null
    title: string
    resolutionStatus?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  }>
  total: number
}

======================================================================
UI REQUIREMENTS — LIST PAGE
======================================================================

- Page header
- Filter bar (URL-state)
- Data table
- Operator-focused dense layout

Suggested columns:
- Supplier
- Integration name
- Adapter
- Environment
- Status
- Sync mode
- Last success
- Last error
- Open issues
- Errors (consecutive)
- Actions

Required states:
- loading
- empty
- error
- filtered no results
- integration unhealthy (errors)
- integration warning (issues)

======================================================================
UI REQUIREMENTS — DETAIL PAGE
======================================================================

Tabbed layout.

Required tabs:
- Overview
- Connection
- Mapping
- Sync History (Runs)
- Issues
- Activity

Detail behavior:
- show key health/status in header
- show masked credentials only
- do not show raw secrets
- show runs and issues as first-class operational surfaces
- action buttons only if endpoints exist:
  - Test connection
  - Run sync
  - Save changes

Required states:
- loading
- empty
- error
- read-only integration record (if backend restricts)
- sync in progress
- last run failed
- has open issues

Output:
Generate production-oriented React UI for:
- Admin Supplier Integrations List page
- Admin Supplier Integration Detail page
- Runs + Issues sections
- reusable integration badges
Do not generate backend code.
```
