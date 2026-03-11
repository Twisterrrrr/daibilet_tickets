# Admin System — админка Daibilet

> Объединённый документ: архитектура админки, pipelines, ops tools, scheduling.

---

## 1. Admin Architecture

### 1.1 Стек

- **frontend-admin** — React (Vite) на порту 5173.
- **Backend** — NestJS на порту 4000.
- **Модель:** Event (источник) + EventOverride (правки «для Daibilet»).

### 1.2 Разделы и API

| Раздел | API | Статус |
|--------|-----|--------|
| Dashboard | `/admin/dashboard` | OK |
| События | `/admin/events`, override в EventEdit | OK |
| Очередь постредакции | `/admin/postedit/queue` | TODO |
| Заказы, Поддержка | `/admin/orders`, `/admin/support` | OK |
| Города, Venues, Tags, Collections, Лендинги, Combo, Статьи | CRUD | OK |
| Виджеты Teplohod, Поставщики, Модерация | `/admin/widgets`, `/admin/suppliers`, `/admin/moderation` | OK |
| Failed Jobs, Сверка, Аудит, Настройки | `/admin/jobs/failed`, `/admin/reconciliation`, `/admin/settings` | OK |

### 1.3 EventOverride и publish-gate

- **editorStatus:** NEEDS_REVIEW | IN_PROGRESS | PUBLISHED | REJECTED.
- **Опубликовано:** сайт берёт override.title ?? event.title; если editorStatus !== PUBLISHED — не показывать.

---

## 2. Admin Pipelines

### 2.1 Импорт TC/TEPLOHOD → очередь постредакции

1. Sync обновляет Event/EventSession/EventOffer.
2. **PostEditQueueService.ensureOverridesForImportedEvents** — для новых/обновлённых создаёт override с NEEDS_REVIEW.
3. PUBLISHED не сбрасывается — только lastImportedAt.

### 2.2 Очередь в админке

- Список EventOverride с NEEDS_REVIEW.
- EventEdit: блок «Оригинал» (read-only) + «Для Daibilet» (Override).

---

## 3. Operations Tools

### 3.1 Catalog Observability

**GET /admin/ops/metrics** — `cache: { hits, misses, hitRate }`

### 3.2 Flush Cache

**POST /admin/settings/ops/cache/flush?namespace={ns}**

| namespace | Описание |
|-----------|----------|
| full | Вся инвалидация |
| cities, events, catalog, tags, regions, landings, combos, search | По namespace |

### 3.3 Resync with Progress

**POST /admin/settings/ops/sync/full** — ставит job `singleton_sync_full`.  
**POST /admin/settings/ops/sync/incremental** — `singleton_sync_incremental`.  
**GET /admin/settings/ops/sync/progress?jobId=...** — state, finishedOn, failedReason.

---

## 4. Scheduling System (MANUAL события)

### 4.1 Модель

- **Слот** = EventSession; без отдельной страницы.
- **Статус:** isActive, canceledAt, cancelReason.
- **soldCount** — вычисляется из PackageItem (BOOKED + CONFIRMED).
- **locked** = soldCount > 0 → запрет delete/move.

### 4.2 API

| Метод | Описание |
|-------|----------|
| GET /admin/events/:id/sessions?from&to | Сеансы + soldCount |
| POST /admin/events/:id/sessions/batch-create | Создание пачкой |
| PATCH /admin/sessions/:id | pause/resume, startsAt |
| PATCH /admin/sessions/:id/capacity | capacityTotal ≥ soldCount |
| DELETE /admin/sessions/:id | Только soldCount=0 |
| POST /admin/sessions/:id/cancel | sold>0 → refunds |

### 4.3 Качество события

**GET /admin/events/:id/quality** — on-demand, без записи в БД:
`{ isSellable, issues: [{ code, field, message, severity, tabKey }] }`

### 4.4 Event readiness

- **isHidden** — ручное скрытие.
- **sellability** — вычисляемо (качество + сеансы + офферы).
- POST /admin/events/:id/publish — 409 при blocking issues.

Детали: `archive/old-specs/AdminScheduleSpec.md`, `archive/old-specs/AdminPipeline.md`.
