# Admin V4 Imported Sales — единый документ (интеграция + UX-контракт + карта экранов/API)

**Назначение:** один файл для инженерии и Lovable — **решения и границы**, не список вопросов. Содержит: (A) принципы интеграции с существующим Nest/Prisma; (B) финальный UX/product contract MVP; (C) карту маршрутов SPA, URL-state и соответствие `/api/v1/admin/**` ↔ целям Lovable TZ.

**Дополнительно:** продуктовый freeze и additive policy — [`docs/qa.md`](../qa.md); UX-flow (не OpenAPI) — [`Admin_Flows.mmd`](Admin_Flows.mmd); отчёт по gap DTO — [`docs/reports/admin-v4-dto-gaps.md`](../reports/admin-v4-dto-gaps.md) (в т.ч. **§MVP freeze / handoff** для закрытия фаз 10–11 плана Imported Sales).

---

## Оглавление

1. [Часть A. Принципы интеграции Admin V4 ↔ backend](#часть-a-принципы-интеграции-admin-v4--backend)
2. [Часть B. UX / Product contract (Imported Sales MVP)](#часть-b-ux--product-contract-imported-sales-mvp)
3. [Часть C. Карта экранов, маршрутов и API](#часть-c-карта-экранов-маршрутов-и-api)

---

## Часть A. Принципы интеграции Admin V4 ↔ backend

**Важно:** это **не** greenfield-бэкенд. У Daibilet уже есть NestJS + Prisma + PostgreSQL, миграции, admin endpoints, импорт, таксономия, модель лендингов, модерация площадок, publish gates и логика внешних продаж.

### Импортные продажи: вердикт (catalog + external purchase + operations)

#### Финансы и YooKassa в текущей фазе

**До появления личного кабинета поставщика** в продуктовом контуре imported sales **нет собственного финансового контура Daibilet**: оплаты на стороне платформы, клиринг, взаиморасчёты с поставщиками и сценарии вокруг **YooKassa** для этой ветки **не используются и не проектируются**. В кодовой базе могут существовать заготовки checkout/refund под другие фазы — **не смешивать** их с админкой импортных продаж и зеркалом внешних заказов.

**«Ручной возврат»** в смысле external orders — это **операционный трекинг** (заявка, статус, подтверждение «возврат выполнен в кабинете провайдера»), а не проведение возврата денег через платёжный шлюз Daibilet.

**Формула (без finance stack):** Admin V4 = импортированный каталог + **готовность внешней покупки** (виджет/deeplink провайдера) + **операции по зеркалу внешних заказов** (факты R/O + при необходимости операционный слой) + SEO / рост / контроль качества. Короче: **витрина не делает checkout**; пользователь уходит в **покупку у провайдера**. Daibilet ведёт **зеркало заказа** и при необходимости **заявки/статусы обработки** без изменения фактов заказа у Ticketscloud/Teplohod и **без** платёжного контура платформы.

| Зона | Read-only (provider facts) | Редактируемый операционный слой Daibilet |
|------|----------------------------|------------------------------------------|
| Событие / оффер | Импортные офферы, сеансы, фактический widget/deeplink от источника | Обложка, категории, override скрытия, медиа override — как уже в домене |
| External Order | provider, externalOrderId, provider status, суммы, оплаченность, payload зеркала | internalProcessingStatus, заметки оператора, ответственный, **заявки на ручной возврат**, статусы обработки возврата |
| Event detail UI | Не использовать термины **Checkout**, **Cart**, **Payment**, **Daibilet Order** для импортной воронки | Использовать **«Внешняя покупка» / External Purchase Entry** — готовность отправить пользователя к провайдеру (`externalPurchaseEntry` в `GET /api/v1/admin/events/:id`, additive). |

**Не строить сейчас (импортные продажи / Admin V4):** internal checkout Daibilet, корзина, оплата на стороне Daibilet, **YooKassa как часть этого продукта**, автоматические возвраты через платёжку платформы, биллинг и полная сверка как у биллинга-first — до отдельного решения и ЛК поставщика.

UX-карта навигации (не контракт API): [`Admin_Flows.mmd`](Admin_Flows.mmd).

### Что считаем эталоном

| Слой | Роль |
|------|------|
| **Файлы / экраны Lovable Admin V4** (`frontend-admin-v4`) | **UX и контракт экрана** — что показывать, вкладки, поля, состояния. Не источник правды по данным в БД. |
| **Существующий backend** | **Домен, Prisma, `/api/v1/admin/**`** — единственный контур API админки; решения V3/домена не отменяем. |

### Запрещено

- Заменять или «переписывать» существующую **Prisma schema** ради Lovable.
- Вводить **параллельную** доменную модель или второй набор сущностей «как в Lovable ТЗ».
- **Переименовывать**, **ломать** или менять смысл существующих контрактов **`/api/v1/admin/**`**.
- Выносить админские endpoint’ы **за пределы** `/api/v1/admin`.
- Удалять или отменять принятые решения **Admin V3 / домена** без отдельного продуктового решения.

### Разрешено и ожидаемо

- **Additive** поля в DTO / read-model ответах под экраны V4.
- **Новые** endpoint’ы только под **`/api/v1/admin/**`**, без дублирования «второго админ-API».
- Импортированные **факты источника** (зеркало TC/Teplohod) остаются **read-only** в мутациях; **операционные** поля по внешним заказам и возвратам — отдельный слой (additive endpoints под `/api/v1/admin`).
- **`externalPurchaseEntry`** в ответе деталки события — канонический additive read-model готовности внешней покупки; **`purchaseLink`** — опционально/legacy в доках и на фронте как fallback.
- **Эвристика** на фронте остаётся fallback, если в ответе нет ни `externalPurchaseEntry`, ни `purchaseLink`.
- **Адаптеры на фронте**, если форма экрана Lovable расходится с формой доменного DTO (без подмены контракта бэка).

### Порядок работ (implementation strategy)

1. **Аудит** экранов Admin V4 против **фактических** существующих backend endpoint’ов.
2. **Отчёт по gap’ам DTO** (чего не хватает экрану vs что отдаёт API).
3. Добавлять недостающее только как **additive** поля admin read-model / ответов.
4. Новые операции — только под **`/api/v1/admin/**`**, минимальные и обратимые.
5. Импорт / source — **read-only** для подмены фактов провайдера; операционный слой по external orders **не** является редактированием заказа у провайдера.
6. Внешняя покупка: бэкенд отдаёт **`externalPurchaseEntry`**; legacy **`purchaseLink`** + эвристика на фронте — только fallback.
7. **OpenAPI / typed client** — после стабилизации additive DTO на бэке (не раньше как единственный источник правды поверх ручных типов).
8. **Frontend adapters** — где UI Lovable ≠ форма доменного объекта.

---

## Часть B. UX / Product contract (Imported Sales MVP)

### 0. Базовый принцип

**Admin V4 Imported Sales — это не финконтур Daibilet.**

В этом срезе **нет**:

- внутреннего checkout Daibilet;
- YooKassa (как часть этого продукта);
- расчётов с поставщиками;
- Supplier LC;
- закрывающих документов;
- EDO;
- полноценного reconciliation;
- внутренней продажи билета через Daibilet.

**V4 Imported Sales отвечает за:**

- управление импортированным каталогом;
- проверку готовности события к публикации;
- внешнюю покупку через widget / deeplink;
- просмотр внешних заказов;
- ручной операционный слой по возвратам;
- контентные страницы: города, площадки, лендинги;
- базовую таксономию для витрины и SEO.

---

### 1. Sidebar V4: MVP и заморозка

#### Обязательные разделы MVP

| Раздел | Статус | Зачем |
|--------|--------|--------|
| Dashboard | MVP | Общая картина: импорт, события с проблемами, внешние заказы, возвраты |
| Events | MVP | Главный рабочий экран: импортированные события, readiness, публикация |
| External Orders | MVP | Внешние заказы, статусы, артефакты, возвраты |
| Venues | MVP | Площадки как контентные / SEO-хабы и точка качества событий |
| Cities | MVP | Городские хабы, контент, SEO, лендинги |
| Landings | MVP | CITY / MULTI_CITY лендинги, hero, SEO, фильтры, блоки |
| Taxonomy | MVP read-only | Категории, подкатегории, теги как справочник и диагностика |
| Settings / Diagnostics | Минимально / hidden | Только health/config, не полноценный продуктовый раздел |

#### Сознательно отложить

| Раздел | Решение |
|--------|---------|
| Collections deep-edit | Later. Не мешать с MVP Imported Sales |
| SEO отдельным большим модулем | Later. В MVP SEO встроен в Events / Venues / Cities / Landings |
| Linking / Redirects | Frozen. Только read-only / diagnostics при необходимости |
| Checkout Sessions | Не делать отдельным разделом V4 |
| Finance / Settlements | Не входит |
| Supplier LC | Не входит |
| Articles | Later |
| Promo Blocks | Позже как storefront control layer; не обязательно для MVP |
| Reconciliation | Later, только заготовка статусов/ссылок |
| RBAC advanced | Later, достаточно базовых ролей |

---

### 2. Checkout / Sessions в V4

**Решение: нет.** Отдельный раздел вида `/admin/checkout/sessions` в V4 **не нужен**.

Для Imported Sales достаточно **во внешнем заказе**:

- `externalOrderId`;
- provider;
- `sourceSessionId` / `sourceOrderId`, если есть;
- кнопка copy UUID;
- deep link в технический экран, если старый V3/debug route ещё существует;
- связь с экраном возвратов.

Отдельный read-only экран checkout session оправдан только при **реальной внутренней продаже через Daibilet**. В текущем MVP это **ложный сигнал**, будто у платформы уже есть собственный checkout.

---

### 3. Единый публичный base URL («На сайте»)

**Решение: да** — единый публичный storefront base URL, **не** зависящий от origin админки.

Нельзя строить публичные ссылки от текущего admin origin.

**Зафиксировать в конфигурации (пример):**

- `PUBLIC_STOREFRONT_ORIGIN=https://daibilet.ru`
- `ADMIN_ORIGIN=https://admin.daibilet.ru`

**В UI кнопка «На сайте»** — порядок разрешения:

1. `publicUrl` из backend DTO, если бэкенд уже отдал готовую ссылку;
2. иначе собрать из `PUBLIC_STOREFRONT_ORIGIN` + `canonicalPath`;
3. если canonical path отсутствует — **disabled** с явной причиной.

Для лендингов особенно важно: CITY и MULTI_CITY могут иметь разные публичные пути, alias и canonical redirect.

---

### 4. Events: Ready to publish / Needs attention

#### Backend-семантика

Всё, что влияет на публикацию, **приходит с бэка**. Не собирать publish-readiness эвристиками на фронте как основной источник правды.

**В DTO события — стабильный блок:**

```ts
readiness: {
  status: 'READY' | 'NEEDS_ATTENTION' | 'BLOCKED';
  isReadyToPublish: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  updatedAt: string;
}

type ReadinessIssue = {
  code: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  title: string;
  message?: string;
  fieldPath?: string;
  source?: 'PUBLISH_GATE' | 'QUALITY' | 'IMPORT' | 'PURCHASE' | 'SEO';
};
```

#### Блокеры MVP (примеры кодов)

| Code | Смысл |
|------|--------|
| MISSING_TITLE | Нет нормального названия |
| MISSING_CITY | Не привязан город |
| MISSING_VENUE_OR_LOCATION | Нет площадки или адресной точки |
| MISSING_SUBCATEGORY | Нет валидной подкатегории |
| MISSING_PURCHASE_ENTRY | Нет widget/deeplink для внешней покупки |
| NO_ACTIVE_OFFER | Нет активного оффера |
| EXPIRED_OR_NO_VALID_DATES | Нет будущих дат / валидности |
| SOURCE_DISABLED | Источник отключён или событие нельзя публиковать |

#### Warning / Needs attention (не всегда blocker)

| Code | Решение |
|------|---------|
| MISSING_IMAGE | Warning в MVP, можно quick filter |
| WEAK_DESCRIPTION | Warning |
| MISSING_SEO_TITLE | Warning |
| MISSING_SEO_DESCRIPTION | Warning |
| IMPORT_NEEDS_REVIEW | Warning или blocker в зависимости от syncStatus |
| LOW_CONFIDENCE_VENUE_MATCH | Warning |

#### UI-срез

Quick filters допустимы (Missing image, No active offer, Purchase not ready, Needs attention, Imported only, Manual override, Recently synced, Source errors), но **опора на backend codes**, не на локальную эвристику.

---

### 5. Event list: колонка Purchase

**Решение: да** — отдельная колонка **Purchase**, отдельно от image readiness, active/published state, общего quality.

| Purchase state | Значение |
|----------------|----------|
| READY | Есть валидный widget/deeplink |
| MISSING | Нет точки покупки |
| WIDGET | Есть widget |
| DEEPLINK | Есть deeplink |
| BROKEN | Есть запись, но она невалидна |
| UNKNOWN | Нет данных / legacy |

**Фильтры списка (query-параметры):**

- `purchaseState=READY|MISSING|WIDGET|DEEPLINK|BROKEN|UNKNOWN`
- `readinessStatus=READY|NEEDS_ATTENTION|BLOCKED`
- `source=TICKETSCLOUD|TEPLOHOD|MANUAL`
- `hasImage=true|false`
- `isPublished=true|false`
- `syncStatus=OK|STALE|FAILED|NEEDS_REVIEW`

---

### 6. Event detail: Quality & Readiness

**Решение: да** — обязательна секция **Quality & Readiness** с данными с бэка:

- общий статус;
- blockers;
- warnings;
- last evaluated at;
- publish / unpublish;
- пояснение, почему publish disabled;
- deep links к полям для исправления.

Фронт **отображает**, не **решает** самостоятельно, готово событие или нет.

#### Редакционный контент карточки: описание, медиа, краткий текст, блоки, возвраты

**Описание и медиа**

- **Полное описание** — по факту **всегда** приходит с импорта; это базовый текст карточки, не «опциональный виджет».
- **Медиа** — изображения и прочие материалы **не** встраиваются в одно полотно с описанием: уходят в раздел **Медиа** (обложка, галерея — по правилам домена и UI).
- **Краткое описание (lead / teaser)** — у источника **может отсутствовать**, но **блок в админке обязан быть** (пустое состояние нормально). На витрине: либо не рендерить пустой блок, либо скрывать — единое продуктовое правило, зафиксировать в гайде витрины.

**Типизированные блоки — второй темп, не обязательный по умолчанию**

- **Базовый сценарий:** карточка каталога живёт на **полном описании** (и при необходимости кратком) + **Медиа**; **дробить текст на секции не требуется** ни импортом, ни системой.
- **Второй темп (редакция):** админ **по желанию** добавляет секции через **«+»** / аккордеон по **своему реестру типов для Event** (Ключевые моменты, Маршрут, Меню и т.д.), чтобы улучшить читаемость PDP — это **опциональное обогащение**, не условие публикации, если иное не зафиксировано отдельно в publish gate.
- Блок **на витрине не показывается**, если не заполнен. Импорт **может** прелоадить отдельные секции, только если структура источника это позволяет; иначе блоки только ручные.

**Каталог (Event) и лендинг — не «две похожие сущности»**

- **Event** — **элемент каталога** (атом продукта, карточка / PDP); импорт, модерация, публикация, внешняя покупка — вся логика **вокруг товара в каталоге**.
- **Landing** — **собранная страница** (CITY / MULTI_CITY / тема): витринный слой, который **компонуется** из **набора событий по правилам** (фильтры, тема, город, теги, подборка и т.д.) плюс редакционные блоки и SEO. Это **не** альтернативный «тип события», а **поверхность над каталогом**; события на лендинге — **ссылки на те же сущности каталога**, а не дубликат доменной модели события.
- Упоминание **реестра блоков лендинга** (§10) рядом с опциональными блоками Event имело смысл только как **общий UX-приём** (типизированные секции вместо сырого JSON). **Общего реестра Event ↔ Landing, общей таблицы контента и обязательного пересечения моделей нет** — разные таблицы и контракты; связь только через **отбор событий** на лендинге и публичные ссылки.

**Правила обмена и возврата**

- Отдельное поле уровня **Event**: текст **либо** берёт **стандартное сообщение от поставщика** (из импорта / справочника провайдера), **либо** задаётся **override только для этого события**.
- В UI явно различать режимы: наследование от поставщика vs своё для события; при наследовании — предсказуемое отображение (read-only или свёрнутая подсказка + переключение на override).

**Домен:** при появлении типизированных блоков у события — маппинг на override-слой (`contentTemplateData` и смежные поля в `EventOverride`), без второй параллельной «правды» в сыром JSON как основном источнике для витрины. Пока блоки не используются, достаточно полей описания и политики возврата.

**Сверка с Lovable-промптами в репо:** в [`lovable-prompts-admin-supplier-v2-modules-6-15.md`](lovable-prompts-admin-supplier-v2-modules-6-15.md) (§6 Admin Events) заданы таб **Content** / **Media** и плоский `content.{ shortDescription, fullDescription }` — это **согласуется с базовым сценарием**; для второго темпа (блоки + политика возврата) нужны расширение DTO и gap-таблица в [`docs/reports/admin-v4-dto-gaps.md`](../reports/admin-v4-dto-gaps.md).

---

### 7. Import meta в UI

**Решение: да**, компактно.

**Список событий:** source badge (Ticketscloud, Teplohod, Manual); sync badge (OK, Failed, Stale, Needs review); last synced.

**Деталка:** блок **Import information**, по умолчанию **collapsed**.

| Поле | R/O |
|------|-----|
| importSource | read-only |
| externalEventId | read-only |
| externalVenueId | read-only |
| lastSyncedAt | read-only |
| syncStatus | read-only |
| lastSyncError | read-only |
| importedAt | read-only |
| updatedAt | read-only |
| raw source link | read-only |
| needsReview | editable только если есть backend endpoint |

Raw payload в MVP **не** как основной UI; максимум — collapsed technical snapshot.

---

### 8. Taxonomy: CRUD vs read-only MVP

**Решение:** MVP — **read-only справочник** + редактирование привязок **из карточки события** (и venue по домену). Полноценный CRUD категорий/тегов в V4 — **later**, если главная задача — Imported Sales.

**Страница Taxonomy показывает:**

- категории / section;
- подкатегории;
- slug;
- type: EVENT_ONLY, VENUE_ONLY, UNIVERSAL;
- active/inactive;
- landing enabled;
- usage count;
- linked events count;
- linked venues count.

**Действия MVP:** поиск; фильтры по section, active/inactive, landingEnabled; read-only detail drawer.

---

### 9. Длинные списки тегов

**Обязательно:** server-side search + pagination.

- default limit: **50**; max: **100**;
- если `total > limit`: текст вида «Showing 50 of 238. Use search to narrow results.»
- «Load more» допустима; infinite scroll в админке **нежелателен**;
- выбранные теги **pin** сверху;
- поиск с debounce;
- пустой результат — явный empty state.

Tag picker **не** загружает все теги сразу.

---

### 10. Landings: блоки и сырой JSON

**Решение:** сырого JSON в админке как основного UX **не должно быть**.

Нужен **реестр шаблонов блоков** (Landing Block Registry). Lovable реализует UI по реестру.

Пример типов:

`TEXT` | `FAQ` | `BENEFITS` | `EVENT_GRID` | `VENUE_GRID` | `ROUTE` | `PRICE_TABLE` | `HOW_TO_BUY` | `REVIEWS` | `CTA` | `CUSTOM_HTML_DISABLED`

Для каждого типа: title; allowed/required fields; preview behavior; validation; public rendering mapping. В UI — **типизированная форма** на блок.

---

### 11. Landings PATCH: вкладки, publish gate

**Рекомендуемый порядок вкладок:** Overview → Hero → Filters / Content source → Content blocks → SEO & Canonical → Preview / Publish → Diagnostics.

**Publish gate (обязательные поля) — ориентир:**

| Landing type | Required |
|--------------|----------|
| CITY | city, slug, title, seoH1, seoTitle, seoDescription, canonical tag/filter, минимум один content source |
| MULTI_CITY | slug, title, seoH1, seoTitle, seoDescription, canonical strategy, city sections/filter config |
| Оба | valid canonicalMode, no duplicate slug, publicUrl resolvable |

Hero image — warning, не blocker.

---

### 12. External Orders: список

**Обязательные колонки:** Created/Paid date; Provider; External order ID (copyable); Customer; Event; Visit/session date; Amount; Status; Integration state; Artifact; Refund status; Refund requests count; Last source update; Actions.

**Фильтры:** `q`, `provider`, `status`, `integrationState`, `refundStatus`, `hasRefundRequests`, `dateFrom`, `dateTo`, `eventId`, `hasArtifact`, `needsAttention` (`eventId` может быть later при нестабильном read-model).

**Header aggregates:** total orders; pending refunds; failed integration; missing artifacts; needs review; by provider.

---

### 13. External Order detail: вкладки MVP

1. **Overview** — read-only факты + кнопки open event, на сайт, copy IDs.
2. **Refunds** — заявки, статусы, суммы, комментарии; явно: **не автоматический возврат денег через Daibilet**, операционный слой.
3. **Operations** — assignee, notes, operational status (если бэк готов; иначе read-only/disabled + InfoNote).
4. **Source Snapshot** — санитизированный payload, read-only, без редактирования JSON.
5. **Audit** — read-only.

Later: reconciliation, finance mapping, webhook timeline и т.д.

---

### 14. Очередь ручных возвратов

**Решение:** **не** как отдельный top-level пункт меню в MVP.

Правильно: **External Orders** в sidebar; quick filter **Pending refunds**; опционально route `/external-orders/refunds`; **badge** на External Orders с числом pending. Отдельный «Refund Queue» — когда появится реальный объём операций.

---

### 15. Venues / Cities

**Venue:** полная редакционно-каталожная карточка в MVP — **да**, но не весь будущий venue-domain.

**Вкладки venue detail:** Overview → Content → Media → SEO → Events/Program (read-only MVP) → Import/Moderation → Audit.

**Cities:** контентные хабы — name, slug, region, статус, hero, description, SEO, связанные лендинги, счётчики, public URL.

---

### 16. Launch hardening: Definition of Done

#### Backend / API

- миграции применяются чисто;
- Prisma generate без расхождений;
- admin API auth работает;
- нет 500 на пустых списках;
- все списки с pagination;
- PATCH валидируют payload;
- publish gate не ослаблен;
- external purchase entry не ломает legacy purchaseLink;
- public URL от storefront origin, не от admin origin.

#### Smoke (минимум)

`GET /admin/dashboard`, events list/detail, PATCH/publish/unpublish; external-orders list/detail/refunds; venues/cities/landings list/detail PATCH.

#### UI smoke

sidebar; каждый MVP-раздел грузится; loading/error/empty; фильтры в URL-state; back/forward не ломает фильтры; publish disabled при blockers; «На сайте» disabled без publicUrl; copy ID; read-only поля read-only.

#### Ops

requestId в логах; health; staging/prod checklist; rollback; бэкап перед миграциями; seed/demo для UI.

---

### 17. Performance contract

**Списки с обязательной pagination:** Events; External Orders; Venues; Cities; Landings; Taxonomy; Refund requests; Audit logs.

| Экран | Default | Max |
|-------|---------|-----|
| Events / Orders / Venues / Landings | 25/50 | 100 |
| Taxonomy | 50 | 100 |
| Tag picker | 20/50 | 100 |
| Audit | 25 | 100 |

Стиль: **обычная pagination**, не infinite scroll (операторы копируют URL и возвращаются к фильтру).

**Целевые бюджеты (ориентир):** list p95 warm до ~800 ms; detail до ~500 ms; typeahead до ~300 ms; dashboard до ~1200 ms; first useful render UI до ~2 s.

---

### 18. Freeze: экраны

#### Works / MVP

Dashboard; Events list/detail; External Orders list/detail; Refunds in order detail (basic); Venues/Cities list/detail (limited editable); Landings list/detail (typed forms); Taxonomy read-only; Settings/Health hidden/minimal.

#### Not in MVP

Checkout Sessions; Finance; Supplier LC; EDO; Reconciliation full; Linking/Redirects frozen; Collections deep-edit; SEO standalone; Articles; Promo full; Advanced RBAC.

#### Risks и контрмеры

| Риск | Контрмера |
|------|-----------|
| Красивый UI без backend truth | Зафиксировать DTO contract |
| Readiness как фронтовая эвристика | Blockers/warnings на бэке |
| Landing blocks → raw JSON | Landing Block Registry |
| Путаница internal/external orders | Везде External / Provider / Source |
| Refund UX как автоденьги | Явный текст manual / provider-side |
| Public URL от admin origin | Storefront origin |
| Taxonomy перегружает UI | MVP read-only + search/pagination |
| Venue раздувается | Ограничить MVP редакционными полями |

---

### Приложение A: Что отдать Lovable как задачи (экранный scope)

Кратко — реализовать по этому документу:

1. **External Order detail** — вкладки Overview, Refunds, Operations, Source Snapshot, Audit; состояния loading/empty/error/no artifact/no event/refund pending/sync failed; InfoNote про external provider и manual refunds.
2. **External Orders list** — таблица по колонкам §12; quick filters (All, Needs attention, Pending refunds, Missing artifact, Failed integration, Unlinked, Today/7d/30d).
3. **Event list** — колонки §5 + §4; quick filters §4.
4. **Event detail** — секции §6–7; readiness server-driven.
5. **Taxonomy** — read-only §8.
6. **Landings** — typed block forms §10–11; вкладки §11.
7. **Venue detail** — вкладки §15.

---

### Приложение B: Фазы инженерия vs Lovable (ориентир)

| Фаза | Инженерия | Lovable |
|------|-----------|---------|
| 2–3 | Sidebar routing; hide/freeze; typed clients; URL-state; storefront origin; copy ID | Layout; frozen states; empty states; routes |
| 4 | Venue/city PATCH; DTO counters; import meta read model | Venue/city tabs; badges |
| 5 | Event list/detail DTO; server readiness; purchase; import meta; publish | Columns; readiness UI; purchase entry |
| 6 | Taxonomy read; tag picker; server search; pagination | Taxonomy page; picker UX |
| 7 | Landing PATCH; typed blocks; publish gate; canonical resolver; preview | Typed forms; tabs; publish UX |
| 8 | External orders; refunds; notes; audit; snapshot sanitizer | List; detail tabs; refund UX |
| 9–11 | CI smoke; health; migrations; perf; runbook | Final freeze pass; polish |

---

### Главный вывод

Для MVP Imported Sales V4 держим границу: **импортированный каталог + внешние заказы + контентные хабы**, без внутреннего checkout и финконтура.

**Ключевые решения:** нет Checkout Sessions как раздела V4; readiness **server-driven**; purchase — отдельная колонка и фильтр; taxonomy MVP **read-only**; landings — **typed block registry**, не raw JSON; refunds — **внутри External Orders**; public URL — **только storefront origin**; venues/cities — контентные хабы с ограниченным MVP-редактированием.

---

## Часть C. Карта экранов, маршрутов и API

**Lovable TZ ↔ Daibilet Admin V4.** Назначение: **как `frontend-admin-v4` + Nest `/api/v1/admin/**` соотносятся** с целевым UX/API из Lovable-ТЗ. Для принципов additive и freeze см. **часть A** и [`docs/qa.md`](../qa.md).

### Источники правды (согласованная модель)

| Слой | Что считаем эталоном | Где зафиксировано |
|------|----------------------|-------------------|
| Продуктовые ответы, freeze, additive policy | Решения команды | [`docs/qa.md`](../qa.md) |
| Рантайм-данные | Backend DTO + фактические ответы | NestJS, Prisma |
| Форма экранов, вкладки | UI + Lovable ТЗ | Этот документ, репозиторий |

Фраза «UI — источник правды по UX»: экран задаёт форму DTO, бэкенд отдаёт **additive** модели; существующие поля не ломать — см. [`docs/qa.md`](../qa.md).

### Канонические префиксы

| Компонент | Значение |
|-----------|----------|
| Публичный API | `/api/v1` |
| Админ API (факт) | `/api/v1/admin/...` |
| Admin V4 SPA | basename [`/admin-v4`](../../packages/frontend-admin-v4/src/lib/auth-paths.ts) |
| Lovable ТЗ | часто `/admin/...` — **не совпадают путями** с Daibilet |

### Экраны Admin V4 (маршруты)

Источник: [`packages/frontend-admin-v4/src/App.tsx`](../../packages/frontend-admin-v4/src/App.tsx).  
Sidebar MVP: [`packages/frontend-admin-v4/src/config/navigation.ts`](../../packages/frontend-admin-v4/src/config/navigation.ts).

| UI path (`/admin-v4/...`) | Страница / модуль | В MVP sidebar |
|---------------------------|-------------------|---------------|
| `/dashboard` | Dashboard | да |
| `/events`, `/events/:id` | Events list / detail | да |
| `/orders`, `/orders/:id` | External orders list / detail | да |
| `/venues`, `/venues/:id` | Venues | да |
| `/cities`, `/cities/:id` | Cities | да |
| `/landings`, `/landings/:id` | Landings | да |
| `/sources` | Import sources | да |
| `/mapping-inbox` | Mapping inbox | да |
| `/sync-health` | Sync health | да |
| `/taxonomy` | Categories & tags | да |
| `/audit-log` | Audit log («Журнал изменений») | да |
| `/settings` | Settings | да |
| `/collections`, `/collections/:id` | Collections | нет |
| `/seo`, `/seo-audit`, `/seo-health` | SEO audit (одна страница) | нет |
| `/promo-placement-blocks`, `/:id` | Promo placements | нет |
| `/linking`, `/redirects` | Frozen placeholders | нет |
| `/refund-requests` | Internal checkout refunds (PSP) | нет |

### URL-state и русский UI (hub-экраны V4)

Lovable-паттерн: чип-вкладки, **`?tab=`** в URL, русские подписи; в query — технические enum.

| Экран | Файл | Query / default | Значения `tab` | Подписи в UI |
|-------|------|-----------------|----------------|--------------|
| Событие | `EventDetailPage.tsx` | `?tab=` · default `overview` | `overview`, `classification`, `schedule`, `media`, `source` | Обзор, Классификация, Расписание, Медиа, Данные источника |
| Город | `CityDetailPage.tsx` | default `overview` | `overview`, `content`, `seo`, `landings` | Обзор, Контент, SEO, Лендинги |
| Площадка | `VenueDetailPage.tsx` | default `overview` | `overview`, `type`, `events`, `offers` | Обзор, Тип площадки, События, Офферы |
| Лендинг | `LandingDetailPage.tsx` | default **`coverage`** | `overview`, `coverage`, `seo`, `blocks`, `matching`, `diagnostics` | Обзор, Охват, SEO, Блоки, Подбор, Диагностика |

**Список площадок** (`VenuesPage.tsx`): чип «Все» = `venueType=all`; колонки жизненный цикл / готовность — человекочитаемо.

**Список лендингов** (`LandingsPage.tsx`): `q`, `city`, `status`, `landingType`; чипы типа и статуса; в таблице «Город/Мульти», SEO ок/не заполнено.

### Сопоставление: экран → Nest endpoint → Lovable ТЗ

#### Дашборд / агрегация

| Экран V4 | Текущий API | Lovable ТЗ (цель) | Заметки |
|----------|-------------|-------------------|---------|
| Dashboard | `GET /admin/imported-sales/dashboard` | `GET /dashboard/kpi` | Один read-model; расширение additive |

#### События

| Экран V4 | Текущий API | Lovable ТЗ | Заметки |
|----------|-------------|------------|---------|
| List | `GET /admin/events?...` | `GET /events?...` | Фильтры и URL-state; freeze query |
| Detail | `GET /admin/events/:id` | `GET /events/:id` | **externalPurchaseEntry** канон; **purchaseLink** legacy; не смешивать с internal checkout |
| Hide | `PATCH /admin/events/:id/hide` | — | Специфика Daibilet |
| Activation | `PATCH /admin/events/:id/activation` | publish/unpublish | Семантика может быть разнесена |
| Media | `PATCH /admin/events/:id/media` | media в ТЗ | Пока отдельный PATCH |

**R/O по импорту:** offers, schedule, raw source — частично в GET; override цен/слотов запрещён.

#### Таксономия

| Экран V4 | Текущий API | Lovable ТЗ | Заметки |
|----------|-------------|------------|---------|
| Tags | `GET /admin/tags?...` | tag-groups | Сейчас `structuralGroup` на теге |
| Subcategories | `GET /admin/subcategories?layer=...&forEntity=event` | subcategories | Сверить с `core/taxonomy.md` |

#### Площадки / города / лендинги

| Экран V4 | Текущий API | Lovable ТЗ | Заметки |
|----------|-------------|------------|---------|
| Venues | `GET /admin/venues`, `GET/PATCH /admin/venues/:id` | `/venues*` | VenueType выровнен additive |
| Cities | `GET /admin/cities`, `GET/PATCH /admin/cities/:id` | `/cities*` | City hub additive поэтапно |
| Landings | `GET/POST/PATCH /admin/landings`, `GET /admin/landings/:id` | `/landings*` | См. продукт landings; default tab `coverage` |

#### Импорт / синх / маппинг

| Экран V4 | Текущий API | Lovable ТЗ | Заметки |
|----------|-------------|------------|---------|
| Import sources | `GET /admin/supplier-integrations`, runs, issues | `/sources` | Другое имя ресурса |
| Source categories | `GET /admin/source-categories`, unknowns | mapping inbox | Расширение при появлении бэка |
| Sync health | `GET /admin/settings/sync-status`, ops queues | `/sync/health` | KPI additive |

#### Внешние заказы

| Экран V4 | Текущий API | Заметки |
|----------|-------------|---------|
| List | `GET /admin/external-orders?...` | Факты провайдера R/O |
| Detail | `GET /admin/external-orders/:id` | Вкладки Overview, Refunds, … |
| Refunds | `POST/PATCH .../refund-requests`, `GET .../external-refund-requests` | PATCH только операционный слой |

Реализация list: см. `AdminIntegrationsReadController`. Деталка — [`admin-v4-dto-gaps.md`](../reports/admin-v4-dto-gaps.md).

#### Прочее (вне MVP sidebar)

| Экран V4 | Текущий API | Заметки |
|----------|-------------|---------|
| Audit log | `GET /admin/audit?...` | R/O |
| Collections | `GET /admin/collections` | Не в MVP sidebar |
| Refunds internal | `GET /admin/refunds/requests` | Вне Imported Sales core |
| SEO audit | см. модуль страницы | Сверить вызовы при изменениях |

### Скрыто из MVP sidebar

Перелинковка/редиректы; глобальный SEO-аудит (прямой URL); промо, коллекции, internal refund-requests — см. `App.tsx`.

### Замороженные экраны (placeholder)

`/admin-v4/linking`, `/admin-v4/redirects` — без боевого backend в MVP.

### Чеклист при добавлении поля / endpoint

1. Совместимо ли с freeze из [`docs/qa.md`](../qa.md)?
2. Обновить **эту часть C** или OpenAPI.
3. R/O vs override на мутациях.
4. `pnpm --filter @daibilet/frontend-admin-v4 run typecheck`.

### Внешние репозитории (reference UX)

Прототипы Twisterrrrr/event-sales-hub, city-landing-enhancer — **только UX reference**, не источник путей API.

---

## Быстрые ссылки

| Тема | Якорь / раздел |
|------|----------------|
| Интеграция, additive, external purchase | [Часть A](#часть-a-принципы-интеграции-admin-v4--backend) |
| MVP UX, readiness, orders, landings | [Часть B](#часть-b-ux--product-contract-imported-sales-mvp) |
| Маршруты SPA и API | [Часть C](#часть-c-карта-экранов-маршрутов-и-api) |
