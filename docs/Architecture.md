# Архитектура Daibilet

> Объединённый документ: каталог, лендинги, topic definitions, page templates, event card cache.

---

## 1. Общая архитектура

- **Event** — источник (Event + EventOverride) + publish-gate.
- **Каталог** — direct DB queries; будущее: event_card_cache / static index (см. §5).
- **Landing Engine** — TopicDefinition → isActive по порогу событий; Canonical Tag Enrichment.

---

## 2. Каталог событий

### 2.1 Текущая модель (MVP)

Прямые запросы к нормализованным таблицам: events, sessions, cities, offers, overrides.

### 2.2 Будущее: Event Card Cache / Static Index

См. §5 (Event Catalog Index).

### 2.3 Классификация события и publish-gate

Источник истины для **публикации**: `category` + подкатегории (активные `EventSubcategoryLink`, при отсутствии связей — legacy enum `Event.subcategories`), минимум 1 и максимум 3 подкатегории на событие. Теги (STRUCTURAL/POPULAR) — вторичный слой, **не** блокируют publish. Подробнее: **[Catalog-Classification-Policy.md](Catalog-Classification-Policy.md)**.

### 2.4 Публичная выдача `/events` (фильтры query)

Сборка `where`: `packages/backend/src/catalog/where-builders.ts` — подкатегория и теги не перетирают верхнеуровневые `OR` (например, правила импорта в production); при совместном запросе `subcategory` + теги применяется **OR** между блоком подкатегории и блоком тегов (внутри тегов — AND по списку). Фильтр сеансов/OPEN_DATE передаётся вторым аргументом и попадает в `AND`.

---

## 3. Landing Engine

### 3.1 Проблема

**Ticketscloud (TC)** и **Teplohod (TEP)** приходят с разными наборами тегов.
Лендинги фильтруют по `filterTag` (например `nochnye-mosty`).

### 3.2 Canonical Tag Enrichment

- Единый слой нормализации тегов по `title` + `description`.
- `retagAll()` в TcSyncService — для всех активных событий.
- City-specific теги (keyword + citySlug → slug).

### 3.3 Materializer

- **Правило:** `visible = eligibleEvents(city, filterTag, additionalFilters.subcategories, …) >= minEvents` — отбор совпадает с публичным лендингом: тег **или** подкатегории из `LandingPage.additionalFilters`, плюс даты/сеансы (см. `landing-event-filter.helper.ts`).
- **LandingMaterializerService** — пересчитывает `isActive` по TopicDefinition.
- **Эндпоинты:** `POST /admin/landings/materialize`, `POST /admin/settings/ops/retag-and-materialize`.
- **Автоматически:** sync → retag → materialize (CatalogController, SyncProcessor).

### 3.4 Staging verification

`POST /admin/settings/ops/retag-and-materialize` возвращает:
- `beforeVisible` / `visible` / `hidden` — сверка до/после;
- `changedSlugs` — какие лендинги изменили статус.

---

## 4. TopicDefinition Matrix

### 4.1 Города

| slug | filterTag | minEvents | Город |
|------|-----------|-----------|-------|
| nochnye-mosty | nochnye-mosty | 2 | saint-petersburg |
| meteory | meteor-petergof | 3 | saint-petersburg |
| salyut | salyut-s-vody | 2 | saint-petersburg |
| rechnye-progulki | rechnye-progulki-msk | 3 | moscow |
| sviyazhsk | sviyazhsk | 2 | kazan |
| progulki-po-volge | progulki-volga-nn | 3 | nizhny-novgorod |
| nizhegorodskij-kreml | kreml-nn | 2 | nizhny-novgorod |
| kanatnaya-doroga | kanatka-nn | 2 | nizhny-novgorod |
| kurshskaya-kosa | kurshskaya-kosa | 2 | kaliningrad |
| strelka-i-volga | strelka-yaroslavl | 2 | yaroslavl |
| zolotye-vorota | zolotye-vorota-vlad | 2 | vladimir |

### 4.2 Cross-city (Collections)

| slug | filterTags | minEvents |
|------|------------|-----------|
| salyut | salyut-s-vody | 3 |

### 4.3 Salyut через Collection

- **LandingPage** salyut привязан к СПб.
- **Collection** с `cityId = null` — кросс-городская подборка.
- Маршрут: `/collections/salyut`.
- Collection выбирает события по тегу `salyut-s-vody`.

### 4.4 Ключевые слова (примеры)

- **nochnye-mosty**: развод мостов, ночные мосты.
- **salyut-s-vody**: салют, фейерверк, 9 мая.
- **meteor-petergof**: метеор (катер).
- **sviyazhsk**: свияжск, остров-град.
- Полный список: `packages/backend/src/catalog/canonical-tag-enrichment.ts`.

---

## 5. Page Templates & Event Catalog Index

### 5.1 Page template specs (гибридная модель)

Главный документ: **[archive/specs/PageTemplateSpecs.md](archive/specs/PageTemplateSpecs.md)**.

Принцип: не «всё в templateData», а 4 слоя:
- **Core columns** — структурированные поля (ageLimit, meetingPoint, routeSummary, refundPolicy*)
- **contentTemplateData** / **venueTemplateData** — PDP-контент (program, menu, routeDescription)
- **Refund policy** — наследуемый слой Supplier → Venue → Event

Event: core columns + contentTemplateData; Venue: core + venueTemplateData; Schema registry — основа для category/subcategory-driven UI.

### 5.2 Event Catalog Index (future design)

**Когда вводить:**
- > 10k событий или > 100 RPS на каталог;
- рост latency catalog queries.

**Вариант A: Precomputed Event Card Cache**

- Таблица `event_card_cache` — denormalized card (city_slug, title, slug, price_from, rating, next_session, tags).
- Обновление: event-driven или batch worker.

**Вариант B: Static Index + Query Filter**

- JSON-индекс событий; фильтрация in-memory.
- Для SEO-страниц с большим количеством комбинаций city × category × tags.

Детали: `archive/old-specs/EventCatalogIndex.md`.

---

## 6. Buyer Account (ЛК покупателя)

- **Роуты:** `/account` (dashboard), **`/account/purchases`** (единый экран «Мои покупки»), `/account/orders`, `/account/orders/[id]`, `/account/tickets`, `/account/favorites`, `/account/profile`. Все требуют авторизации (User JWT).
- **Единый экран «Мои покупки»:** GET /account/purchases возвращает список purchase records с типами карточек (INTERNAL_TICKET, EXTERNAL_VOUCHER, BOOKING_CONFIRMATION, AWAITING_PAYMENT, MANUAL_CONFIRMATION). Presentation layer — агрегат по CheckoutSession + PaymentIntent + FulfillmentItem; доменная модель не объединяет сущности. Импортированные события (виджет/редирект) отображаются как EXTERNAL_VOUCHER / BOOKING_CONFIRMATION. Агрегация реализована через `PurchaseReadService` и чистый маппер read‑model в `PurchaseListItemDto`.
- **Модель владения:** Заказ = CheckoutSession с опциональным `userId` (FK → User). В ЛК пользователь видит только заказы с `userId = current user`. Гостевой трекинг по shortCode остаётся публичным (`GET /orders/:id`, `GET /checkout/track/:shortCode`).
- **Связь с checkout:** При создании CheckoutSession (POST /checkout/session) при наличии JWT пользователя в сессию записывается `userId`. Guest flow не меняется.
- **Точка интеграции YooKassa:** В метаданных платежа заложить `metadata.orderId`, `metadata.userId` для маппинга webhook → заказ и пользователь. См. `docs/BuyerAccountSpecs.md`.

**Domain mapping (фактическая реализация):**

- `CheckoutSession` = Order‑подобный агрегат (владение покупкой, userId, offersSnapshot, status).
- `PaymentIntent` = Payment (provider, status, amounts, paidAt).
- `FulfillmentItem` = Fulfillment (purchaseFlow, status, externalOrderId / externalPaymentUrl).
- `PurchaseListItemDto` = Purchase read‑model для `/account/purchases`, собирается через `PurchaseReadService`.

---

## 7. Integration Layer — PaymentContext & YooKassa

### 7.1 PaymentContext при создании платежа

- **PaymentContext**:
  - формируется в слое checkout/payments из:
    - `CheckoutSession` (корзина, пользователь, operatorId),
    - настроек оператора (`paymentMode`, `agentSchemeEnabled`, `splitEnabled`, `pspFeeMode` — future flag),
    - snapshot `SupplierLegalProfile` (ИНН/КПП/адрес, налоговый режим, флаги НДС).
  - контекст явно передаётся в сервис, создающий `PaymentIntent`, и сохраняется в:
    - `PaymentIntent.provider`/`metadata` (в т.ч. `paymentMode`, `operatorId`, `agentSchemeEnabled`; для будущих фаз также может включать `pspFeeMode`, который на этапе MVP трактуется как `PLATFORM_PAYS`),
    - объектах чека для YooKassa (receipt.items и agent‑теги).

### 7.2 Связь с SupplierLegalProfile Snapshot (P3/P3.1)

- Источник реквизитов для чека (особенно в агентском и split‑режимах):
  - берётся из snapshot, зафиксированного в P3/P3.1:
    - `SupplierReport.snapshotJson.legalProfile` / `SupplierReport.legalProfileSnapshot`,
    - либо из свежего `SupplierLegalProfile` на момент **создания PaymentIntent**, который при необходимости также может быть снапшотнут в metadata/ledger.
- **Инвариант:** реквизиты, которые уходят в чек (ИНН/КПП поставщика, признак агента), всегда соответствуют тем данным, которые зафиксированы в финансовых snapshot’ах на момент оплаты; дальнейшие правки профиля не меняют уже проведённые чеки и отчёты.

---

## 8. API‑контракты Supplier Finance

- `POST /supplier/finance/reports/:id/accept`:
  - доступен авторизованному поставщику (Supplier JWT),
  - проверяет:
    - что отчёт принадлежит оператору текущего пользователя,
    - что по отчёту **нет** открытого `SupplierDispute` (статусы `OPEN`/`UNDER_REVIEW`),
  - при успешном акцепте:
    - обновляет поля `supplierAcceptedAt` и `acceptedBySupplierUserId` в `SupplierReport`,
    - добавляет запись в `metaJson.history` с указанием статуса `ACCEPTED`, времени и пользователя.
  - контракт по истории (`metaJson.history`) описан в `finance.md` и считается front‑friendly: backend всегда возвращает плоский массив событий, пригодный для прямого отображения таймлайна без дополнительного парсинга.
- `POST /supplier/finance/reports/:id/disputes`:
  - открывает `SupplierDispute` по отчёту (см. раздел SupplierDispute в finance.md),
  - при открытии спора отчёт считается `DISPUTED`, даже если ранее был акцептован.

---

## 9. API‑контракты Payment Settings

- `GET /admin/operators/:id/payment-settings` — полный объект `OperatorPaymentSettings`:
  - используется админкой для чтения и редактирования схемы платежей (paymentMode, agentSchemeEnabled, splitEnabled),
  - доступен только ролям ADMIN / SUPERUSER.
- `PATCH /admin/operators/:id/payment-settings` — частичное обновление payment‑настроек:
  - меняет только разрешённые поля (режимы и флаги), не содержит секретов/токенов эквайера,
  - операции логируются и могут аудироваться отдельно.
- `GET /supplier/finance/settings` — облегчённый read‑only объект для ЛК поставщика:
  - включает только то, что нужно для отображения виджета «Статус финансовых расчётов» (режим, флаги, дата последнего изменения),
  - не возвращает технические детали/токены, не даёт возможности изменить настройки.

---

## 10. Тесты

`packages/backend/src/catalog/__tests__/canonical-tag-enrichment.spec.ts` — 29 тестов: позитив/негатив, city-gating, multi-match.
