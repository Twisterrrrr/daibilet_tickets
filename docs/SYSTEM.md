# System — технические инварианты и устройство

**Назначение:** правила данных, интеграций, API-слоёв и эксплуатации, которые **нельзя нарушать** при изменениях. Не продуктовый pitch — см. [`PRODUCT.md`](PRODUCT.md). Не дневник — см. [`DECISIONS.md`](DECISIONS.md).

**Связь:** [`ARCHITECTURE.md`](ARCHITECTURE.md), [`core/architecture.md`](core/architecture.md), [`OPERATIONS.md`](OPERATIONS.md).

**Полный старый конспект (до разбиения):** [`archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md`](archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md) — только reference, не канон.

---

## 1) Стек и пакеты

| Слой | Технология | Каталог |
|------|------------|---------|
| Публичный сайт | Next.js (App Router), Tailwind | `packages/frontend` |
| Admin V3 | Vite + React + RR + Tailwind | `packages/frontend-admin-v3` |
| Admin V1 | Vite + React | `packages/frontend-admin` |
| Backend | NestJS + Prisma + PostgreSQL + Redis + BullMQ | `packages/backend` |
| Shared | TypeScript | `packages/shared` |

---

## 2) Импорт и внешние границы

- **Ticketscloud** (gRPC tc-simple, REST v2, widget), **Teplohod.info** — основные источники каталога; правила маппинга и ограничения: [`core/ingestion.md`](core/ingestion.md).
- **YooKassa** — оплата; идемпотентность webhook/refund — [`core/checkout.md`](core/checkout.md), [`product/finance.md`](product/finance.md).
- **Partner B2B API**, **SMTP**, прочие — по мере использования; детали в бэкапе `Project.md.full-backup` при необходимости.

---

## 3) Модель данных — принципы (без полного перечня полей)

- **Импорт vs override:** `EventOverride` и аналоги лежат поверх sync-данных; заголовок для витрины: override ?? исходный `Event.title`.
- **Подкатегории links-first:** источник истины — `EventSubcategoryLink` / `VenueSubcategoryLink` + `Subcategory`; legacy `Event.subcategories[]` только read-fallback. Запись — в link-таблицы. Подробно: [`core/classification.md`](core/classification.md).
- **Контентные связи (эволюция):** dual-read FK/join + legacy slug-массивы — см. бэкап § «Эволюция связей контента» и код.
- **Order mirror (`Order`):** read-model поверх `CheckoutSession` / оплаты / зеркал TC; не заменяет core-таблицы. Принципы: idempotent проекции, ошибки проекции не ломают core flow.

---

## 4) Admin API — производительность списков

- Для read-heavy списков: opt-in **`lite=1`** на admin list endpoints где поддержано; по умолчанию ответ полный. Baseline: `scripts/admin-events-baseline.mjs`.

---

## 5) Venue: geo, маршруты, публичный template

- **Dual-read** district/metro: строки в API + FK на справочники при наличии.
- **Route / RoutePoint:** нормализованный слой точек; публичный блок route в карточке события при `Route.isPublished`. Детали эндпоинтов — в бэкапе и коде.
- **Venue PDP template:** `venueTemplateData` → parse → секции публичного шаблона; fallback на legacy-поля.

---

## 6) Settings (система) — границы

Settings = **поведение системы**, интеграции, RBAC, платежный режим, feature flags, SEO defaults — не контент каталога. Целевые модели/API-контуры описаны в бэкапе § «Settings (Admin V3)»; реализацию сверять с кодом `admin/settings`.

---

## 7) Прочее

Preview HMAC, статические ассеты городов, детальные списки сущностей Prisma, отзывы, финдокументы — **не дублируются здесь**; при необходимости: бэкап `Project.md.full-backup` или доменные файлы в [`domains/`](domains/) и [`entities/`](entities/).
