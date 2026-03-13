# Availability & Sessions Architecture (Phase 3)

> EventSession существует. MANUAL editable, TC/Teplohod read-only.

## Goal
Supplier управляет расписанием MANUAL-событий. Admin — диагностика (events without sessions, expired).

## Existing
- EventSession, GET/PUT /supplier/events/:eventId/sessions
- Guard: event.source !== 'MANUAL' → 400
- PackageItem sold per session

## Source-Based Editability
MANUAL: full CRUD. TC/Teplohod: read-only. Источник = Event.source.

## Admin Diagnostics
GET /admin/catalog/availability-diagnostics ?operatorId=&cityId=
Response: eventsWithoutSessions, expiredSessions, zeroCapacitySessions.

## Backend
AdminAvailabilityController или admin-catalog: getAvailabilityDiagnostics.

## Frontend
Supplier: SessionsPage или вкладка в EventEdit (list sessions, add/edit).
Admin: diagnostics table, links to events.

## Sync
Не менять. MANUAL не импортируется sync.

## Definition of Done
- Supplier управляет сессиями MANUAL через UI
- Admin видит diagnostics
- PUT sessions отклоняет для TC/Teplohod
