# SEO Audit + Taxonomy (Subcategories) — Master Plan

> Последнее обновление: 2026-04-14  
> Статус: дизайн / целевая спецификация (без обязательства немедленной реализации).

## Главная идея

**Taxonomy (Subcategories)** задаёт структуру и смысл сущностей каталога.  
**SEO Audit** проверяет, насколько сущности и страницы соответствуют этой структуре и требованиям качества витрины.

Это один связанный слой управления качеством и структурой каталога:

- taxonomy отвечает на вопрос **«что это?»**
- audit отвечает на вопрос **«достаточно ли хорошо это оформлено и используется?»**

## 1. Роль в системе

### 1.1 Taxonomy (Subcategories / “Tags” как UI-термин)

Taxonomy — не “лейблы для красоты”, а управляющая таксономия:

- структурирует каталог
- задаёт тему/смысл сущности
- участвует в фильтрации и routing SEO‑страниц
- участвует в правилах для collections/landings (авто‑правила/инференс)
- связывает domains: events, venues и content (articles/collections/landings)

### 1.2 SEO Audit

SEO Audit — не “список красных ошибок”, а **операционный контроль качества витрины**:

- что нельзя публиковать
- что индексируется зря
- где слабый SEO‑контент
- где сломана структура или роутинг
- где taxonomy не заполнена или заполнена неконсистентно

## 2. Главный принцип

Нельзя проектировать эти блоки независимо:

- **без taxonomy** audit видит симптомы, но не видит структурную причину
- **без audit** taxonomy превращается в справочник ради справочника

Правильная связка:

- taxonomy задаёт **что это за сущность**
- audit проверяет **достаточно ли хорошо она оформлена и используется**

## 3. Taxonomy: целевая модель (обобщённо)

> В проекте уже существует `Subcategory` и links‑first связи. Ниже — целевая продуктовая спецификация таксономии и админ‑контрактов, которую можно маппить на текущую схему эволюционно, без ломки контрактов.

### 3.1 Сущность `Subcategory` (целевой shape)

```prisma
model Subcategory {
  id                String   @id @default(uuid())

  name              String
  slug              String   @unique

  description       String?

  type              SubcategoryType
  status            SubcategoryStatus @default(ACTIVE)

  parentId          String?
  parent            Subcategory? @relation("SubcategoryTree", fields: [parentId], references: [id])
  children          Subcategory[] @relation("SubcategoryTree")

  // SEO / landing behavior
  isLandingEnabled  Boolean @default(false)
  landingMode       SubcategoryLandingMode @default(NONE)

  // editorial
  sortOrder         Int @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Enums:

```prisma
enum SubcategoryType {
  UNIVERSAL
  EVENT_ONLY
  VENUE_ONLY
  CONTENT_ONLY
}

enum SubcategoryStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum SubcategoryLandingMode {
  NONE
  AUTO
  TOPIC_HUB
}
```

### 3.2 Связи (целевой intent)

- **Events**: M:N (например, `EventSubcategoryLink`)
- **Venues**: M:N (например, `VenueSubcategoryLink`)
- **Collections** (опционально): M:N (`CollectionSubcategoryLink`)
- **Landings** (опционально):
  - `primarySubcategoryId`, или
  - `queryConfig` использует `subcategoryIds`
- **Articles** (на MVP можно мягко):
  - `primarySubcategoryId?`, или
  - `relatedSubcategoryIds[]`

### 3.3 Важные инварианты taxonomy

- **Parent/child**: ограниченно и осмысленно (обычно достаточно двух уровней: тема → конкретизация).
- **Type**: нельзя смешивать event‑only / venue‑only / universal / content‑only.
- **Landing flags**: `isLandingEnabled` и `landingMode` нужны для SEO‑контента и генерации topic‑страниц.

## 4. SEO Audit: домены проверок

SEO Audit — read-heavy operational layer. На старте — **контроль и навигация**, авто‑исправления позже.

### 4.1 Domains

- **Events**: фото/название/описание/venue/city/цена/будущие сессии/subcategory/publishable.
- **Venues**: city/адрес/canonical title/subcategory/дубликаты/контент.
- **Articles**: seoTitle/seoDescription/excerpt/cover/длина/перелинковка/тема.
- **Collections**: пустота/SEO/unpublished/items/broken references/queryConfig→0/subcategory.
- **Landings**: H1/SEO/resolved events/city required/hub children/canonical conflict/indexability/topic.
- **Promo Blocks**: target/scope/expiry/inactive window/продвигается скрытый объект.
- **Taxonomy itself**: orphan, inactive parent with active child, landing-enabled on invalid type, unused, duplicates.

## 5. Архитектурная модель SEO Audit

Не один гигантский endpoint, а понятная read‑модель:

### 5.1 Issue-модель

```ts
export type SeoAuditIssue = {
  id: string
  entityType: 'EVENT' | 'VENUE' | 'ARTICLE' | 'COLLECTION' | 'LANDING' | 'PROMO_BLOCK' | 'SUBCATEGORY'
  entityId: string

  issueCode: string
  severity: 'INFO' | 'WARNING' | 'ERROR'

  title: string
  description?: string

  group: 'CONTENT' | 'SEO' | 'STRUCTURE' | 'CATALOG' | 'LINKING' | 'PUBLICATION'

  metadata?: Record<string, unknown>
}
```

### 5.2 Read endpoints (целевой контракт)

- **Summary**: агрегаты.
- **Issues list**: фильтруемый список проблем.
- **Entity issues**: проблемы конкретной сущности.

Опционально: `generatedAt`, `cacheTtlSeconds` (snapshot metadata).

## 6. API (целевой контракт): Taxonomy / Subcategories

### 6.1 List

`GET /admin/subcategories`

```ts
export type AdminSubcategoriesQuery = {
  search?: string
  type?: 'UNIVERSAL' | 'EVENT_ONLY' | 'VENUE_ONLY' | 'CONTENT_ONLY'
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  parentId?: string
  isLandingEnabled?: 'true' | 'false'
  page?: string
  limit?: string
  sort?: 'name' | 'updatedAt' | 'sortOrder'
  order?: 'asc' | 'desc'
}
```

### 6.2 Detail

`GET /admin/subcategories/:id`

### 6.3 Create / Update

- `POST /admin/subcategories`
- `PATCH /admin/subcategories/:id`

### 6.4 Error codes (целевой список)

- `SUBCATEGORY_NOT_FOUND`
- `SUBCATEGORY_SLUG_CONFLICT`
- `SUBCATEGORY_PARENT_NOT_FOUND`
- `SUBCATEGORY_INVALID_PARENT`
- `SUBCATEGORY_TYPE_CONFLICT`
- `SUBCATEGORY_LANDING_MODE_INVALID`

## 7. API (целевой контракт): SEO Audit

### 7.1 Summary

`GET /admin/seo-audit/summary`

### 7.2 Issues list

`GET /admin/seo-audit/issues`

### 7.3 Entity issues

`GET /admin/seo-audit/entity/:entityType/:entityId`

## 8. Счёт audit: synchronous vs snapshot

- **MVP**: возможно считать “на лету”, если объём умеренный.
- **Правильнее**: snapshot/read model (кэш + агрегаты + обновление по расписанию или invalidate), потому что сущностей будет много.

## 9. Стартовый набор issue rules (коды)

### 9.1 Events

- ERROR: `EVENT_NO_VENUE`, `EVENT_NO_PRICE`, `EVENT_NO_FUTURE_SESSIONS`, `EVENT_NOT_PUBLISHABLE`
- WARNING: `EVENT_NO_PHOTO`, `EVENT_WEAK_DESCRIPTION`, `EVENT_NO_SUBCATEGORY`, `EVENT_TOO_MANY_SUBCATEGORIES`
- INFO: `EVENT_NO_SEO_CONTEXT`

### 9.2 Venues

- ERROR: `VENUE_NO_CITY`, `VENUE_NO_ADDRESS`, `VENUE_UNRESOLVED_DUPLICATES`
- WARNING: `VENUE_NO_SUBCATEGORY`, `VENUE_WEAK_TITLE`, `VENUE_WEAK_DESCRIPTION`

### 9.3 Articles

- ERROR: `ARTICLE_NO_CONTENT`, `ARTICLE_NOT_PUBLISHABLE`
- WARNING: `ARTICLE_NO_SEO_TITLE`, `ARTICLE_NO_SEO_DESCRIPTION`, `ARTICLE_NO_EXCERPT`, `ARTICLE_NO_COVER`, `ARTICLE_TOO_SHORT`, `ARTICLE_NO_RELATED_CONTENT`

### 9.4 Collections

- ERROR: `COLLECTION_EMPTY`, `COLLECTION_RESOLVES_EMPTY`
- WARNING: `COLLECTION_NO_SEO_TITLE`, `COLLECTION_NO_SEO_DESCRIPTION`, `COLLECTION_TOO_FEW_ITEMS`, `COLLECTION_NO_TOPIC`

### 9.5 Landings

- ERROR: `LANDING_EMPTY_RESULTS`, `LANDING_CITY_REQUIRED`, `LANDING_INVALID_PARENT`, `LANDING_CANONICAL_CONFLICT`
- WARNING: `LANDING_NO_H1`, `LANDING_NO_SEO_TITLE`, `LANDING_NO_SEO_DESCRIPTION`, `LANDING_NO_RELATED_CONTENT`, `LANDING_THIN_CONTENT`

### 9.6 Promo Blocks

- ERROR: `PROMO_INVALID_TARGET`, `PROMO_INVALID_SCOPE`, `PROMO_EXPIRED_TARGET`
- WARNING: `PROMO_INACTIVE_WINDOW`, `PROMO_LOW_PRIORITY_CLASH`

### 9.7 Subcategories

- ERROR: `SUBCATEGORY_INVALID_PARENT`, `SUBCATEGORY_TYPE_MISMATCH`
- WARNING: `SUBCATEGORY_UNUSED`, `SUBCATEGORY_LANDING_ENABLED_BUT_UNSUPPORTED`, `SUBCATEGORY_ORPHANED`

## 10. Admin UI (целевое UX)

### 10.1 Taxonomy / Subcategories

- Раздел: **Структура → Подкатегории**
- List: Identity / Type / Hierarchy / Landing / Usage / Status / Actions
- Detail/Edit: Main / Structure / Landing / Usage / Status

### 10.2 SEO Audit

- Раздел: **Качество → SEO Audit**
- Summary page: totals + by entityType + by group + top issue codes
- Issues list: фильтры + таблица (Entity → Issue → Severity → Group → Actions)
- Entity integration: health badge + issues count + deep link в фильтрованный audit

## 11. Связь SEO Audit с Taxonomy — ключевые проверки

- **Completeness**: event/venue/collection/landing без subcategory/topic.
- **Misuse**: event linked to `VENUE_ONLY`, venue linked to `EVENT_ONLY`, inactive subcategory still in use, слишком много subcategories.
- **Usage health**: unused subcategory; landing-enabled без landing’ов; много сущностей без supporting content.

## 12. Rollout (по фазам)

- **A — Taxonomy foundation**: модель, CRUD, usage counts, parent/child rules, landing flags.
- **B — SEO Audit MVP**: summary + issues + стартовые rules + UI.
- **C — Integration**: badges/issues count на entity pages, links audit→entity, taxonomy-related rules.
- **D — Hardening**: snapshot caching, perf tuning, расширение правил, quick actions позже.

## 13. Definition of Done (MVP)

### Subcategories MVP

- есть `/admin-v3/subcategories` и `/admin-v3/subcategories/:id`
- можно создать/edit/archive subcategory
- есть parent/child support
- есть type/status/landing flags
- usage counts видны
- `tsc --noEmit` проходит
- базовые тесты есть

### SEO Audit MVP

- есть `/admin-v3/seo-audit`
- есть summary + issues list с фильтрами
- покрыты базовые домены: events/venues/articles/collections/landings/promo/subcategories
- есть переходы в сущности
- есть хотя бы базовый cache/snapshot plan
- `tsc --noEmit` проходит
- базовые тесты есть

