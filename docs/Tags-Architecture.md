# Tags Architecture (Daibilet)

Дата обновления: 2026-03-23

## 1. Зачем нужны 2 слоя тегов

Система тегов в Daibilet разделена на два семантических слоя:

- `STRUCTURAL` — таксономия каталога (паспорт события: что это, для кого, в каком формате).
- `POPULAR` — слой спроса (поисковые/маркетинговые/SEO запросы).

Цель разделения:

- не смешивать устойчивую структуру каталога с волатильными поисковыми интентами;
- сохранить предсказуемость фильтров и SEO-фасетов;
- дать основу для будущих рекомендаций и похожих событий.

## 2. Доменная модель

### 2.1. Enums

- `TagKind`: `STRUCTURAL | POPULAR`
- `StructuralTagGroup`: `THEME | AUDIENCE | FORMAT`

### 2.2. Tag

Ключевые поля:

- `code` — стабильный id словаря
- `slug` — URL-safe идентификатор
- `name`, `nameEn?`, `description?`
- `tagKind`, `structuralGroup?`
- `isActive`, `isFeatured`, `sortOrder`

### 2.3. Связь с событием

- `EventTag` (`eventId`, `tagId`, `assignedBy?`, `createdAt`)
- модель many-to-many, без удаления исторических связей при cleanup.

## 3. Бизнес-правила

### 3.1. На уровне назначения тегов событию

В `EventTagRulesService`:

- `THEME` — максимум 1
- `AUDIENCE` — максимум 1
- `FORMAT` — максимум 1
- `POPULAR` не может иметь `structuralGroup`

### 3.2. На уровне create/update тега

В `AdminTagsController`:

- `tagKind` обязателен
- если `tagKind=STRUCTURAL`, `structuralGroup` обязателен
- если `tagKind=POPULAR`, `structuralGroup` должен быть `null`

### 3.3. На уровне БД

Constraint `tag_kind_group_check`:

- STRUCTURAL -> group NOT NULL
- POPULAR -> group NULL

Применяется в 2 шага:

1. `NOT VALID` (без падения на legacy данных)
2. `VALIDATE CONSTRAINT` после cleanup и audit.

## 4. Legacy cleanup и rollout

### 4.1. Скрипты

- `scripts/auditTags.ts`
- `scripts/migrateLegacyTags.ts`
- `scripts/postMigrationVerifyTags.ts`

### 4.2. Рекомендуемая последовательность

1. Применить Prisma migrations (добавление `tagKind`, `structuralGroup`, `code`)
2. `migrate:legacy-tags`
3. `audit:tags`
4. `verify:tags-post-migration`
5. финальный `db:migrate:prod` для миграции `VALIDATE CONSTRAINT` (если ещё не применена)

### 4.3. Безопасность

- автоматическое удаление тегов запрещено;
- event-tag связи не трогаются деструктивно;
- при нераспознаваемых legacy кодах — деактивация, а не удаление.

## 5. API и response shape

### 5.1. Catalog

- `GET /catalog/tags?kind=&group=&activeOnly=`
- `GET /catalog/events` с `structuralTags` и `popularTags` (AND-логика)

В event response:

- `structuralTags`: `{ THEME[], AUDIENCE[], FORMAT[] }`
- `popularTags`: `string[]`
- временный fallback:
  - `legacyTags?: string[]`
  - `legacyTagItems?: { id, name, code, isLegacy: true }[]`

### 5.2. Admin

- `GET/POST/PATCH /admin/tags`
- `GET/PUT /admin/events/:id/tags`

## 6. SEO и Routing Prep

Добавлен `TagSeoRoutingService`:

- structural route: `/{citySlug}/{tagSlug}-excursions` (taxonomy layer)
- popular route: `/{citySlug}/{tagSlug}` (demand layer)
- helper генерации SEO-safe `title`/`description`.

Preview endpoint:

- `GET /seo/routing/tag-preview/:kind/:citySlug/:tagSlug`

## 7. Модерация и publish gate (SEO-критично)

В `EventQualityService` добавлен SEO-gate:

- публикация блокируется, если нет хотя бы одного:
  - `STRUCTURAL/THEME`
  - `STRUCTURAL/FORMAT`

Коды quality-ошибок:

- `MISSING_STRUCTURAL_THEME_TAG`
- `MISSING_STRUCTURAL_FORMAT_TAG`

## 8. Supplier policy

Принята модель:

- словарь тегов и их семантика — зона админки/системы;
- поставщик не создаёт и не редактирует справочник тегов;
- на текущем этапе в supplier-кабинете теги события отображаются read-only (без unsafe расширения прав).

## 9. Anti-patterns

Не допускается:

- free-form tags вместо controlled dictionary;
- подмена structural тегов popular тегами;
- хранение тегов как строкового массива в `Event`;
- смешение taxonomy и demand в одном неразличимом поле;
- silent-удаление legacy тегов/связей при cleanup.

## 10. Примеры

### Теплоход на развод мостов

- STRUCTURAL:
  - THEME: `boat_theme`
  - AUDIENCE: `couples`
  - FORMAT: `boat`
- POPULAR:
  - `bridge_opening`
  - `night_city`

### Экскурсия на салют

- STRUCTURAL:
  - THEME: `sightseeing`
  - AUDIENCE: `groups`
  - FORMAT: `boat`
- POPULAR:
  - `salyut`

### Прогулка по крышам ночью

- STRUCTURAL:
  - THEME: `photography`
  - AUDIENCE: `adults`
  - FORMAT: `walking`
- POPULAR:
  - `roofs`
  - `night_city`

### Семейная обзорная экскурсия

- STRUCTURAL:
  - THEME: `history`
  - AUDIENCE: `family`
  - FORMAT: `bus`
- POPULAR:
  - `date_idea` (опционально, если действительно релевантно спросу)

## 11. UX parity с Lovable: текущий статус

### 11.1. Admin UX (по затронутым страницам)

Что уже приведено ближе к контракту Lovable:

- единый `SidebarProvider` + `AdminSidebar` + `SidebarTrigger`;
- page shell с topbar, consistent контейнером и вертикальным ритмом;
- tag management flow:
  - страница списка тегов (`TagsList`) с toolbar/filter/table/empty/error;
  - страница тега (`TagEdit`) с секциями формы, helper-логикой и валидацией;
  - блок тегов в форме события (`EventTagsEditor`) с grouped structural/popular секциями, chip-like выбранными элементами, loading/error states.

Что пока не доведено до полного parity:

- не завершён pixel-level контракт по плотности таблиц/spacing/hover states на всех admin страницах;
- не весь sidebar/menu contract синхронизирован с mhtml-референсами (полный охват всех разделов не закрыт);
- нет централизованного визуального чек-листа parity для всех list/detail состояний в админке.

### 11.2. Supplier UX (по затронутым частям)

Что уже сделано:

- supplier layout переведён на `SidebarProvider` + `SupplierSidebar`;
- унифицирован page shell (header/sidebar/content) в стиле общей backoffice системы.

Что пока ограничено:

- теги в supplier-потоке пока без отдельного dedicated UX-блока редактирования;
- политика read-only для тегов сохранена осознанно (без расширения прав поставщика на taxonomy).

Итог по UX:

- для задач тегирования админский UX закрыт на рабочем уровне и архитектурно согласован;
- для полного Lovable parity остаётся отдельная фаза визуального выравнивания (all-pages parity pass).

