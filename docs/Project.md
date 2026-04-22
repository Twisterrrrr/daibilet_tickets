# Project — Daibilet (DAIBILET.RU)

## Цели

- Публичный маркетплейс событий/экскурсий с сильным SEO (хабы: **Cities / Venues / Landings**).
- Внутренний Admin UI для операторов платформы.
- Supplier cabinet (отдельная поверхность) для партнёров/поставщиков.
- Источник истины данных — **backend** (NestJS + Prisma + PostgreSQL). UI не придумывает контракты.

## Архитектура (кратко)

- **Backend**: NestJS + TypeScript + Prisma, REST API под `/api/v1`.
- **DB**: PostgreSQL, денежные значения — в целых (копейки) там, где применимо; даты — ISO 8601, UTC в БД.
- **Admin vs Supplier**:
  - `/api/v1/admin/**` — внутренние эндпоинты (JwtAuthGuard + RolesGuard).
  - `/api/v1/supplier/**` — supplier-scoped эндпоинты (SupplierJwtGuard + SupplierRolesGuard), строгая фильтрация по `operatorId` из JWT.

## Контракты UI (заморозка)

### Admin Supplier Integrations (операционный модуль)

- UI ориентирован на работу с конфигами интеграций поставщиков: connection (masked), mapping, runs, issues.
- Эндпоинты (контракт):
  - `GET /api/v1/admin/supplier-integrations`
  - `GET /api/v1/admin/supplier-integrations/:id`
  - `POST /api/v1/admin/supplier-integrations`
  - `PATCH /api/v1/admin/supplier-integrations/:id`
  - `POST /api/v1/admin/supplier-integrations/:id/test-connection`
  - `POST /api/v1/admin/supplier-integrations/:id/run-sync`
  - `GET /api/v1/admin/supplier-integrations/:id/runs`
  - `GET /api/v1/admin/supplier-integrations/:id/issues`

### Finance — Settlements + Reconciliation (операционный контроль)

- **Не бухгалтерия**: это контрольный workflow (calculate/validate/reconcile/close) поверх книги/проекций.
- Для UI wiring добавлены явные read-endpoints поверх существующего `admin/finance/settlements`:
  - `GET /api/v1/admin/finance/settlements/list`
  - `GET /api/v1/admin/finance/settlements/:id`
  - `GET /api/v1/admin/finance/settlements/:id/orders` (MVP: ledger entries в периоде)
  - `GET /api/v1/admin/finance/settlements/:id/reconciliation` (MVP: сверка net vs ledger + duplicate refs)

## Документы

- Промпты для Lovable: `docs/product/` (v1/v2/v3 + finance).
- Дневник решений: `docs/Diary.md`.
- Трекер задач: `docs/Tasktracker.md`.

