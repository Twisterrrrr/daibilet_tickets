# Integrations Extension Points (Phase 8)

Thin interfaces only. Без переписывания TcSync/TepSync.

## SyncAdapter

```ts
// packages/backend/src/catalog/sync-adapter.interface.ts
interface SyncResult {
  status: string;
  eventsProcessed?: number;
  errors?: string[];
  [key: string]: unknown;
}

interface SyncAdapter {
  readonly id: string;
  readonly name: string;
  syncAll(): Promise<SyncResult>;
}
```

TcSyncService.syncAll() и TepSyncService.syncAll() соответствуют контракту (doc-only mapping).

## AvailabilityProvider

getAvailability(offerId): Promise<Availability>. Опционально.

## BookingProvider

reserve, confirm. TcBookingProvider, PartnerBookingProvider уже реализованы.

## Supplier API & UI

- **GET /supplier/integrations** — статус: TC, Teplohod, Partner API, Manual
- **IntegrationsStatusPage** — read-only (подключено / нет событий)

## Definition of Done

- [x] SyncAdapter interface
- [x] SupplierIntegrationsService + API
- [x] Страница «Интеграции» в supplier portal
