# Task 10 — Phase B: Venue storefront health + связанные события

> Спецификация для реализации **без дублирования доменных правил на фронте**: один **read model** с backend, UI только отображает.

Связь с Phase A: для события уже есть `GET /admin/events/:id/summary`. Для площадки — **аналогичный принцип**: `GET /admin/venues/:id/summary` (или то же имя паттерна `/summary`).

---

## 1. Цели Phase B

1. **Витрина площадки** — агрегаты по связанным событиям: сколько «живых» в каталоге, среднее качество, доля готовых к продаже.
2. **События площадки** — компактный список с **цветом/статусом качества**, ссылками в админку и на сайт (новая вкладка).
3. **Контент площадки** — в спеке зафиксировать **управляемый редактор** для `venueTemplateData` (полная реализация может быть **подфазой B2**, см. §6).

Приоритет реализации: **B1 (summary + таблица событий)** → **B2 (редактор контента + preview)**.

---

## 2. Источники данных (уже в репозитории)

| Сущность | Поля / связи |
|----------|----------------|
| **Venue** | `id`, `isFeatured` (приоритет на витрине «музеи» и т.п.), `venueTemplateData` (JSON), `events` → `Event[]` |
| **Event** | `venueId`, `isActive`, `isDeleted`, `category`, `rating`, `reviewCount` |
| **EventOverride** | `qualityStatus` (`READY` / `BLOCKED` / …), `isHidden`, `manualBoost` — уже пишутся/используются |
| **EventQualityService** | `validateForPublish(eventId)` — **источник истины** для «готовности», если нужен свежий пересчёт |
| **Сеансы** | `EventSession` — «будущие слоты» для фильтра «активно к продаже» |

**Связь событие ↔ площадка:** в основном `Event.venueId`. Дополнительно у **EventOffer** есть `venueId` (билет напрямую к музею) — в Phase B **v1** учитывать только `Event.venueId`, опционально v2: «события с оффером на эту площадку».

---

## 3. API: единый read model

### 3.1 `GET /admin/venues/:id/summary`

**Роли:** `ADMIN`, `EDITOR`, `VIEWER` (как у `GET /admin/venues/:id`).

**Ответ:** `VenueAdminSummaryDto` (имя класса на backend, ниже — контракт).

```typescript
type VenueAdminSummaryDto = {
  id: string;

  /** Блок «Витрина площадки» */
  storefront: {
    /** События с venueId = id, isDeleted = false, isActive = true */
    activeEventsCount: number;

    /** Из них: есть хотя бы один будущий активный сеанс (startsAt > now, не отменён) */
    eventsWithFutureSlotsCount: number;

    /** Среднее арифметическое rating по этим событиям (null если нет ни одного с rating > 0) */
    avgEventRating: number | null;

    /**
     * Доля «готовых» к витрине: события, для которых validateForPublish → isReady,
     * либо при перегрузе — доля по qualityStatus === 'READY' в override (см. §4).
     */
    readyRatio: number | null; // 0..1

    /** Пояснение, как считалось readyRatio (например FULL_SCAN | FROM_OVERRIDE_CACHE) */
    readyDataQuality: 'FULL' | 'PARTIAL' | 'FROM_OVERRIDE_ONLY';

    /** Уже есть в Venue: избранная площадка на подборках */
    isFeatured: boolean;
  };

  /** Блок «Контент» — только метаданные для UI; сами поля редактируются как сейчас или в B2 */
  content: {
    hasVenueTemplateData: boolean;
    /** Ключи секций, если есть registry (опционально Phase C overlap) */
    sectionKeys?: string[];
  };

  /** Список для таблицы «События площадки» */
  relatedEvents: Array<{
    id: string;
    slug: string;
    title: string;
    category: string | null;

    /** Агрегат с backend, не вычислять на фронте */
    readinessStatus: 'READY' | 'NEEDS_WORK' | 'BLOCKED' | 'UNKNOWN';

    /** Дублирует логику Phase A: из override.isHidden / suppressLowQuality при необходимости */
    storefrontVisibility: 'VISIBLE' | 'HIDDEN' | 'SUPPRESSED';

    rating: number | null;
    reviewCount: number;

    /** Быстрые ссылки — фронт только подставляет id/slug */
    adminUrlPath: string; // "/events/:id/edit" — или как в роутере админки
    publicUrlPath: string; // "/events/:slug" — префикс сайта с фронта
  }>;
};
```

**Ошибки:** `404` если площадка не найдена или `isDeleted`.

---

## 4. Логика на backend (без дублирования на фронте)

### 4.1 Подсчёты «витрины»

- **activeEventsCount:** `count` `Event` где `venueId = id`, `isDeleted = false`, `isActive = true`.
- **eventsWithFutureSlotsCount:** из того же множества событий — те, у которых есть `EventSession` с `startsAt > now`, `isActive`, `canceledAt = null` (или ваша актуальная семантика «будущий слот»).
- **avgEventRating:** среднее по `event.rating` (только где `rating > 0`), иначе `null`.

### 4.2 `readyRatio` и `readinessStatus` по событиям

**Вариант A (точный, тяжелее):** для каждого связанного события вызвать `EventQualityService.validateForPublish` и посчитать долю `isReady`. Ограничение: не более **N** событий за запрос (например 30) + в DTO `readyDataQuality: 'PARTIAL'` + `note`, если событий больше.

**Вариант B (быстрый):** использовать **`EventOverride.qualityStatus`**, если `qualityCheckedAt` не старше **T** дней; иначе для «подсветки» строки — `UNKNOWN` или триггер фонового пересчёта (вне Phase B).

**Рекомендация для Phase B v1:** гибрид — для **таблицы** `relatedEvents` брать `qualityStatus` из override + маппинг в `READY`/`BLOCKED`; статус `NEEDS_WORK` давать только если есть **единый summary по событию** (повторный вызов уже готового `/events/:id/summary` внутри сервиса — **не делать N HTTP**, а вынести общую функцию в shared helper или вызывать `EventAdminSummaryService.getSummary` для топ-K «проблемных»).

**Минимально достаточно для B1:**  
`readinessStatus` на строке события = из **`EventAdminSummaryService.getSummary(eventId).readiness.status`** только для **первых 20** событий; остальные `UNKNOWN` + флаг `truncated: true` в корне DTO.

### 4.3 `storefrontVisibility`

- `HIDDEN` если `override.isHidden === true`
- `SUPPRESSED` если `override.suppressLowQuality === true`
- иначе `VISIBLE`

Всё из Prisma, без логики на фронте.

### 4.4 Площадка «приоритет» / featured

- Уже: `Venue.isFeatured` — отдать в `storefront.isFeatured`, в UI бейдж «В подборке / избранное».

---

## 5. UI (`VenueEdit.tsx`)

### 5.1 Размещение

- После шапки страницы / первого блока — **карточка «Витрина»** (цифры из `storefront`).
- Ниже или во второй колонке — **таблица «События площадки»** (`relatedEvents`): колонки Название, Качество (бейдж), Видимость, Рейтинг, действия.

### 5.2 Действия в таблице

| Действие | Реализация |
|----------|------------|
| Открыть в админке | `<Link to={adminUrlPath}>` или `navigate` |
| Открыть на сайте | `window.open(publicUrlPath)` с базовым URL из env |
| «Скрыть из каталога» | только если уже есть **PATCH** `hide` / `suppress` для события — вызвать существующий API; иначе **TODO** в спеке, не выдумывать новый маршрут без аудита |

### 5.3 Контент (B2)

- Секции «О площадке», «Что посмотреть», … — маппинг из **существующего** `venueTemplateData` и **registry** (см. `content-template.types` / Phase C).
- В Phase B1 достаточно блока **content.hasVenueTemplateData** + ссылка «Редактировать JSON» как сейчас; визуальный редактор — **B2**.

---

## 6. Файлы backend (план)

| Файл | Назначение |
|------|------------|
| `admin/dto/admin-venue-summary.dto.ts` | Классы DTO + Swagger |
| `admin/venue-admin-summary.service.ts` | Агрегация Prisma + опционально `EventAdminSummaryService` / `EventQualityService` |
| `admin/admin-venues.controller.ts` | `GET :id/summary` **перед** `GET :id`, если Nest требует порядок |
| Регистрация | `AdminModule` — provider |

---

## 7. Производительность и ограничения

- Один запрос на загрузку страницы площадки — **не** N+1 HTTP с фронта.
- Лимит углублённого quality по событиям (20–30) + явное поле `truncated` / `readyDataQuality`.
- Кэширование (Redis) — **не** в Phase B v1, опционально позже.

---

## 8. Критерии готовности Phase B1

- [x] `GET /admin/venues/:id/summary` возвращает согласованный DTO.
- [x] `VenueEdit` показывает блок витрины и таблицу событий с бейджами.
- [x] Нет расчёта readiness/видимости на фронте.
- [x] Документ обновлён: `Tasktracker.md` — Phase B1 выполнен.

---

## 9. Отложено (B2 / Phase C)

- Полноценный **визуальный редактор** `venueTemplateData` + preview — см. **Phase C2** в `docs/Task10-PhaseC-Content-Blocks-Spec.md`.
- Тепловая карта слотов по площадке (несколько событий) — отдельная задача.

---

## 10. Связанные документы

- `docs/Task10-Admin-Intelligence-Audit.md` — общий аудит Task 10.
- `docs/Task10-PhaseB-Venue-Spec.md` — этот файл (спецификация Phase B).
- `docs/Task10-PhaseC-Content-Blocks-Spec.md` — scope Phase C (C1 Event, C2 Venue).
