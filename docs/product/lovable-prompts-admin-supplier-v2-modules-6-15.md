# Lovable v2 — модули §6–§15 (DTO, примеры, табы, состояния)

Родительский документ: [`lovable-prompts-admin-supplier-v2-enriched.md`](lovable-prompts-admin-supplier-v2-enriched.md).

**Классификация на формах Event / Venue (1 primary + до 2 secondary + теги отдельно; один компонент на Admin/Supplier):** см. production-tight [**v3 §13**](lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue) — три сообщения в Lovable (основной промпт + усиление + единообразие экранов). Указано в **первичном** оглавлении [`lovable-admin-supplier-prompts.md`](lovable-admin-supplier-prompts.md).

---

## 6. ADMIN EVENTS MODULE PROMPT (с DTO)

```
Task: Implement the Admin Events module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.
Admin sees all events across all inventory channels.

Event source types:
- PORTAL
- ADMIN
- TICKETSCLOUD
- TEPLOHOD
- PARTNER_API

Sales mode:
- INTERNAL_CHECKOUT
- EXTERNAL_WIDGET
- EXTERNAL_API

MODULE SCOPE

Implement:
1. Events List page
2. Event Detail page

BACKEND CONTRACT

Endpoints:
GET /api/v1/admin/events
GET /api/v1/admin/events/:id

Query params:
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

EventListItem DTO:
{
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
}

List response:
{
  items: EventListItem[]
  page: number
  pageSize: number
  total: number
}

EventDetail DTO:
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

Response example:
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
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1240
}

FIELD RULES

- source = PORTAL or ADMIN -> usually editable
- source = TICKETSCLOUD / TEPLOHOD -> mostly read-only core data
- source = PARTNER_API -> partially editable depending on field group
- source-owned schedule/pricing from external systems should be read-only
- content/media may support override if hasOverrides is true
- sync/external metadata is always visible in admin, not editable directly

ALLOWED ACTIONS

List:
- search/filter/sort
- open detail
- quick archive/unarchive if backend allows

Detail:
- edit allowed fields
- inspect integration/source info
- inspect SEO/quality
- navigate to supplier/venue/orders
- publish/unpublish if backend allows

UI REQUIREMENTS — LIST

Columns:
- title
- supplier
- source
- sales mode
- status
- sync
- venue
- last session
- updatedAt
- actions

Required badges:
- source badge
- sales mode badge
- status badge
- sync badge
- SEO/quality indicators

UI REQUIREMENTS — DETAIL

Tabs:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- SEO / Quality
- Integration / Source
- Orders / Sales
- Activity

STATES
- loading
- empty
- error
- no results
- read-only imported
- partially editable API
- sync warning
- sync error
- archived
- unpublished

OUTPUT
- Events list page
- Event detail page
- reusable badges and section blocks
- no backend code
```

---

## 7. ADMIN VENUES MODULE PROMPT (с DTO + admission/hybrid)

```
Task: Implement the Admin Venues module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

A venue in Daibilet is:
- a content hub
- optionally a sellable admission product
- optionally a hub for multiple events
- optionally a hybrid (admission + events)

Venue sales mode:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

Admission type:
- OPEN_DATE
- DATE_RANGE

MODULE SCOPE

Implement:
1. Venues List page
2. Venue Detail page
3. Venue Admission tab in detail

BACKEND CONTRACT

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

VenueListItem DTO:
{
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
}

List response:
{
  items: VenueListItem[]
  page: number
  pageSize: number
  total: number
}

VenueDetail DTO:
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

Response example:
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
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 420
}

FIELD RULES

- venue content is admin-editable unless restricted by source rules
- admission is a separate product layer, not a fake event
- venue may have admission without sessions
- admission OPEN_DATE should not force session editor UI
- venue sales mode must be visible in list and detail

ALLOWED ACTIONS

List:
- search/filter/sort
- open detail

Detail:
- edit venue content
- manage admission product if allowed
- inspect linked events
- manage publish state if allowed

UI REQUIREMENTS — LIST

Columns:
- title
- city
- sales mode
- has admission
- events count
- published
- SEO/quality
- updatedAt
- actions

UI REQUIREMENTS — DETAIL

Tabs:
- Overview
- Content
- Admission
- Events
- Media
- SEO / Quality
- Activity

STATES
- loading
- empty
- error
- no admission
- admission active
- admission disabled
- hybrid venue
- unpublished

OUTPUT
- Venues list
- Venue detail
- Venue admission tab
- no backend code
```

---

## 8. ADMIN CITIES MODULE PROMPT (контентный хаб)

```
Task: Implement the Admin Cities module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

A City page is a content hub and an SEO entry point.
It is not just a reference record.

MODULE SCOPE

Implement:
1. Cities List page
2. City Detail page

BACKEND CONTRACT

Endpoints:
GET /api/v1/admin/cities
GET /api/v1/admin/cities/:id

Query params:
- search?: string
- isPublished?: boolean
- hasSeoIssues?: boolean
- page?: number
- pageSize?: number

CityListItem DTO:
{
  id: string
  title: string
  slug: string
  eventsCount: number
  venuesCount: number
  landingsCount: number
  isPublished: boolean
  hasSeoIssues: boolean
  updatedAt: string
}

CityDetail DTO:
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

Response example:
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

FIELD RULES

- city is a content hub, not only a directory record
- SEO and hero fields are important
- city detail should support editorial hub behavior

ALLOWED ACTIONS

- edit city content
- inspect linked landings/venues/events
- publish/unpublish if allowed

UI REQUIREMENTS

List columns:
- title
- slug
- events
- venues
- landings
- published
- SEO
- updatedAt
- actions

Detail tabs:
- Overview
- Content / Hero
- SEO
- Linked Landings
- Linked Venues
- Activity

STATES
- loading
- empty
- error
- unpublished

OUTPUT
- Cities list
- City detail
- no backend code
```

---

## 9. ADMIN SUPPLIERS MODULE PROMPT (с DTO)

```
Task: Implement the Admin Suppliers module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

Supplier may operate in one or more modes:
- MANUAL
- API
- HYBRID

Supplier can have:
- native events
- imported external records
- API-integrated records
- venue admission products if applicable

MODULE SCOPE

Implement:
1. Suppliers List page
2. Supplier Detail page

BACKEND CONTRACT

Endpoints:
GET /api/v1/admin/suppliers
GET /api/v1/admin/suppliers/:id

Query params:
- search?: string
- mode?: 'MANUAL' | 'API' | 'HYBRID'
- status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
- page?: number
- pageSize?: number
- sortBy?: 'updatedAt' | 'createdAt' | 'name'
- sortOrder?: 'asc' | 'desc'

SupplierListItem DTO:
{
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
}

SupplierDetail DTO:
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
    ordersCount?: number
  }
  integrations?: Array<{
    provider: 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'OK' | 'WARNING' | 'ERROR'
    lastSyncAt?: string | null
  }>
  updatedAt: string
}

Response example:
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
      "hasAdmissionProducts": false,
      "integrationStatus": "OK",
      "updatedAt": "2026-04-20T09:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 115
}

FIELD RULES

- supplier mode must be visible and central
- integrations are operational visibility, not full integration studio
- supplier detail should not overpromise finance/payout features in this module

ALLOWED ACTIONS

- search/filter/sort
- open detail
- inspect linked events/orders/integrations
- edit profile/status if backend allows

UI REQUIREMENTS

List columns:
- name
- mode
- status
- events count
- venues count
- admission products
- integration status
- updatedAt
- actions

Detail tabs:
- Overview
- Events
- Venues / Admission
- Orders / Sales
- Integrations
- Profile / Company
- Support / Requests
- Activity

STATES
- loading
- empty
- error
- integration warning
- integration error

OUTPUT
- Suppliers list
- Supplier detail
- no backend code
```

---

## 10. ADMIN ORDERS MODULE PROMPT (с unified order DTO)

```
Task: Implement the Admin Orders module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

There is one core Order projection.
Admin sees the full operational representation.

Orders may come from:
- INTERNAL / CHECKOUT
- TICKETSCLOUD / TICKETSCLOUD_MIRROR
- TEPLOHOD / TEPLOHOD_EMAIL
- PARTNER_API / PARTNER_API_SYNC

MODULE SCOPE

Implement:
1. Orders List page
2. Order Detail page
3. Refund Requests section inside detail

BACKEND CONTRACT

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

OrderListItem DTO:
{
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
}

List response:
{
  items: OrderListItem[]
  page: number
  pageSize: number
  total: number
}

OrderDetail DTO:
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

Response example:
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
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 3812
}

FIELD RULES

- order source must always be visible
- refund requests are request workflow records, not guaranteed instant payment reversals
- buyer/supplier visibility flags matter and should be inspectable
- external provider metadata is visible in detail, not editable
- admin detail may show internal source context

ALLOWED ACTIONS

List:
- search/filter/sort
- open detail

Detail:
- inspect refund requests
- navigate to linked user/supplier/event
- use dedicated refund workflow actions if backend supports them

UI REQUIREMENTS — LIST

Columns:
- order number
- source
- status
- supplier
- customer email
- event
- amount
- refund amount
- purchasedAt
- visibility indicators
- actions

UI REQUIREMENTS — DETAIL

Tabs:
- Overview
- Customer
- Item / Event
- Source / Channel
- Refund Requests
- Activity

STATES
- loading
- empty
- error
- no results
- refund request present
- external source order
- buyer/supplier visibility mismatch

OUTPUT
- Orders list
- Order detail
- Refund requests section
- no backend code
```

---

## 11. SUPPLIER DASHBOARD PROMPT (обогащённый)

```
Task: Implement the Supplier Dashboard for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

Supplier sees only supplier-scoped operational data.

Supplier may be:
- MANUAL
- API
- HYBRID

Supplier may have:
- events
- venue admission products
- imported records
- API-integrated records

MODULE SCOPE

Implement:
1. Supplier Dashboard page

BACKEND CONTRACT

Endpoint:
GET /api/v1/supplier/dashboard

Response DTO:
{
  supplier: {
    id: string
    name: string
    mode: 'MANUAL' | 'API' | 'HYBRID'
  }
  summary: {
    activeEvents: number
    draftEvents: number
    admissionProducts: number
    recentOrders: number
    pendingRefundRequests: number
  }
  integrations?: Array<{
    provider: 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'OK' | 'WARNING' | 'ERROR'
    lastSyncAt?: string | null
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    amount: number
    currency: 'RUB'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    purchasedAt: string
  }>
}

Response example:
{
  "supplier": {
    "id": "sup_1",
    "name": "Невский Фарватер",
    "mode": "HYBRID"
  },
  "summary": {
    "activeEvents": 14,
    "draftEvents": 3,
    "admissionProducts": 1,
    "recentOrders": 18,
    "pendingRefundRequests": 2
  },
  "integrations": [
    {
      "provider": "TEPLOHOD",
      "status": "OK",
      "lastSyncAt": "2026-04-21T08:00:00Z"
    }
  ],
  "recentOrders": [
    {
      "id": "ord_3",
      "orderNumber": "DB-2026-001001",
      "amount": 5200,
      "currency": "RUB",
      "status": "PAID",
      "purchasedAt": "2026-04-20T18:00:00Z"
    }
  ]
}

FIELD RULES

- dashboard is operational, not decorative
- show source-aware warnings where relevant
- no fake financial analytics
- no admin-only internals

ALLOWED ACTIONS

- navigate to my events
- navigate to my venues/admission
- navigate to my orders
- navigate to integrations
- navigate to support

UI REQUIREMENTS

Blocks:
- summary cards
- integration health block
- recent orders
- quick links
- warnings / action-needed block

STATES
- loading
- empty
- error
- integration warning
- integration error

OUTPUT
- Supplier dashboard
- no backend code
```

---

## 12. SUPPLIER MY EVENTS MODULE PROMPT

```
Task: Implement the Supplier My Events module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

Supplier sees only own events.
Records may be:
- native/editable
- imported/read-only
- API-integrated/partially editable
- hybrid override-capable

MODULE SCOPE

Implement:
1. My Events List page
2. My Event Detail page

BACKEND CONTRACT

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

Response example:
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
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 28
}

FIELD RULES

- supplier cannot edit source-owned fields unless explicitly allowed
- source = PORTAL usually editable
- source = TICKETSCLOUD / TEPLOHOD mostly read-only
- source = PARTNER_API partially editable
- clearly show editable vs read-only groups

ALLOWED ACTIONS

List:
- search/filter
- open detail

Detail:
- edit allowed fields
- inspect source/integration info
- navigate to orders
- navigate to support/request flow

UI REQUIREMENTS

List columns:
- title
- source
- status
- editability state
- sync
- last session
- updatedAt
- actions

Detail tabs:
- Overview
- Content
- Media
- Schedule / Sessions
- Categories & Pricing
- Orders / Sales
- Integration / Source
- Support / Requests

STATES
- loading
- empty
- error
- read-only imported
- partially editable API
- sync warning
- sync error
- archived

OUTPUT
- My Events list
- My Event detail
- no backend code
```

---

## 13. SUPPLIER MY VENUES / ADMISSION MODULE PROMPT

```
Task: Implement the Supplier My Venues / Admission module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

Supplier may manage venue-linked products.
A venue may be:
- NONE
- ADMISSION_ONLY
- EVENTS_ONLY
- HYBRID

MODULE SCOPE

Implement:
1. My Venues list
2. My Venue detail
3. Admission section/tab

BACKEND CONTRACT

Endpoints:
GET /api/v1/supplier/venues
GET /api/v1/supplier/venues/:id

Query params:
- search?: string
- salesMode?: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
- page?: number
- pageSize?: number

List DTO:
{
  items: Array<{
    id: string
    title: string
    salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
    hasAdmission: boolean
    eventsCount: number
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
  salesMode: 'NONE' | 'ADMISSION_ONLY' | 'EVENTS_ONLY' | 'HYBRID'
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

Response example:
{
  "items": [
    {
      "id": "ven_12",
      "title": "Музей на воде",
      "salesMode": "ADMISSION_ONLY",
      "hasAdmission": true,
      "eventsCount": 0,
      "updatedAt": "2026-04-21T08:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 5
}

FIELD RULES

- admission is separate from event flow
- open-date admission must not require sessions
- supplier should edit only allowed venue/admission fields

ALLOWED ACTIONS

- search/filter
- open detail
- edit admission if allowed
- inspect linked events

UI REQUIREMENTS

List columns:
- title
- sales mode
- has admission
- events count
- updatedAt
- actions

Detail tabs:
- Overview
- Admission
- Events
- Content
- Support

STATES
- loading
- empty
- error
- no admission
- admission active
- hybrid

OUTPUT
- Supplier venues list
- Supplier venue detail with admission
- no backend code
```

---

## 14. SUPPLIER ORDERS / SALES MODULE PROMPT

```
Task: Implement the Supplier Orders / Sales module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

Supplier sees only orders relevant to own inventory.
Orders can originate from internal checkout or external/import/API channels.

MODULE SCOPE

Implement:
1. Supplier Orders / Sales list
2. Supplier Order detail
3. Refund/request section

BACKEND CONTRACT

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

List DTO:
{
  items: Array<{
    id: string
    orderNumber: string
    source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
    eventTitle: string | null
    customerName?: string | null
    amount: number
    currency: 'RUB'
    refundAmount?: number
    purchasedAt: string
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

Response example:
{
  "items": [
    {
      "id": "ord_51",
      "orderNumber": "DB-2026-001122",
      "source": "TEPLOHOD",
      "status": "PAID",
      "eventTitle": "Воскресный джаз на воде",
      "customerName": "Иван Петров",
      "amount": 10000,
      "currency": "RUB",
      "refundAmount": 0,
      "purchasedAt": "2026-04-20T15:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 148
}

FIELD RULES

- supplier sees scoped order info only
- no admin-only internal IDs
- refunds remain request-based objects
- source should remain visible

ALLOWED ACTIONS

- search/filter
- open detail
- inspect refund status
- navigate to support flow if available

UI REQUIREMENTS

List columns:
- order number
- source
- status
- event
- customer
- amount
- refund amount
- purchasedAt
- actions

Detail tabs:
- Overview
- Item
- Customer
- Refund Requests
- Activity

STATES
- loading
- empty
- error
- refund request present
- no results

OUTPUT
- Supplier orders list
- Supplier order detail
- no backend code
```

---

## 15. SUPPLIER INTEGRATIONS MODULE PROMPT

```
Task: Implement the Supplier Integrations module for Daibilet

CONTEXT

Frontend-only.
Backend already exists and is fixed.

This is not a full self-service integration studio.
This is an operational visibility and diagnostics module.

Relevant for:
- API suppliers
- imported suppliers
- hybrid suppliers

MODULE SCOPE

Implement:
1. Integrations page
2. Source connection cards
3. Sync diagnostics sections

BACKEND CONTRACT

Endpoint:
GET /api/v1/supplier/integrations

Response DTO:
{
  items: Array<{
    provider: 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API'
    status: 'OK' | 'WARNING' | 'ERROR'
    connected: boolean
    lastSyncAt?: string | null
    importedRecordsCount?: number | null
    lastErrorMessage?: string | null
  }>
}

Response example:
{
  "items": [
    {
      "provider": "TEPLOHOD",
      "status": "OK",
      "connected": true,
      "lastSyncAt": "2026-04-21T08:00:00Z",
      "importedRecordsCount": 42,
      "lastErrorMessage": null
    },
    {
      "provider": "PARTNER_API",
      "status": "WARNING",
      "connected": true,
      "lastSyncAt": "2026-04-20T21:00:00Z",
      "importedRecordsCount": 18,
      "lastErrorMessage": "Rate limit warning"
    }
  ]
}

FIELD RULES

- this module is visibility-focused
- do not invent webhook management
- do not invent credentials editing unless explicitly requested
- diagnostics should be readable and practical

ALLOWED ACTIONS

- inspect source status
- navigate to support/request flow
- open linked imported data section if available

UI REQUIREMENTS

Sections:
- integration summary
- source cards
- sync status
- last sync / last error
- imported records count
- action-needed warnings

STATES
- loading
- empty
- error
- warning
- error state per provider

OUTPUT
- Supplier integrations page
- no backend code
```
