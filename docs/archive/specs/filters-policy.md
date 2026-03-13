# Политика быстрых фильтров (QF)

> Последнее обновление: 2026-02-21

## 1. Обзор

Справочник Query Filters — универсальная модель быстрых фильтров для каталога. Структура:

- `type` → excursion | venue | event
- `group` → логическая группа (format, theme, duration, type, visit-format, category, genre, audience)
- `slug` → URL, уникальный в рамках type
- `title` → отображаемое название
- `isSeo` → индексируемый (для SEO-посадочных)
- `priority` → порядок отображения (больше = выше)

## 2. JSON-справочник v1 (продакшн-минимум)

17 фильтров. Запуск seed: `pnpm --filter @daibilet/backend db:seed:qf` (или `npx tsx prisma/seed-query-filters.ts`).

### EXCURSIONS

| group | slug | title | isSeo |
|-------|------|-------|-------|
| format | walking | Пешеходная | ✓ |
| format | bus | Автобусная | ✓ |
| format | boat | Теплоходная | ✓ |
| theme | sightseeing | Обзорная | ✓ |
| theme | history | Историческая | ✓ |
| theme | mystic | Мистическая | ✓ |
| duration | up-to-2h | До 2 часов | — |
| duration | 2-4h | 2–4 часа | — |
| audience | with-children | С детьми | ✓ |

### VENUES (Музеи)

| group | slug | title | isSeo |
|-------|------|-------|-------|
| type | historical | Исторический музей | ✓ |
| type | art | Художественный музей | ✓ |
| type | interactive | Интерактивный музей | ✓ |
| visit-format | ticket-only | Входной билет | — |
| visit-format | with-guide | С экскурсией | ✓ |
| audience | family | Для всей семьи | ✓ |

### EVENTS

| group | slug | title | isSeo |
|-------|------|-------|-------|
| category | concert | Концерт | ✓ |
| category | theatre | Театр | ✓ |
| category | festival | Фестиваль | ✓ |
| genre | rock | Рок | ✓ |
| genre | classical | Классика | ✓ |
| audience | 18plus | 18+ | — |

## 3. Маппинг slug → backend params

См. `packages/backend/src/catalog/query-filter-map.ts`.

Правило: slug маппится на `EventSubcategory`, `VenueType`, `EventAudience` или `tag`.

## 4. Приоритеты внедрения

### V1 — обязательно (SEO-ядро)
- Тип (concert / theatre / museum / sightseeing)
- Формат экскурсии
- Тематика
- С детьми
- По городу
- По месяцу (динамический фильтр)

### V2 — рост конверсии
- Длительность
- Indoor / Outdoor
- Рейтинг
- Хит продаж / Новинка
- С мгновенным подтверждением

### V3 — коммерческий контроль
- Высокая комиссия
- Высокий чек
- Партнёрский приоритет

## 5. SEO-архитектура URL

| Паттерн | Пример |
|---------|--------|
| Базовый | `/{city}/{type}/` |
| Один фильтр | `/{city}/{type}/{filter}/` |
| Два фильтра (ограниченно) | `/{city}/{type}/{filter1}/{filter2}/` |

Примеры:
- `/spb/excursions/`
- `/spb/excursions/walking/`
- `/moscow/museums/art/`
- `/spb/excursions/walking/history/`

**Правило:** индексируем максимум 1–2 фильтра в path; остальные через query params.

## 6. База данных

```prisma
model QueryFilter {
  id       String @id @default(cuid())
  type     String // excursion | venue | event
  group    String
  slug     String
  title    String
  isSeo    Boolean @default(false)
  priority Int     @default(0)

  @@unique([slug, type])
  @@index([type])
  @@index([type, group])
}
```

Pivot `OfferQueryFilter` (eventId/venueId ↔ filterId) — фаза 2.

## 7. Масштабирование

20 индексируемых фильтров × 20 городов = 400 SEO-посадочных. При 5 типах = 2000 страниц. Управляемый объём без генерации мусора.

Расширение: до 80–120 фильтров на тип без проблем.
