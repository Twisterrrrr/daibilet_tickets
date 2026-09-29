# Вопросы по архитектуре и доведению Admin V4 до launch-grade

Цель файла: фиксировать вопросы, которые нужно решить, чтобы админка (Imported Sales Admin / `frontend-admin-v4`) была **стабильной, безопасной и поддерживаемой**.

**Admin V4 Imported Sales (экраны, UX-контракт, интеграция с бэкендом):** [`product/admin-v4-imported-sales.md`](product/admin-v4-imported-sales.md) — части A–C; короткие указатели: [`product/lovable-admin-contract-map.md`](product/lovable-admin-contract-map.md), [`product/admin-v4-integration-principles.md`](product/admin-v4-integration-principles.md).

## Архитектура / границы систем

- Какой **целевой статус** Admin V4 относительно Admin V3: замена, dual-run, или “узкий sales hub” навсегда? 

frontend-admin-v4 становится основной админкой и заменяет Admin V3.

Admin V3 больше не надо развивать как самостоятельный UI-контур. Его роль:

источник уже принятых продуктовых решений;
донор логики, DTO-подходов, фильтров, таблиц, quality/publish gate;
временный reference для сравнения поведения.


- Какие разделы считаются **MVP обязаловкой** (events/cities/venues/landings/taxonomy/import/external-orders/settings), а какие заморожены? 

Все, что указаны у Lovable
Всё остальное пока остаётся в backend и не обязано иметь полноценный V4 UI.
Но важно: backend может уже содержать эти домены, V4 не обязан их показывать до готовности.


- Есть ли утверждённая политика “**не трогать контракты**” для `/api/v1/admin/**` на период запуска, и какие исключения допустимы?

на период запуска вводится freeze policy.

Запрещено:

удалять поля из DTO;
переименовывать поля;
менять тип поля;
менять enum values без fallback;
менять смысл существующего поля;
переносить endpoint без alias;
ломать query params, которые уже использует Admin V4.

Разрешено:

добавлять новые поля;
добавлять новые endpoint’ы;
добавлять optional query params;
добавлять nullable поля;
добавлять новые enum values, если UI имеет fallback UNKNOWN;
создавать новые V4-specific read models рядом со старыми endpoint’ами.

Правильная политика:

Existing /api/v1/admin/** contracts are frozen for breaking changes until Admin V4 launch. Additive backend changes are allowed. Any breaking change requires a new endpoint, versioned DTO, or compatibility adapter.

Исключения допустимы только если:

текущий контракт фактически не используется UI;
есть миграционный PR frontend + backend вместе;
есть rollback path;
есть тест на старое и новое поведение.


## Typed boundary / DTO

- Где у нас “источник правды” по DTO: shared-пакет (`@daibilet/shared`) или backend DTO? Какой процесс синхронизации?

источник правды — backend DTO + OpenAPI/typed client generation.

Не стоит делать @daibilet/shared главным источником правды, если backend реально определяет контракт. Иначе будет расхождение: backend живёт отдельно, shared живёт отдельно, V4 верит третьей версии.

Целевая схема:

Backend DTO / Zod / Swagger
        ↓
Generated admin API client
        ↓
frontend-admin-v4 typed boundary
        ↓
UI adapters / view models

@daibilet/shared можно использовать для:

enum’ов;
общих UI-independent типов;
shared constants;
section/subcategory mappings;
helper types.

Но не как ручную копию всех admin DTO.


- Какие поля нужны Admin V4 для Lovable parity, но **не отдаёт backend** (списком), и какие из них реально блокируют MVP?

Это надо не угадывать, а оформить как audit-таблицу. Но уже сейчас список вероятных gap’ов такой.

Events

Часто не хватает:

quality.isReady;
quality.blockers[];
quality.warnings[];
publishGate.status;
publishGate.reasons[];
purchase.purchaseType;
purchase.provider;
purchase.deeplink;
purchase.widgetPayload;
purchase.isConfigured;
import.source;
import.externalId;
import.lastSyncedAt;
import.syncStatus;
seo.title;
seo.description;
seo.issues[];
media.coverImageUrl;
offers.activeCount;
sessions.upcomingCount;
venue.name;
city.name;
primarySubcategories[].
Venues

Вероятно нужны:

venueType;
lifecycleStatus;
sourceType;
importSource;
externalVenueId;
needsReview;
duplicateHints[];
confidenceScore;
isPublished;
isVenuePageWhitelisted;
seoIssues[];
eventsCount.
Landings

Вероятно нужны:

landingType;
city;
canonicalMode;
canonicalLandingId;
publishedAt;
theme;
heroTitle;
heroSubtitle;
layoutVariant;
surfaceVariant;
seoH1;
seoTitle;
seoDescription;
contentBlocks[];
matchedEventsCount;
readiness.status;
readiness.issues[].
External Orders

Нужны минимум:

provider;
externalOrderId;
status;
integrationState;
customerName;
customerPhoneMasked;
customerEmailMasked;
eventTitle;
eventId;
paidAt;
amount;
currency;
artifactType;
voucherUrl;
source;
rawPayloadAvailable, но не сам payload в списке.
Что реально блокирует MVP

Блокируют:

отсутствие stable list/detail DTO для Events;
отсутствие purchase link состояния;
отсутствие provider/source полей;
отсутствие publish/quality gate;
отсутствие city/venue binding;
отсутствие basic external orders read model;
отсутствие landings read/write DTO;
отсутствие taxonomy read/write DTO.

Не блокируют:

идеальная reconciliation UI;
полная finance логика;
EDO;
Supplier LC;
красивые analytics cards;
advanced dashboards;
deep audit logs в интерфейсе.


- Нужны ли отдельные “admin read models” (DTO для UI), чтобы не тащить тяжёлые include’ы?

Да, нужны.

Иначе UI будет зависеть от тяжёлых Prisma include’ов и каждый экран начнёт тащить пол-БД.

Правильная модель:

Domain entities
   ↓
Admin read model service
   ↓
Small DTO for list
   ↓
Full DTO for detail
   ↓
Action DTOs for mutations

Минимум по каждому крупному разделу:

AdminEventListItemDto
AdminEventDetailDto
AdminVenueListItemDto
AdminVenueDetailDto
AdminLandingListItemDto
AdminLandingDetailDto
AdminExternalOrderListItemDto
AdminExternalOrderDetailDto

Правило:

list DTO — лёгкий, быстрый, без тяжёлых массивов;
detail DTO — полный для формы;
mutation DTO — отдельный, не равен detail DTO;
raw provider payload не отдавать в list вообще.

## Миграции / окружение

- Какой процесс применения миграций на dev/staging/prod (и кто отвечает), чтобы не ловить runtime Prisma “column does not exist”?

Нужно зафиксировать жёсткий процесс.

Dev

Для локальной разработки:

pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm dev

Или один wrapper:

pnpm dev:preflight
Staging

Только:

prisma migrate deploy
prisma generate

Никаких migrate dev на staging.

Prod

Только:

prisma migrate deploy
prisma generate

Плюс:

backup до миграции;
smoke test после миграции;
health check backend;
проверка Admin V4 boot;
rollback plan.

Правильная политика:

Runtime errors like column does not exist are treated as deployment process failures, not frontend bugs.

Ответственный контур:

backend владеет миграциями;
deploy pipeline применяет миграции;
frontend не должен “угадывать”, есть колонка или нет;
preflight должен ловить это до запуска UI.
- Нужно ли завести “preflight” проверку (скрипт/health) для dev запуска: БД поднята, миграции применены, порты свободны?

Да, нужна.

Минимальный dev:preflight должен проверять:

PostgreSQL доступен.
Redis доступен, если нужен.
.env существует.
DATABASE_URL валиден.
Prisma Client сгенерирован.
Миграции применены.
Нет drift между Prisma schema и DB.
Backend port свободен.
Admin V4 port свободен.
Backend /api/v1/health отвечает.
Admin API auth настроен.
Seed/admin user существует, если нужен.

Для staging/prod — отдельный deploy:preflight.

## Безопасность / RBAC

- Какие роли считаются минимально необходимыми для операторов Admin V4? (без расширения RBAC)

пока можно обойтись. потом без расширения RBAC минимально достаточно 3 ролей:

VIEWER

Может:

смотреть события;
смотреть города;
смотреть площадки;
смотреть лендинги;
смотреть external orders;
смотреть import status.

Не может:

публиковать;
редактировать;
запускать импорт;
менять настройки;
видеть raw payload;
видеть немаскированные PII.
EDITOR / OPERATOR

Может:

редактировать события;
редактировать города/площадки/лендинги;
модерировать imported venues;
исправлять taxonomy bindings;
менять SEO-поля;
публиковать/снимать с публикации, если это уже разрешено текущим backend.

Не может:

менять системные настройки;
менять provider credentials;
видеть secrets;
выполнять опасные batch operations без отдельного permission.
ADMIN

Может:

settings;
feature flags;
import controls;
dangerous actions;
raw diagnostics;
role-sensitive operations.

На MVP не надо городить 15 ролей. Достаточно:

VIEWER
EDITOR
ADMIN

Но в коде лучше уже не хардкодить “admin-only everywhere”, а оставить permission map.

- Какие поля считаются чувствительными и должны быть **masked** в админских DTO/логах?

Маскировать в DTO и логах:

Персональные данные
phone;
email;
full name, если не нужен полностью;
customer comments;
booking notes;
passenger names;
Telegram/WhatsApp identifiers;
IP;
user agent, если хранится;
payment identifiers.
Финансовые/платёжные данные
payment provider IDs;
webhook raw payload;
fiscal receipt payload;
refund payload;
YooKassa/payment tokens;
bank/account details;
invoice details, если не нужны оператору.
Интеграционные данные
API keys;
widget secrets;
webhook secrets;
provider credentials;
raw external payload;
internal error stack with env values.

Правило:

Admin list DTO never returns raw payloads or secrets. Detail DTO may expose diagnostic flags, but raw provider payload should require ADMIN-level access and should be excluded from normal logs.

Пример:

customerEmailMasked: "v***@mail.ru"
customerPhoneMasked: "+7 *** ***-45-67"
rawPayloadAvailable: true

А не:

customerEmail: "vasilii@example.com"
rawPayload: {...}

## Наблюдаемость / инциденты

- Где фиксируем инциденты (порт занят, падение импорта, ошибки виджетов) помимо `Diary.md`: нужен ли отдельный `docs/reports/admin-v4-incidents.md`?

Да, нужен отдельный файл.

Diary.md — это журнал решений и хода проекта. Инциденты там потеряются.

Я бы завёл:

docs/reports/admin-v4-incidents.md

Формат записи:

# Admin V4 Incidents

## 2026-04-29 — Backend failed due to missing Prisma column

- Environment: dev / staging / prod
- Surface: backend / frontend-admin-v4 / import / external-orders
- Severity: low / medium / high / critical
- Symptoms:
- Root cause:
- Fix:
- Prevention:
- Related PR:
- Follow-up:

Что фиксировать:

порт занят;
backend не стартует;
Prisma column missing;
import job падает;
Ticketscloud/Teplohod виджет не открывается;
purchase link broken;
external orders не подтягиваются;
auth/RBAC ошибка;
CORS;
env mismatch;
public page не может получить landing/event.


- Какие метрики/логи считаются “must have” для запуска Imported Sales Admin?

Для Imported Sales Admin минимум нужен не “красивый dashboard”, а диагностируемость.

Backend logs

Обязательно логировать:

requestId;
userId/adminId;
route;
statusCode;
latency;
provider;
importSource;
externalId;
error code;
jobId;
environment.
Import metrics

Нужно видеть:

last successful sync by provider;
last failed sync by provider;
imported events count;
imported venues count;
skipped records count;
failed records count;
duplicate candidates count;
duration;
error reason breakdown.
Admin API metrics

Минимум:

p95 latency по /api/v1/admin/events;
p95 latency по /api/v1/admin/external-orders;
error rate;
401/403 rate;
500 rate;
slow queries.
Purchase-link diagnostics

Нужно видеть:

events with missing purchase link;
invalid deeplink;
missing widgetPayload;
provider mismatch;
purchaseType mismatch;
events blocked by MISSING_PURCHASE_LINK.
Frontend

Минимум:

API error boundary;
visible error states;
loading states;
empty states;
retry action;
console-free critical path.

## Публичный контур / покупки (TC/Teplohod)

- Для импортируемых событий: подтверждаем ли окончательно принцип “**покупка в виджете провайдера**”, без промежуточного checkout на нашей стороне? Для импортируемых событий покупка происходит в виджете/на стороне провайдера. Daibilet на MVP не вставляется в платёжный поток и не делает промежуточный checkout.
Но важно: Admin должен явно показывать, что событие продаётся внешне.

Например:

Purchase type: WIDGET / REDIRECT / NONE
Provider: TICKETSCLOUD / TEPLOHOD
Purchase status: Configured / Missing / Invalid


- Какой минимальный контракт должен быть у “purchase link” в admin DTO (deeplink, purchaseType, provider)?

export type AdminPurchaseType =
  | 'WIDGET'
  | 'REDIRECT'
  | 'EXTERNAL_PROVIDER'
  | 'NONE';

export type AdminPurchaseProvider =
  | 'TICKETSCLOUD'
  | 'TEPLOHOD'
  | 'INTERNAL'
  | 'UNKNOWN';

export interface AdminPurchaseLinkDto {
  purchaseType: AdminPurchaseType;
  provider: AdminPurchaseProvider;

  deeplink?: string | null;
  widgetPayload?: Record<string, unknown> | null;

  isConfigured: boolean;
  isValid: boolean;

  status:
    | 'READY'
    | 'MISSING'
    | 'INVALID'
    | 'PROVIDER_UNSUPPORTED'
    | 'DISABLED';

  blockingReasons: Array<
    | 'MISSING_PURCHASE_LINK'
    | 'MISSING_PROVIDER'
    | 'MISSING_DEEPLINK'
    | 'MISSING_WIDGET_PAYLOAD'
    | 'INVALID_DEEPLINK'
    | 'UNSUPPORTED_PURCHASE_TYPE'
  >;

  lastCheckedAt?: string | null;
}

## Imported Sales Admin — внешняя покупка и внешние заказы

### 1. Граница продукта

В текущем срезе Imported Sales Admin у Daibilet **нет собственного финансового контура платформы**.

**Не используется:**

- YooKassa;
- внутренний checkout;
- корзина;
- платёж Daibilet;
- внутренний order как источник истины;
- клиринг;
- расчёты с поставщиками;
- автоматический возврат через платёжку Daibilet;
- фискализация Daibilet.

Финансовый контур относится к **будущей фазе** после появления ЛК поставщика и **не должен смешиваться** с imported sales.

---

### 2. Event Detail: External Purchase Entry

В карточке события используется блок:

**«Внешняя покупка» / External Purchase Entry**

Это **не** checkout и **не** order flow. Это диагностика того, **можно ли отправить пользователя во внешнюю покупку у провайдера**.

Каноническое additive-поле в:

```http
GET /api/v1/admin/events/:id
→ externalPurchaseEntry
```

**Источник данных:** факты из `EventOffer` / импортного provider data:

- widget;
- deeplink;
- provider;
- статус готовности;
- причины блокировки.

`AdminPurchaseLinkDto` / `purchaseLink` допускается только как **legacy / дополнительная диагностика**.

Фронтовая эвристика допускается **только как fallback**, если `externalPurchaseEntry` отсутствует.

---

### 3. External OrdersExternal Orders — это **не** полностью read-only экран.

**Read-only** остаются **факты провайдера:**

- provider;
- externalOrderId / providerOrderId;
- providerStatus;
- сумма;
- валюта;
- paidAt;
- ticket/voucher facts;
- source payload mirror;
- привязка к событию, пришедшая из источника.

**Редактируемым** является **только операционный слой Daibilet:**

- внутренний статус обработки;
- заметки оператора;
- ответственный;
- заявки на ручной возврат;
- причина возврата;
- запрошенная сумма;
- согласованная сумма;
- статус ручной обработки;
- дата завершения;
- комментарий результата.

**PATCH** разрешён **только** для операционного слоя.

**PATCH фактов провайдера запрещён.**

---

### 4. Manual Refund Workflow

Заявка на возврат в Imported Sales Admin — это **не** финансовая операция Daibilet.

Это **внутренний трекинг** ручной обработки возврата по внешнему заказу.

Фактическое проведение возврата выполняется вручную:- в кабинете провайдера;
- через поддержку провайдера;
- по внешнему регламенту.

Daibilet в MVP только фиксирует:

- что запрос создан;
- кто взял в работу;
- что проверено;
- был ли провайдер уведомлён;
- чем завершилась ручная обработка.---### 5. Admin Flow

[`docs/product/Admin_Flows.mmd`](product/Admin_Flows.mmd) — это **navigation / UX flow reference**.

Это **не** API-контракт и **не** источник Prisma-архитектуры.

Все реальные API должны оставаться под:

`/api/v1/admin/**`

Все изменения backend — **только additive**, через существующую доменную модель и admin read-models.

---

### Финальная короткая формула

```text
Imported event → Daibilet catalog page → provider widget/deeplink → provider checkout → external provider order → Daibilet operational tracking.
```

**А не:**

```text
Imported event → Daibilet cart → Daibilet checkout → Daibilet payment → Daibilet order.
```

Так формулировка не оставляет лазеек для преждевременного YooKassa / checkout / finance-контура.

---

## QA — шаблоны лендингов и привязка к админке (Admin V4 / Landings)

Цель: перед реализацией “template → apply in admin” согласовать **минимальный, безопасный** путь, чтобы оператор не собирал лендинг руками из JSON и не ломал витрину.

### 1) Scope и источники истины

- **Что считаем “шаблоном”**: набор дефолтных полей `LandingPage` + набор `LandingContentBlock` + правила применения (safe add vs reset)?
- **Шаблон живёт в коде или в БД?** (на старте: в коде; БД/редактор шаблонов — позже?)
- **Какая связь с `templateType` (Prisma `LandingTemplateType`)**: это “тип рендера” или “id шаблона/пресета” для админки?
- **Нужны ли отдельные “template ids”** (например `NIGHT_BRIDGES_SPB`, `DINNER_CRUISE_MSK`) или достаточно комбинации `templateType + filterTag + landingType + city`?

### 2) Список целевых шаблонов (MVP)

- Подтверждаем 5 шаблонов:
  - MULTI_CITY: **Салют 9 мая** (с сезонным окном), **Речные прогулки**, **Автобусные обзорки**
  - CITY: **Ночные мосты СПб**, **Ужины на теплоходе Мск**
- Для каждого: **какой `filterTag` (slug) является источником истины**? Есть ли он уже в Tag-справочнике и как он называется?
- Для CITY-шаблонов: **какой город (city.slug)** является каноническим (СПб/Мск), и какие “первичные” города нужны для мульти-хабов?

### 3) Фильтры и “настраиваемая часть”

- Фиксируем baseline filters v1 (что сохраняется в `additionalFilters` и валидируется):
  - `minDuration`, `maxDuration`, `features[]`, (опц.) `category`, `source`
- Для “частных случаев” (например **ужины**):
  - какие `features[]` считаются каноническими (словарь значений)?
  - допускаем ли ручное редактирование features в админке или только выбор из списка?
- Что делать с фильтрами из референса (date/timeSlot/pier/sort/distance/amenities), которых **нет** в `additionalFilters`:
  - явно фиксируем как **follow-up** (не пытаться сохранять “UI-only” значения)?

### 4) Seasonal / временные окна (салют 9 мая)

- **Где хранится окно отображения**:
  - в `LandingPage.seasonalPayload.seasonWindow` (у нас валидируется `MM-DD`) — подтверждаем?
- **Что значит “период отображения” в продукте**:
  - скрывать лендинг целиком (в list / public) вне окна?
  - или только влиять на подбор/фильтры?
- Если скрывать: это через `isActive/status/isIndexable` (materialize/ops) или отдельной логикой рендера?

### 5) Каноника и разные домены (admin/public)

- Подтверждаем политику: при разных origins (например `admin.*` vs `www.*`) кнопка “На сайте” должна работать через **полный `canonicalUrl`**, иначе относительная ссылка ведёт на admin origin.
- Кто источник `canonicalUrl`: заполняется шаблоном/сидом, оператором, или вычисляется на бэке из `PUBLIC_SITE_URL`?

### 6) Применение шаблона (apply) и безопасность изменений

- Режимы применения:
  - **Safe apply**: создать/добавить недостающие блоки, не трогать существующие
  - **Reset to template**: удалить/пересоздать блоки (опасно) — нужен ли в MVP?
- Как маппим блоки “шаблон ↔ существующие”:
  - по `type+variant`?
  - нужен ли `payload.templateKey` для стабильного сопоставления?
- Что считаем “ручными правками”, которые нельзя перезатирать safe-apply?

### 7) Publish/activate guardrails

- При попытке `status=ACTIVE` / `isActive=true`:
  - CITY: блокируем, если выдача пуста (уже есть правило) — ок?
  - MULTI_CITY: блокируем без живых child’ов (уже есть правило) — ок?
- Считаем ли SEO/контентные проверки **soft** (warnings), а не hard blockers?

### 8) Роли, аудит, операции

- Кто имеет право:
  - создать лендинг по шаблону
  - применить шаблон
  - делать reset
- Нужно ли логировать “apply template” отдельным audit action (помимо существующих audit логов на update/create)?

### 9) UX админки (минимум)

- Где живёт входная точка шаблонов:
  - отдельная секция на `LandingsPage` (“Templates”)
  - или кнопка на `LandingDetailPage` (“Применить шаблон”)?
- После apply: автоматически открываем вкладки “Подбор”/“Диагностика” для проверки результата?
