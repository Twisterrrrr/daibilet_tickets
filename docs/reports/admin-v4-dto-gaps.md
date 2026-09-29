# Admin V4 — DTO Gap Report (V4 screens ↔ existing `/api/v1/admin/**`)

Цель: фиксировать **чего не хватает** текущим экранам Admin V4 “как в Lovable” по сравнению с тем, что реально отдаёт существующий backend Daibilet.  
Правило: изменения **только additive** (см. `docs/qa.md` и `docs/product/admin-v4-imported-sales.md`, часть A).

Ссылки:
- Карта экранов/маршрутов/эндпоинтов и принципы: `docs/product/admin-v4-imported-sales.md` (части A и C)
- **Редакционный контент Event** (описание, медиа, краткий текст; опционально блоки второго темпа; правила обмена/возврата): `docs/product/admin-v4-imported-sales.md` — §6, подраздел *«Редакционный контент карточки…»* (канон для Imported Sales MVP).

**Lovable в этом репо vs контент Event.** Базовый сценарий (полное/краткое описание + медиа без обязательного дробления на блоки) в [`lovable-prompts-admin-supplier-v2-modules-6-15.md`](../product/lovable-prompts-admin-supplier-v2-modules-6-15.md) §6 **согласуется** с плоским `content: { title, shortDescription?, fullDescription? }`. **Gap’ы** относятся ко **второму темпу** (опциональные типизированные блоки в аккордеоне) и к явному полю **правила обмена и возврата** (наследование от поставщика vs override) — см. `admin-v4-imported-sales.md` §6 и домен (`EventOverride.contentTemplateData`, `refundPolicy*`). **Лендинги** — отдельная сущность и реестр блоков; с Event **не смыкаем** без отдельного решения.

---

## Легенда

- **Screen**: маршрут SPA `/admin-v4/...`
- **API (current)**: фактический вызов из `frontend-admin-v4` (после `/api/v1`)
- **Lovable need**: поля/секции, которые требуются UX контрактом (Lovable / `docs/qa.md`)
- **Have now**: что реально есть в текущем DTO (по TS типам V4 + фактическим usage)
- **Gap**: что нужно добавить/адаптировать
- **Priority**: blocker / high / medium / low
- **Strategy**: additive field / new admin read-model endpoint / frontend adapter / freeze

---

## Events

### `/admin-v4/events/:id` — Event detail

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/events/:id` | **externalPurchaseEntry** (provider, entryType WIDGET/DEEPLINK/NONE, widgetPayload/deeplink, isConfigured, isValid, status, blockingReasons) | **реализовано additive** в backend: `buildAdminExternalPurchaseEntry` + поле в JSON ответа; UI: `EventDetailPage` | стабилизовать контракт (док/TS) при появлении edge-case провайдеров | high | additive field; **не** путать с internal checkout |
| `GET /admin/events/:id` | legacy **purchaseLink** | optional в типах + парсер | только если нужен параллельный diagnostics endpoint | low | optional / deprecate в пользу `externalPurchaseEntry` |
| `GET /admin/events/:id` | quality/publish gate: `blockers[]/warnings[]/isReady` | **частично:** объект **`readiness`** (как в summary): checklist + issues + status/score | имена `blockers[]`/`warnings[]` в DTO не введены (эквивалент через `readiness.issues`) | high | при необходимости — thin alias в ответе без смены семантики |
| `GET /admin/events/:id` | import meta: externalId, lastSyncedAt, syncStatus | **`importMeta`** (`sourceExternalId` ← `tcEventId`, `lastSyncedAt`, `syncStatus` NEVER/OK/STALE) | расширение провайдер-специфичных полей — по запросу | medium | additive |
| `PATCH /admin/events/:id` | override контентных блоков (highlights/route/faq/…), см. also §6 *Редакционный контент* в `admin-v4-imported-sales.md` | **нет** в V4 (пока read-only) | DTO/endpoint для structured content blocks + маппинг на `contentTemplateData` / политика возврата (`refundPolicy*`) | medium | оставить gap до фазы content; не мигрировать схему “ради UI” |

### `/admin-v4/events` — Events list

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/events?...` | filters: purchase readiness + quick filters | **частично закрыто:** query `purchaseReadiness=READY\|NOT_READY\|MISSING` (Prisma-приближение по офферам, без JS `validateWidgetPayload`); `needsAttention=true` ≈ `issuesPreset=api`; `readyToPublish=true` — AND-пресет; в строке — **`needsAttention` / `readyToPublish`** (по list readiness + `externalPurchaseEntry.status`) | полное совпадение READY с виджет-валидацией — опционально позже | high | держать в уме расхождение Prisma vs `buildAdminExternalPurchaseEntry` |
| `GET /admin/events?...` | quick filters “Needs attention / Ready to publish” | **закрыто:** серверные query + флаги в DTO + Admin V4 quick filters | — | high | — |

### Event detail — редактор классификации (taxonomy): рекомендации к допилу

**Контекст:** форма на вкладке «Классификация» (`EventClassificationForm`) для MVP использует существующие эндпоинты (`PATCH .../override`, `POST .../subcategories`, `PUT .../tags`) и **один** вызов `GET /admin/tags` с параметрами `page`/`limit` на клиенте.

Рекомендации (не блокеры контракта API):

| Тема | Допил | Приоритет |
|------|--------|-----------|
| Длинный справочник тегов (условно **>100** позиций в ответе / в UI) | Не полагаться на полный список за один запрос: обязательный или заметный **поиск** через query `search` + показ ограниченной выборки; опционально кнопка **«Загрузить ещё»** (инкремент `page`) или подгрузка при скролле | medium |
| Пагинация «как в таблице» | Для выбора POPULAR чекбоксами классическая постраничная пагинация часто хуже UX, чем **поиск + короткий список совпадений**; постраничность — только как fallback, если поиск не покрывает сценарий | low |
| Лимит одной страницы | Явно задать политику: например при `total > limit` не показывать все чекбоксы без ввода в поиск (или показывать предупреждение). Увеличение дефолтного `limit` на backend — отдельное решение (нагрузка), не требуется для корректности контракта | medium |
| Подкатегории | Справочники PRIMARY/SECONDARY уже фильтруются по категории события там, где это поддержано API; при росте списков — тот же паттерн: поиск/узкий запрос, если появится параметр на backend | low |

---

## External Orders

**Вердикт:** не «полностью R/O». **Факты провайдера** (id заказа у TC/Teplohod, статус оплаты у провайдера, сумма, payload зеркала) — только чтение. **Операционный слой Daibilet** (заметки, ответственный, internal processing status, **ручные заявки на возврат**) — отдельные поля/эндпоинты; PATCH не должен менять provider facts.

**Скоуп:** до ЛК поставщика **нет финконтура платформы** и **YooKassa не участвует** в этом продуктовом срезе. Заявки на ручной возврат по external order — **операционный трекинг**, не связка с `RefundRequest`/YooKassa из checkout.

Минимальные статусы заявки на ручной возврат (продукт): `REQUESTED`, `IN_REVIEW`, `PROVIDER_CONTACTED`, `APPROVED_MANUAL`, `REJECTED`, `COMPLETED`, `CANCELED`. `COMPLETED` = оператор подтвердил возврат **во внешнем кабинете**, не автоматический refund Daibilet.

### `/admin-v4/orders` — External orders list

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/external-orders?...` | list + агрегат по заявкам + query | **`refundRequestsCount`**, **`hasPendingRefundRequests`**; query **`hasRefundRequests`**, **`refundPending`** | поле `refundStatus` одной строкой — не вводилось (есть счётчики + pending) | high | при необходимости — additive enum |
| `GET /admin/external-orders/:id` | деталка заказа + заявки | **`AdminExternalOrdersController`** — деталка + `refundRequests[]` | стабилизовать контракт в TS V4 + вкладки UI по контракту §13 `admin-v4-imported-sales.md` | medium | док/типы + UI |
| `POST /admin/external-orders/:id/refund-requests` | создать заявку | **есть** в `AdminExternalOrdersController` | wire во `frontend-admin-v4` если не везде; валидация edge-case | medium | UI + e2e smoke |
| `PATCH /admin/external-refund-requests/:id` | обновить заявку | **есть** | как выше | medium | UI |
| `GET /admin/external-refund-requests?...` | список заявок | **есть** (`status`, `provider`) | расширить фильтры при необходимости (eventId, date range) | low | additive query params |

---

## Import Sources / Sync / Mapping Inbox

### `/admin-v4/sources` — Import sources

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/supplier-integrations` | sources list + status + last sync + runs/issues | есть supplier integrations + runs/issues endpoints | выровнять названия/лейблы “Ticketscloud/Teplohod” и агрегаты “imported/published counts” | medium | frontend adapter + additive fields |

### `/admin-v4/sync-health` — Sync health

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/settings/sync-status`, `GET /admin/ops/queues/sync` | KPI по sync, stale sources, issue counts | есть | часть KPI может отсутствовать | medium | additive fields; endpoint alias `/admin/sync/health` optional later |

### `/admin-v4/mapping-inbox` — Mapping inbox

| API (current) | Lovable need | Have now (V4) | Gap | Priority | Strategy |
|---|---|---|---|---|---|
| `GET /admin/source-categories/unknowns` + mappings | unknown categories queue + apply mapping | есть | venue/city/tag mapping inbox (если Lovable требует) | low | документировать gap; не симулировать |

---

## Landings (Admin V4)

### Реализовано в итерации phase 7 (MVP wiring)

- Список: `GET /admin/landings` + пагинация (`page` в query), фильтры как в UI.
- Деталка: `GET /admin/landings/:id` + вкладки: блоки из ответа; **Подбор** — `GET .../resolved-events`; **Диагностика** — `GET .../seo-audit`; превью — `canonicalUrl` или эвристический path (`/{city}/{slug}` / `/{hubSlug}`) для ссылки «На сайте».
- `hubReadiness` в обзоре (статус + число ERROR из snapshot).

### Рекомендации к допилу

- Кнопка «На сайте» при относительном path корректна только при **одном origin** с витриной.
  - **Пример (OK)**: админка на `https://daibilet.ru/admin-v4/...`, ссылка `/{city}/{slug}` откроет `https://daibilet.ru/{city}/{slug}`.
  - **Пример (плохо)**: админка на `https://admin.daibilet.ru/admin-v4/...`, та же ссылка откроет `https://admin.daibilet.ru/{city}/{slug}` (не витрина). Для multi-origin нужен полный `canonicalUrl` (например `https://daibilet.ru/{city}/{slug}`) или отдельная конфигурация public base URL.
- Редактирование блоков: CRUD + reorder подключены в Admin V4. Допил: типизированные формы по шаблонам (без ручного JSON) — отдельная задача.
- Редактирование SEO/полей лендинга: базовый PATCH-редактор подключён; допил: селекты/справочники (status/templateType/tag picker) и расширенный publish-gate UX.

---

## SEO / Redirects / Linking / Audit

Эти поверхности в V4 сейчас либо frozen, либо частично подключены. Для них gap report будет заполняться после уточнения: какие backend endpoints уже существуют и какие реально планируем подключать в следующей итерации (additive only).

---

## MVP freeze / handoff (фазы 10–11) — 2026-05

**Фаза 10 (performance / UX):** для Imported Sales MVP зафиксирован **baseline**, а не отдельный спринт с метриками:

- Пагинация и URL-state на основных списках Admin V4 (события, внешние заказы, лендинги); внешние заказы — серверный query `search` (подстрока `externalOrderId`, при полном UUID — `id` ссылки), UI `q` с debounce.
- Снижение пейлоада списка событий: `lite`, slim `externalPurchaseEntry` в list где применимо.
- Отложено без закрытия строк в этом файле: профилирование TTFB/API, агрессивный кеш React Query, виртуализация длинных таблиц — только после явной постановки с метрикой.

**Фаза 11 (freeze / transition):**- **Входит в MVP** по текущему коду и таблицам выше: события (list/detail + readiness/import meta + purchase filters baseline), внешние заказы (list + деталка + refund flow по контракту), лендинги (list/detail + storefront URL), таксономия на карточке события; продуктовый контракт — [`docs/product/admin-v4-imported-sales.md`](../product/admin-v4-imported-sales.md).
- **Вне MVP / второй темп:** типизированные контент-блоки события, расширенный PATCH контента, полное совпадение Prisma-фильтра `purchaseReadiness` с JS-валидацией виджета — см. таблицы Events в этом документе.
- **Операции после релиза:** smoke (`pnpm smoke:health`, `pnpm smoke:phase9`, опционально `SMOKE_ADMIN_BEARER`) и миграции — [`docs/runbooks/admin-v4-phase9-smoke.md`](../runbooks/admin-v4-phase9-smoke.md); фаза 9 в [`docs/Tasktracker.md`](../Tasktracker.md) закрыта **`[x]`**; на стендах дополнительно — ручной чеклист SPA из runbook.**Риски (кратко):** расхождение Prisma `purchaseReadiness` vs фактический `externalPurchaseEntry`; multi-origin admin/public без `canonicalUrl` / `PUBLIC_STOREFRONT_ORIGIN` для лендингов.