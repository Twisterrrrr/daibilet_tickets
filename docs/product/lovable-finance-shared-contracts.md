# Finance UI — общие enum и DTO (Lovable handoff)

**Проект:** Daibilet  
**Назначение:** единый блок для вставки в промпты Lovable / выравнивания с реальным бэкендом в Cursor.

> **Важно:** это **рабочий UI contract pack**, согласованный с продуктовой моделью (см. [`finance.md`](finance.md)). Имена полей и путей `/api/v1/...` при интеграции нужно **сверить** с актуальным кодом бэкенда и заменить при расхождении — не придумывать второй источник истины.

---

## Shared enums

### OrderSource
- `INTERNAL`
- `TICKETSCLOUD`
- `TEPLOHOD`
- `PARTNER_API`

### OrderIngestionSource
- `CHECKOUT`
- `TICKETSCLOUD_MIRROR`
- `TEPLOHOD_EMAIL`
- `PARTNER_API_SYNC`
- `MANUAL`

### OrderStatus
- `PENDING`
- `PAID`
- `FAILED`
- `CANCELLED`
- `REFUND_REQUESTED`
- `REFUNDED`
- `PARTIALLY_REFUNDED`

### RefundRequestStatus
- `NEW`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `COMPLETED`
- `CANCELLED`

### SettlementStatus
- `DRAFT`
- `REVIEW`
- `APPROVED`
- `PAID`

### PayoutStatus
- `PENDING`
- `PROCESSING`
- `PAID`
- `FAILED`
- `CANCELLED`

### SupplierMode
- `MANUAL`
- `API`
- `HYBRID`

### SalesMode
- `INTERNAL_CHECKOUT`
- `EXTERNAL_WIDGET`
- `EXTERNAL_API`

### InventorySource
- `PORTAL`
- `ADMIN`
- `TICKETSCLOUD`
- `TEPLOHOD`
- `PARTNER_API`

---

## Shared financial DTOs

### MoneyAmount
```json
{
  "amount": 0,
  "currency": "RUB"
}
```

### OrderFinancialSnapshot
```json
{
  "gross": 0,
  "refundAmount": 0,
  "platformCommissionEstimated": 0,
  "supplierPayableEstimated": 0,
  "currency": "RUB"
}
```

### OrderProjectionListItem
Поле `source` / `ingestionSource` / `status` — строковые литералы из enum выше.

```typescript
type OrderProjectionListItem = {
  id: string;
  orderNumber: string;
  source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API';
  ingestionSource: 'CHECKOUT' | 'TICKETSCLOUD_MIRROR' | 'TEPLOHOD_EMAIL' | 'PARTNER_API_SYNC' | 'MANUAL';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  supplierId: string | null;
  supplierName: string | null;
  customerUserId: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  titleSnapshot: string | null;
  dateSnapshot: string | null;
  amount: number;
  currency: 'RUB';
  refundAmount?: number;
  platformCommissionEstimated?: number;
  supplierPayableEstimated?: number;
  salesMode: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API';
  inventorySource: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API';
  isVisibleInBuyerAccount: boolean;
  isVisibleInSupplierCabinet: boolean;
  purchasedAt: string;
  updatedAt: string;
};
```

### OrderProjectionDetail
```typescript
type OrderProjectionDetail = {
  id: string;
  orderNumber: string;
  source: 'INTERNAL' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API';
  ingestionSource: 'CHECKOUT' | 'TICKETSCLOUD_MIRROR' | 'TEPLOHOD_EMAIL' | 'PARTNER_API_SYNC' | 'MANUAL';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  supplier: {
    id: string | null;
    name: string | null;
    mode?: 'MANUAL' | 'API' | 'HYBRID' | null;
  };
  customer: {
    userId: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  item: {
    eventId: string | null;
    eventTitle: string | null;
    titleSnapshot: string | null;
    dateSnapshot: string | null;
  };
  financials: {
    gross: number;
    refundAmount: number;
    platformCommissionEstimated: number;
    supplierPayableEstimated: number;
    currency: 'RUB';
  };
  sourceContext: {
    salesMode: 'INTERNAL_CHECKOUT' | 'EXTERNAL_WIDGET' | 'EXTERNAL_API';
    inventorySource: 'PORTAL' | 'ADMIN' | 'TICKETSCLOUD' | 'TEPLOHOD' | 'PARTNER_API';
    checkoutSessionId?: string | null;
    paymentIntentId?: string | null;
    externalOrderId?: string | null;
    externalEventId?: string | null;
    providerName?: string | null;
    lastSyncAt?: string | null;
  };
  visibility: {
    isVisibleInBuyerAccount: boolean;
    isVisibleInSupplierCabinet: boolean;
  };
  refundRequests: Array<{
    id: string;
    status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    requestedAmount?: number | null;
    reason?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
```

---

## Source-specific breakdown DTOs (для source-aware UI)

### TicketscloudOrderMirror
```typescript
type TicketscloudOrderMirror = {
  source: 'TICKETSCLOUD';
  ingestionSource: 'TICKETSCLOUD_MIRROR';
  externalOrderId: string;
  externalEventId?: string | null;
  status: 'PAID' | 'CANCELLED' | 'PENDING';
  amount: number;
  currency: 'RUB';
  customerEmail?: string | null;
  customerPhone?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  eventTitle?: string | null;
  purchasedAt: string;
  updatedAt: string;
};
```

### TeplohodOrderProjection
```typescript
type TeplohodOrderProjection = {
  source: 'TEPLOHOD';
  ingestionSource: 'TEPLOHOD_EMAIL';
  externalOrderId: string | null;
  status: 'PAID';
  amount: number;
  currency: 'RUB';
  customerEmail?: string | null;
  customerPhone?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  eventTitle?: string | null;
  purchasedAt: string;
  updatedAt: string;
};
```

### PartnerApiOrderProjection
```typescript
type PartnerApiOrderProjection = {
  source: 'PARTNER_API';
  ingestionSource: 'PARTNER_API_SYNC';
  externalOrderId: string;
  externalEventId?: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  amount: number;
  currency: 'RUB';
  customerEmail?: string | null;
  customerPhone?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  eventTitle?: string | null;
  purchasedAt: string;
  updatedAt: string;
  lastSyncAt?: string | null;
};
```

---

## Связь с каноном продукта

Детальный доменный разбор (ledger, payout, отчёты): **[`finance.md`](finance.md)**.
