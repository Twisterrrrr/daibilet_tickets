# Admin Pipeline — всё в админке (frontend-admin)

Цель: контент/SEO/venues/редактура событий в **frontend-admin** (React + Nest API); импорт TC и teplohod.info попадает в очередь постредакции и готов к редактированию без риска перетирания при следующем sync.

Модель: **Event** (оригинал из источника) + **EventOverride** (правки «для Daibilet»). Sync обновляет только Event/Offer/Session; override не трогает.

> Вся админка — React (Vite) + Nest API.

---

## Фаза 0 — Подготовка (сделано)

### 0.1 Что редактируем в админке
- **Редактируем:** City, Tag, LandingPage, Article, Venue, EventOverride, (опционально ExternalWidget).
- **Не редактируем:** импортные «сырьевые» поля Event/EventSession/EventOffer (кроме статуса/primary при необходимости).

### 0.2 Поля очереди постредакции (реализовано)
- **EventOverride.editorStatus** — `NEEDS_REVIEW` | `IN_PROGRESS` | `PUBLISHED` | `REJECTED`.
- **EventOverride.needsReviewAt** — для сортировки очереди.
- **EventOverride.lastImportedAt** — когда последний раз обновлялся импорт (Event.updatedAt).
- **EventOverride.updatedBy** — nullable; для авто-созданных sync override = null.

Миграция: `prisma/migrations/20260223180000_editor_status_postedit_queue/migration.sql`.

---

## Фаза 1 — Всё в админке (текущий стек)

- **frontend-admin** (Vite + React) на порту 5173.
- **backend** (NestJS) на порту 4000.
- Postgres — единая БД.

---

## Фаза 2 — Контент в админке

- Разделы: City, Tag, Article, LandingPage, Collection, ComboPage, Venue, SeoTemplate/SeoMeta (если есть).
- Права: JWT + роли ADMIN / EDITOR / VIEWER (Nest AuthGuard).

---

## Фаза 3 — Импорт TC/TEPLOHOD → очередь в админке

### 3.1 Данные
- **Event** — read-only для редакторов (оригинал из источника).
- **EventOverride** — editable. В форме: блок «Оригинал» (из Event) и блок «Для Daibilet» (поля EventOverride).

### 3.2 Авто-создание override на импорт (реализовано)
После sync (TC и Teplohod) вызывается **PostEditQueueService.ensureOverridesForImportedEvents**:
- для **новых** импортных событий создаётся EventOverride с `editorStatus = NEEDS_REVIEW`;
- для **обновлённых** импортных: если override не PUBLISHED — возврат в NEEDS_REVIEW (или сохранение IN_PROGRESS);
- **PUBLISHED** не сбрасывается — только обновляется `lastImportedAt`.

Подключение: SyncProcessor после TC/TEP sync вызывает очередь с `since: runStartedAt`.

### 3.3 Очередь постредакции в админке (TODO)
- **Страница «Очередь постредакции»** (`/postedit` или `/editorial-queue`):
  - Список EventOverride с `editorStatus = NEEDS_REVIEW`, фильтр по source (TC/TEPLOHOD).
  - Сортировка по `needsReviewAt`.
  - Переход на редактирование события (EventEdit с блоком Override).
- **EventEdit** — форма «Оригинал» (read-only Event) + «Для Daibilet» (EventOverride: title, description, imageUrl, editorStatus и т.д.).

---

## Фаза 4 — Публикация на сайт и кеш/SEO

- **Правило «опубликовано»:** сайт берёт `effectiveTitle = override.title ?? event.title`; если `editorStatus !== PUBLISHED` или `isHidden === true` — не показывать / robots noindex.
- **EventOverrideService.applyOverrides** — уже скрывает события с override, у которых `editorStatus !== PUBLISHED` или `isHidden === true`.
- **Инвалидация кеша:** при сохранении EventOverride — дергать `CacheInvalidationService` (опционально `POST /admin/ops/invalidate`).

---

## Матрица разделов: Админка (всё здесь)

| Раздел | Что делает | Backend API | Статус |
| --- | --- | --- | --- |
| Dashboard | Метрики/агрегации | `/admin/dashboard` | OK |
| События | CRUD, override, merge | `/admin/events`, override в EventEdit | OK |
| Очередь постредакции | EventOverride NEEDS_REVIEW | `/admin/postedit/queue` | **TODO** |
| Merge дублей | Дедупликация | `/admin/events/deduplicate` | OK |
| Заказы | Package, ваучер | `/admin/orders` | OK |
| Заявки | OrderRequest | `/admin/checkout` | OK |
| Поддержка | Тикеты | `/admin/support` | OK |
| Города | CRUD | `/admin/cities` | OK |
| Места (Venues) | CRUD | `/admin/venues` | OK |
| Теги | CRUD | `/admin/tags` | OK |
| Подборки | Collections | `/admin/collections` | OK |
| Лендинги | CRUD | `/admin/landings` | OK |
| Combo | CRUD | `/admin/combos` | OK |
| Статьи | CRUD | `/admin/articles` | OK |
| Виджеты Teplohod | ExternalWidget | `/admin/widgets` | OK |
| Поставщики | Operators, SupplierUser | `/admin/suppliers` | OK |
| Модерация | Event.moderationStatus (UGC) | `/admin/moderation` | OK |
| Отзывы | Reviews | `/admin/reviews` | OK |
| Failed Jobs | BullMQ | `/admin/jobs/failed` | OK |
| Сверка | Reconciliation | `/admin/reconciliation` | OK |
| Аудит | AuditLog | `/admin/audit` | OK |
| Настройки | Ops, флаги | `/admin/settings` | OK |

---

## Чеклист

- [x] EditorStatus + поля EventOverride, миграция
- [x] PostEditQueueService.ensureOverridesForImportedEvents
- [x] Вызов очереди после TC/TEP sync в SyncProcessor
- [x] applyOverrides: скрывать события с editorStatus !== PUBLISHED
- [x] OverrideEventDto + API: editorStatus для ручной установки PUBLISHED
- [ ] **Admin: страница «Очередь постредакции»** — список EventOverride NEEDS_REVIEW
- [ ] **Admin: API `/admin/postedit/queue`** — список overrides с фильтром editorStatus
- [ ] **Admin: EventEdit** — блок «Оригинал» vs «Для Daibilet», editorStatus selector
- [ ] Документация для редактора: как работает импорт и очередь постредакции

---

## Как работает очередь постредакции

1. Sync (TC или TEP) обновляет Event/EventSession/EventOffer.
2. Сразу после sync вызывается `ensureOverridesForImportedEvents(source, since)`.
3. Для каждого импортного события, обновлённого после `since`: если нет override — создаётся с NEEDS_REVIEW; если есть и не PUBLISHED — NEEDS_REVIEW; если PUBLISHED — только lastImportedAt.
4. **В админке** редактор видит очередь («Очередь постредакции»), правит override в EventEdit, выставляет PUBLISHED.
5. Сайт в applyOverrides показывает только события с override PUBLISHED (или без override).
