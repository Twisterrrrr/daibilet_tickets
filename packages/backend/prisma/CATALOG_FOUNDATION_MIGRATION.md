# Catalog foundation reset (Phase 1)

## Назначение

Замещающая схема Prisma: старый каталог (Event/Venue/старый Location, лендинги, подборки, отзывы на события, заявки OrderRequest и т.д.) удалён из `schema.prisma`. Добавлен sellable core: `Location`, `Event`, `AdmissionProduct`, `Session`, `Offer`, `ProviderLink`.

**Расчёт:** чистая БД / dev / stage без нужной истории заказов и каталога. Legacy orders / history **не** сохраняются.

## Файлы

| Файл | Описание |
|------|----------|
| `schema.prisma` | Целевая схема |
| `schema.prisma.pre-catalog-foundation-bak` | Бэкап монолита до reset (для `build_catalog_reset_schema.py`) |
| `build_catalog_reset_schema.py` | Пересборка `schema.prisma` из бэкапа (при правках нарезки) |
| `catalog-foundation.schema.fragment.prisma` | Эталон моделей foundation (вручную синхронизировать с скриптом) |

## Применение на пустой БД

```bash
cd packages/backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init.sql
# или
npx prisma db push
```

На **существующей** БД со старыми таблицами: сначала `DROP`/`TRUNCATE` зависимых таблиц (см. ниже), затем `prisma migrate deploy` или новая миграция.

## Таблицы, которые снимаются вместе с legacy-каталогом

Имеют FK или смысл только в старом каталоге (при полном reset дропаются или очищаются):

- `events`, `venues`, `locations` (старая модель), `event_sessions`, `event_offers`, `event_provider_links`, `event_session_provider_links`, `event_overrides`, `event_subcategory_links`, `venue_subcategory_links`, `event_tags`, `tags` (если только для событий), `landing_pages`, `collections`, `articles`, `article_events`, `combo_pages`, `event_groups`, `catalog_consistency_snapshots`, `daily_event_stats`, `source_category_mappings`, `source_category_unknowns`
- `order_requests`, `external_order_links`, `external_tickets` (если не нужны без пакетов)
- `packages`, `package_items`, `vouchers`
- `reviews` и связанные `review_*`, `external_reviews`, `review_requests`
- `promo_blocks`, `promo_block_*`, `promo_collections`, `promo_collection_*`, `promo_codes`
- `routes` (было `events` FK)
- тестовые/пустые: `checkout_sessions`, `payment_intents`, `fulfillment_items`, `gift_certificates` — по политике окружения

**Сохраняются** (инфраструктура): `cities`, `regions`, `region_cities`, `operators`, supplier/finance/chat/support и т.д. по текущей схеме.

## SQL: инварианты (добавить после `CREATE TABLE`, имена колонок — snake_case)

Имена enum в PostgreSQL совпадают с Prisma (`"SessionOwnerKind"` и т.д.). После первой миграции сверить `\d+ catalog_sessions` и подставить точные имена.

### `catalog_sessions`

```sql
ALTER TABLE catalog_sessions ADD CONSTRAINT catalog_sessions_owner_check CHECK (
  ("owner_kind" = 'EVENT'::"SessionOwnerKind" AND "event_id" IS NOT NULL AND "admission_product_id" IS NULL)
  OR
  ("owner_kind" = 'ADMISSION'::"SessionOwnerKind" AND "admission_product_id" IS NOT NULL AND "event_id" IS NULL)
);
```

### `catalog_offers`

```sql
ALTER TABLE catalog_offers ADD CONSTRAINT catalog_offers_owner_check CHECK (
  ("owner_kind" = 'EVENT'::"OfferOwnerKind" AND "event_id" IS NOT NULL AND "admission_product_id" IS NULL)
  OR
  ("owner_kind" = 'ADMISSION'::"OfferOwnerKind" AND "admission_product_id" IS NOT NULL AND "event_id" IS NULL)
);
```

### `provider_links` — ровно один владелец + согласование `entity_kind`

```sql
ALTER TABLE provider_links ADD CONSTRAINT provider_links_one_owner_check CHECK (
  (CASE WHEN "event_id" IS NOT NULL THEN 1 ELSE 0 END)
+ (CASE WHEN "admission_product_id" IS NOT NULL THEN 1 ELSE 0 END)
+ (CASE WHEN "session_id" IS NOT NULL THEN 1 ELSE 0 END)
+ (CASE WHEN "offer_id" IS NOT NULL THEN 1 ELSE 0 END)
+ (CASE WHEN "location_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- опционально: жёсткое согласование entity_kind с колонкой (дополнить под правила)
```

### Partial unique: `source` + `source_ref` (WHERE NOT NULL)

```sql
CREATE UNIQUE INDEX events_source_source_ref_partial_uq ON events ("source", "source_ref") WHERE "source_ref" IS NOT NULL;
CREATE UNIQUE INDEX admission_products_source_source_ref_partial_uq ON admission_products ("source", "source_ref") WHERE "source_ref" IS NOT NULL;
CREATE UNIQUE INDEX locations_source_source_ref_partial_uq ON locations ("source", "source_ref") WHERE "source_ref" IS NOT NULL;
```

`@@unique([source, entityKind, externalId])` на `provider_links` остаётся; при необходимости добавить partial для `source_ref` отдельно.

## Phase 2 (ожидаемо сломано до починки)

- Все модули `src/catalog/**`, `landing`, `venue`, `collection`, `subcategories`, admin events/venues, checkout/order flows, импорт TC/TEP, фронт событий/площадок.
- `prisma/seed.ts` и большинство `seed-*.ts` ссылаются на удалённые модели.

После стабилизации API — новый `seed-catalog-foundation.ts` и точечная правка checkout под новые `Offer` id.
