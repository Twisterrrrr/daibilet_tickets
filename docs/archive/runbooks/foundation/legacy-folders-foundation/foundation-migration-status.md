# Foundation migration status

Последнее обновление: 2026-04-15

Легенда:
- schema: ready = Prisma модели/поля/индексы есть
- dual-write: ready = запись в новую схему идёт параллельно legacy
- backfill: pending/done = перенос существующих данных
- dual-read: pending/done = чтение new-first с fallback на legacy
- UI migrated: pending/done = Admin V3 пишет/читает через новую схему
- legacy cleanup: later = удаление/уплотнение позже, отдельным этапом

---

## C1 — Article ↔ Landing/Collection links

| Item | Status | Notes |
|------|--------|-------|
| schema | ready | `ArticleLandingLink`, `ArticleCollectionLink` уже в `schema.prisma` |
| dual-write | ready | backend `admin/articles` зеркалит legacy → link tables |
| backfill | pending | скрипт готов: `scripts/backfill-article-related-links.ts` (dry-run/--apply + unresolved report) |
| dual-read | in_progress | public/blog + admin DTO должны читать link tables first |
| UI migrated | pending | Admin V3 Article edit сейчас редактирует raw UUID arrays |
| legacy cleanup | later | удаление `Article.related*Ids` не трогаем сейчас |

## C2 — LandingPage.filterTag → filterTagId

| Item | Status | Notes |
|------|--------|-------|
| schema | ready | `LandingPage.filterTagId` + relation `filterTagRef` есть |
| dual-write | partial | admin-landings уже подставляет `filterTag` при наличии `filterTagId` |
| backfill | pending | скрипт готов: `scripts/backfill-landing-filter-tag-id.ts` (dry-run/--apply + unresolved report) |
| dual-read | in_progress | `LandingService` FK-first; admin create/update делает slug↔id bridge |
| UI migrated | pending | нужно перевести Admin V3 landing detail на tag picker (после backfill) |
| legacy cleanup | later | legacy `filterTag` остаётся |

## C2 — Collection.filterTags → CollectionTagFilter

| Item | Status | Notes |
|------|--------|-------|
| schema | ready | `CollectionTagFilter` есть |
| dual-write | pending | при сохранении коллекции нужно заполнять и link table и legacy массив |
| backfill | pending | скрипт готов: `scripts/backfill-collection-tag-filters.ts` (dry-run/--apply + unresolved report) |
| dual-read | in_progress | selection/buildWhere должен стать FK-first (с fallback) |
| UI migrated | pending | Admin V3 collections detail должен перейти на tag picker |
| legacy cleanup | later | legacy `filterTags` остаётся |

## C4 — UserFavorite.eventSlug → eventId

| Item | Status | Notes |
|------|--------|-------|
| schema | ready | `UserFavorite.eventId` + relation `event` есть |
| dual-write | ready | `UserFavoritesService` upsert заполняет `eventId` при возможности |
| backfill | pending | скрипт готов: `scripts/backfill-user-favorites-event-id.ts` (dry-run/--apply + unresolved report) |
| dual-read | in_progress | read-path должен быть eventId-first где применимо |
| UI migrated | n/a | это public/account слой, не Admin V3 |
| legacy cleanup | later | legacy `eventSlug` остаётся |

---

## Unresolved registry

Все backfill-скрипты пишут structured отчёты в `docs/reports/` (JSON):
- `legacy_id_not_found`
- `slug_not_found`
- `target_deleted`
- `duplicate_mappings`
- `orphan_favorite`

### Policy: как трактуем unresolved (инвариант для --apply)

Принцип: **`--apply` пишет только resolvable записи. Unresolved — осознанно сохраняются как transitional legacy tails и только репортятся.**

| Unresolved type | Policy | Notes |
|---|---|---|
| `target_deleted` | skip + report | Нельзя нормализовать ссылку на `isDeleted=true` цель |
| `legacy_id_not_found` | skip + report | Legacy UUID не найден — не создаём FK/link запись |
| `slug_not_found` | skip + report | Legacy slug не резолвится — не создаём FK/link запись |
| `orphan_favorite` | skip + report | Favorite остаётся в переходном состоянии (без `eventId`) |

---

## Последний прогон backfill (локальная docker БД)

- 2026-04-15: dry-run на fixture DB (осмысленные seed-данные) для всех C1/C2/C4 скриптов.
  - C1 `backfill-article-related-links`: unresolved=`target_deleted`, `legacy_id_not_found`
  - C2 `backfill-landing-filter-tag-id`: unresolved=`slug_not_found` (`missing-legacy-tag`)
  - C2 `backfill-collection-tag-filters`: unresolved=`slug_not_found` (`missing-legacy-tag`)
  - C4 `backfill-user-favorites-event-id`: unresolved=`orphan_favorite` (`missing-event-slug`)
- 2026-04-15: `--apply` выполнен на fixture DB, затем повторный dry-run (идемпотентность):
  - C1: created=0, unresolved остались только `target_deleted` + `legacy_id_not_found`, errorCount=0
  - C2 Landings: updated=0, unresolved `slug_not_found` (`missing-legacy-tag`), errorCount=0
  - C2 Collections: unresolved=0, errorCount=0
  - C4 Favorites: updated=0, unresolved `orphan_favorite` (`missing-event-slug`), errorCount=0

---

## Важное: что подтверждено / что НЕ подтверждено

### Подтверждено (infra)
- Скрипты запускаются и подключаются к БД.
- Совместимы со схемой (после применения миграций).
- Не падают на пустой БД.
- Отчётность пишется в едином формате (JSON + stdout summary).

### НЕ подтверждено (данные)
- Реальная работа резолва legacy → normalized на непустой БД.
- Обработка ambiguous / not found / deleted кейсов на реальной исторической грязи.
- Поведение на дублях и конфликтных данных.
- Качество source_record_ref на реальных хвостах.
- Реальный --apply на непустой БД и последующая идемпотентность (повторный dry-run).

Следующий практический блокер: нужен контур с production-like данными (staging/дамп/restore), чтобы выполнить полноценный dry-run → unresolved → fix → apply → dry-run цикл.