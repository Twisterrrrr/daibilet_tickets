# Promo-блоки главной — спецификация

> Последнее обновление: 2026-03-10. См. `docs/Tasktracker.md` — раздел «Promo-блоки главной».

## Цель

Сейчас карточки («Масленица», «Зимний город», «Каникулы с детьми» и др.) захардкожены в `packages/frontend/src/components/ui/PromoBlock.tsx`. Цель — управлять ими через админку.

## Подход

Вертикальный срез: **Prisma → Admin CRUD API → Admin UI → Public API → Frontend** с fallback. Отдельный небольшой PR, без смешивания с другими фичами.

---

## 1. Модель данных (Prisma)

### Рекомендуемая схема (расширенная)

```prisma
model PromoBlock {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  description   String
  href          String

  selectionMode PromoSelectionMode @default(MANUAL)
  contentType   PromoContentType   @default(LINK_ONLY)

  // AUTO: правила подбора
  citySlug      String?
  categorySlug  String?
  tagSlugs      String[]  @default([])
  isKids        Boolean?
  isIndoor      Boolean?
  autoLimit     Int       @default(12)
  autoSort      PromoSortMode @default(POPULAR)

  // Иконка: библиотека или свой SVG
  iconSource    PromoIconSource @default(LIBRARY)
  iconKey       String?
  iconSvg       String?

  // Фон: сплошной цвет или градиент
  bgMode        PromoBgMode @default(GRADIENT)
  bgColor       String?
  gradientFrom  String?
  gradientTo    String?

  startsAt      DateTime?
  endsAt        DateTime?
  sortOrder     Int       @default(0)
  priority      Int       @default(0)
  isActive      Boolean   @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  events        PromoBlockEvent[]
  venues        PromoBlockVenue[]

  targetCitySlugs String[] @default([])  // v2.5: пустой = глобальный; иначе только для указанных citySlug

  @@index([isActive, sortOrder])
}

model PromoBlockEvent {
  id           String    @id @default(cuid())
  promoBlockId String
  eventId      String
  sortOrder    Int       @default(0)

  promoBlock   PromoBlock @relation(...)
  event        Event      @relation(...)

  @@unique([promoBlockId, eventId])
}

model PromoBlockVenue {
  id           String    @id @default(cuid())
  promoBlockId String
  venueId      String
  sortOrder    Int       @default(0)

  promoBlock   PromoBlock @relation(...)
  venue        Venue      @relation(...)

  @@unique([promoBlockId, venueId])
}

enum PromoSelectionMode { MANUAL AUTO }
enum PromoContentType { EVENTS VENUES LINK_ONLY }
enum PromoIconSource { LIBRARY SVG }
enum PromoBgMode { SOLID GRADIENT }
enum PromoSortMode { POPULAR SOONEST RATING RANDOM }
```

### Почему не months[]

- Не покрывает: Масленицу с плавающими датами, весенние каникулы, новогодний период 15.12–14.01, короткие промо на 5–10 дней, полностью ручной режим.
- `startsAt` / `endsAt` дают точные периоды показа.

### Почему iconKey/gradientKey, а не raw

- В БД хранить ключи, на фронте — whitelist map. Иначе админка может сломать вёрстку произвольными Tailwind-классами.
- `iconSource`: LIBRARY → `iconKey`, SVG → `iconSvg` (с санитизацией).
- `bgMode`: SOLID → `bgColor`, GRADIENT → `gradientFrom` / `gradientTo`.

---

## 2. Backend Admin API

- `GET /admin/promo-blocks` — список
- `GET /admin/promo-blocks/:id` — один
- `POST /admin/promo-blocks`
- `PATCH /admin/promo-blocks/:id`
- `DELETE /admin/promo-blocks/:id`

Валидация: slug (kebab-case), href (non-empty), months → заменено на startsAt/endsAt.

---

## 3. Публичный API

- `GET /api/v1/promo-blocks?city={citySlug}` — активные блоки, опционально с фильтром по городу
- `GET /api/v1/promo-collections/:slug` — подборка по slug (title, description, resolved items)

**Логика выдачи promo-blocks:**
- `isActive = true`
- `startsAt <= now` или `startsAt` null
- `endsAt >= now` или `endsAt` null
- **targetCitySlugs:** `[]` = глобальный (всем); непустой = только если `city` в массиве. Без `city` — только глобальные.
- Сортировка: `priority desc`, `sortOrder asc`, `createdAt desc`
- Кэш 5–15 мин, инвалидация при admin create/update/delete

**Collection-based блоки:** href = `/promo/{collection.slug}`. Страница `/promo/:slug` — title, description, список элементов (EVENTS/VENUES).

---

## 4. Логика наполнения событиями и местами

### MANUAL + EVENTS

- Админ явно привязывает события через PromoBlockEvent.
- Сортировка по sortOrder.

### MANUAL + VENUES

- Админ явно привязывает места через PromoBlockVenue.

### AUTO

- Фильтры: citySlug, categorySlug, tagSlugs, isKids, isIndoor.
- События: published, ACTIVE, есть активные сеансы.
- Места: активны, опубликованы, есть хотя бы одно опубликованное событие.
- Сортировка: POPULAR | SOONEST | RATING | RANDOM.
- Лимит: autoLimit (по умолчанию 12).

### LINK_ONLY

- Только карточка со ссылкой, без подборки событий/мест.

---

## 5. Admin UI

- Раздел «Промо-блоки» в Sidebar.
- Список: title, slug, href, период (startsAt–endsAt), sortOrder, isActive.
- Форма create/edit: slug, title, description, href, contentType, selectionMode, периоды, иконка (каталог или SVG), фон (solid/gradient), правила AUTO (если выбрано).
- Для MANUAL + EVENTS/VENUES: поиск и привязка событий/мест, сортировка.

---

## 6. Frontend

- Загрузка с `GET /api/v1/promo-blocks`.
- Fallback на статичный список только при **ошибке API/сети**.
- При успешном `[]` — не подставлять fallback.
- Иконки: `PROMO_ICON_MAP[iconKey]` или рендер sanitized `iconSvg`.
- Фон: `bgColor` или `linear-gradient(gradientFrom, gradientTo)`.

---

## 7. MVP (опциональное упрощение)

Если полная модель слишком тяжела для первого PR:

- `contentType`: только `LINK_ONLY`.
- Без PromoBlockEvent, PromoBlockVenue.
- Без AUTO-режима.
- Минимальный набор: slug, title, description, href, iconKey, gradientKey, startsAt, endsAt, sortOrder, isActive.

Потом добавлять EVENTS, VENUES, MANUAL/AUTO.

---

## 8. Что не делать на MVP

- Drag-and-drop сортировка.
- Отдельный media uploader.
- Аналитика просмотров/CTR.
- Сложный DSL правил, MIXED, продвинутый scoring engine.
- Хранение raw Tailwind-классов или raw SVG без санитизации.

---

## 9. Acceptance criteria

- [ ] В админке можно создавать, редактировать, удалять промо-блок.
- [ ] Можно включать/выключать блок, задавать период показа.
- [ ] Публичный API отдаёт только актуальные блоки.
- [ ] Главная использует API вместо хардкода.
- [ ] При ошибке API — fallback, при успешном [] — без fallback.
- [ ] Порядок контролируется через sortOrder/priority.
- [ ] Иконки и градиенты не ломают UI.
