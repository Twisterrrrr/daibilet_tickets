# Задача 10 — Event / Venue Admin Intelligence: аудит и план

Документ фиксирует **текущее состояние кодовой базы**, **что переиспользовать**, **фазы внедрения** и **пробелы (TODO)**. Доменные правила витрины не дублировать на фронте — только read models с backend.

---

## 1. Аудит backend

### 1.1 Готовность / качество / publish gate

| Компонент | Где | Что делает |
|-----------|-----|------------|
| **`EventQualityService`** | `packages/backend/src/catalog/event-quality.service.ts` | `validateForPublish(eventId)`: проверки заголовка, города, категории, описания, картинки, локации (venue/адрес/meeting point), **sellability** через `isSellable()` (офферы, цена, будущие сеансы для `SCHEDULED`, даты для `OPEN_DATE`). Возвращает `{ isReady, issues[] }` с кодами (`MISSING_*`, `NO_FUTURE_SESSIONS`, …). |
| **`isSellable`** | `packages/backend/src/catalog/sellable.ts` | Нормализация офферов + условия продажи (часть publish-gate). |
| **`checkAndPersist`** | тот же сервис | Пишет в `EventOverride`: `qualityStatus` (`READY` / `BLOCKED`), `qualityIssues` (JSON), `qualityCheckedAt`. |
| **Admin API** | `GET /admin/events/:id/quality` | `admin-events.controller.ts` → `EventQualityDto`: поле **`isSellable`** (фактически «готово к продаже»), массив **`issues`** с `severity` (BLOCKING/WARNING), `tabKey`, `ownership`. |

**Зазоры относительно ТЗ 10A (checklist):**

- Единый агрегированный статус **`READY | NEEDS_WORK | BLOCKED`** в API **не отдаётся отдельным полем** — сейчас есть `isSellable` + список issues. `NEEDS_WORK` логично ввести как «есть только WARNING, нет BLOCKING» (или по отдельной политике) — **на backend**.
- Отдельные флаги вида «Картинка ОК», «Описание ОК» **не вынесены** — их можно **вывести из тех же правил** (маппинг `code` → checklist item) в новом **admin read DTO**, не копируя логику на фронт.
- **«Возраст указан»**: в Prisma у события есть `minAge` (и override), в **`validateForPublish` проверки minAge нет** — потребуется **расширение** `EventQualityService` + код issue, если продуктово обязательно.

### 1.2 Продвижение / популярные / boost

| Компонент | Где | Что делает |
|-----------|-----|------------|
| **`manualBoost`** | `EventOverride.manualBoost`, правки через admin | В `catalog.service.ts`: сортировка каталога `manualBoost desc`, для `sort=popular` — `reorderPopularWithBoostLimit` (лимит boosted-слотов в топе). |
| **Бейджи витрины** | `toEventCard` / маппинг событий | `isOptimalChoice`, рейтинги и т.д. — вычисляются при выдаче каталога, не как отдельный «tier» в БД. |

**Зазоры:** отдельного поля **«promotion tier»** нет — есть число `manualBoost` и правила каталога. Для блока «Продвижение» достаточно **read model**: `manualBoost`, флаг «участвует в лимите popular», короткий **текст-пояснение с backend** (статическая строка + числа из конфига лимита).

### 1.3 Слоты и загрузка (операционка)

| Компонент | Где | Что делает |
|-----------|-----|------------|
| **`GET /admin/events/:id/sessions`** | `admin-events.controller.ts` | Диапазон дат `from`/`to`, сеансы с `capacity`, `soldCount` (агрегация), отменённые — опционально. Уже основа для **summary + heatmap/таблица** без нового scheduling-модуля. |
| **Компоненты админки** | `ScheduleTab`, `ScheduleSummary`, `ScheduleGrid*` | UI расписания; можно **добавить компактный diagnostic block**, переиспользуя тот же API или лёгкий новый endpoint-обёртку с агрегатами. |

### 1.4 Коммерция / аналитика / конверсия

| Найдено | Примечание |
|---------|------------|
| `admin-checkout.controller.ts` — `GET .../analytics` | Есть **conversion** в ответе — нужно проверить, **привязано ли к событию** или глобальная сводка. |
| `admin-suppliers.controller.ts` — `analytics/summary` | Уровень поставщика, не события. |

**Зазоры:** **агрегированный per-event admin summary** (заказы 30д, view→order, возвраты %) **скорее всего отсутствует** — потребуется **новый use-case** (запросы к `Order` / `CheckoutSession` / событиям просмотров, если трекаются) + **один DTO**. Если метрик просмотров нет — честно отдавать **approximation** или `null` с полем `dataQuality: 'PARTIAL'`.

### 1.5 Импорт / синк / дубли

| Поле / API | Назначение |
|------------|------------|
| `Event.source`, `tcData`, `lastSyncAt` | Источник и время последнего синка. |
| `GET/PATCH` grouping / `deduplicate-candidates`, `deduplicate-fuzzy`, `mark-duplicate` | Группы дублей, кандидаты. |

**Зазоры:** **единого статуса `OK | WARNING | ERROR`** по синку в API нет — можно **вычислить read model** из `lastSyncAt`, флагов ошибок в sync-сервисах (если пишутся в `tcData` или логи), без дублирования бизнес-правил на фронте.

### 1.6 Контент / шаблоны PDP

| Компонент | Где |
|-----------|-----|
| **`EventTemplateFields`** | `packages/frontend-admin/src/pages/events/EventTemplateFields.tsx` — формы по `category` / подкатегориям (маршрут, меню, корабль, …), пишут в `templateData`. |
| **Shared specs** | В ТЗ упомянуты `PageTemplateSpecs` / registry — уточнить в `packages/shared` / `content-template.types.ts` для единого списка секций. |
| **Сырой JSON** | Вероятно остаётся в `EventEdit` для advanced — **не ломать**; поверх — визуальный слой (Phase C). |

### 1.7 Площадка (venue)

| Компонент | Где |
|-----------|-----|
| **`VenueEdit`**, **`VenuesList`** | `packages/frontend-admin/src/pages/venues/` |
| **`venueTemplateData`** | DTO в `admin-venue.dto.ts`, PATCH в `admin-venues.controller.ts` — сейчас **Record**, без типизированного read model здоровья витрины. |

**Зазоры:** агрегаты «активные события с будущими слотами», «доля READY», «средний рейтинг» — **новый backend endpoint** (например `GET /admin/venues/:id/storefront-health`).

---

## 2. Аудит frontend-admin

| Элемент | Файлы / назначение |
|---------|---------------------|
| Качество | `getEventQuality`, `QualityBanner`, `EventStatusLine`, таб counters `qualityCounters.ts` |
| Редактор события | `EventEdit.tsx` (крупная страница), табы, `EventGroupTab`, расписание |
| Шаблон контента события | `EventTemplateFields.tsx` — уже **не слепой JSON** для части полей, но не все секции ТЗ и нет единого preview |
| Площадка | `VenueEdit.tsx` — расширить блоками 10D |

---

## 3. Фазы реализации (минимум 3)

### Phase A — Event: readiness + promotion + operations summary

**Backend**

1. Новый **admin read DTO** (например `EventStorefrontReadinessDto`):
   - агрегат статус: `READY | NEEDS_WORK | BLOCKED` (правила на основе `EventQualityService` + классификация issues);
   - **checklist** с булевыми пунктами и ссылкой на `issue.code` при false;
   - переиспользовать **`validateForPublish`**, не копируя проверки.
2. Расширить при необходимости **`EventQualityService`** (например `minAge`, если продукт подтвердит).
3. **`EventPromotionReadDto`**: `manualBoost`, `popularBoostApplied` (участвует ли в топ-N), `helpText` (строка с backend).
4. **`GET /admin/events/:id/operations-summary`** (или один объединённый `.../intelligence`):
   - слоты: ближайший, count будущих, sold/available **из существующих запросов/лёгкой агрегации**;
   - опционально пресеты «сегодня / выходные / вечер» как **фильтры дат** для UI (только параметры, без новой логики каталога).
5. **Commercial summary**: новый сервис + DTO; если данных мало — `approximation: true` и пояснение.

**Frontend-admin**

- Новые секции на `EventEdit`: блок «Готовность к витрине», «Продвижение», «Слоты и загрузка» (компактная таблица/heatmap на данных API), «Коммерческий срез» (как придёт DTO).

---

### Phase B — Venue: storefront health + related events

**Backend**

1. `GET /admin/venues/:id/storefront-health`: агрегаты по связанным событиям (через существующие критерии качества / sellable).
2. `GET /admin/venues/:id/related-events`: список с `qualityStatus`, ссылками, опциональным флагом «скрыть из каталога» если модель это поддерживает.

**Frontend-admin**

- `VenueEdit`: три блока из ТЗ 10D (витрина, контент с улучшенным редактором — можно начать с простых полей), таблица событий с цветом статуса и действиями.

---

### Phase C — Content blocks: визуальный редактор + preview

**Backend**

- При необходимости: endpoint **validate** или **preview payload** (опционально), без смены схемы хранения.

**Frontend-admin**

- Разбить секции (Особенности, Программа, …) по **registry** из shared specs, синхронно с `EventTemplateFields`.
- **Preview**: статический рендер типовых блоков (как на PDP) или упрощённая вёрстка; raw JSON — collapsible advanced.

---

## 4. Итоговый отчёт (чеклист для закрытия задачи)

После реализации каждой фазы зафиксировать:

| Пункт | Содержание |
|-------|------------|
| **Добавленные admin blocks** | Перечень компонентов/секций на `EventEdit` / `VenueEdit` |
| **Новые DTO / endpoints** | Пути, версии контрактов |
| **Переиспользованные сервисы** | `EventQualityService`, `isSellable`, `CatalogService` (boost), admin sessions, sync-поля |
| **TODO следующего шага** | Например: полноценная conversion, heatmap данных, автотесты read models |

---

## 5. Риски и принципы

- Не считать **метрики витрины** на фронте админки.
- Любой новый статус — **явная формула на backend** + тесты на edge cases (нет сеансов, нет офферов).
- **Не массовый рефакторинг** `EventEdit`: новые блоки — отдельные компоненты + один загрузчик intelligence DTO.

---

## 6a. Phase B — детальная спецификация

См. **[Task10-PhaseB-Venue-Spec.md](./Task10-PhaseB-Venue-Spec.md)** — API `GET /admin/venues/:id/summary`, DTO `VenueAdminSummaryDto`, логика витрины, таблица связанных событий, разбиение B1 / B2.

---

## 6. Быстрый указатель файлов

| Область | Файлы |
|---------|--------|
| Качество | `catalog/event-quality.service.ts`, `catalog/sellable.ts` |
| Admin events API | `admin/admin-events.controller.ts`, `admin/dto/admin-event.dto.ts` |
| Каталог / boost | `catalog/catalog.service.ts` |
| Админка событие | `frontend-admin/.../EventEdit.tsx`, `QualityBanner.tsx`, `EventTemplateFields.tsx` |
| Админка площадка | `frontend-admin/.../VenueEdit.tsx` |
| Prisma | `Event`, `EventOverride` (`qualityStatus`, `manualBoost`, `minAge`, …) |

---

---

## 7. Реализовано (Phase A — MVP)

- **Backend:** `GET /admin/events/:id/summary` → `EventAdminSummaryDto` (readiness + promotion + operations + commercial stub + integration).
- **Сервис:** `EventAdminSummaryService` — агрегирует `EventQualityService.validateForPublish`, чеклист из issue-кодов + `hasAge`, tier из `manualBoost` (>80 TOP, >30 POPULAR), операции из `EventSession` + `PackageItem`, коммерция — счётчик `OrderRequest` за 30 дней + `dataQuality: PARTIAL`.
- **Качество:** для `audience === KIDS` и `minAge === 0` добавлен issue `MIN_AGE_REQUIRED_FOR_KIDS` в `EventQualityService`.
- **Админка:** `EventAdminSummaryPanel` на `EventEdit`, API `getEventAdminSummary`.

**Phase B (19.03.2026):**

- **Backend:** `GET /admin/venues/:id/summary` → `VenueAdminSummaryDto` (storefront, content, relatedEvents).
- **Сервис:** `VenueAdminSummaryService` — агрегирует события площадки, слоты, рейтинг, readyRatio (гибрид: первые 20 через `EventAdminSummaryService`, остальные из override).
- **Админка:** `VenueAdminSummaryPanel` на `VenueEdit`, API `getVenueAdminSummary`.

**Шлифовка A/B (19.03.2026):**

- Shared `ReadinessBadge` и `StorefrontVisibilityBadge` — единый визуальный стиль.
- Empty-state для venue без событий.
- Сортировка relatedEvents по quality/visibility (проблемные первыми).

**Phase C (закрыта, 19.03.2026):** см. `docs/Task10-PhaseC-Content-Blocks-Spec.md` — C1 (Event `contentTemplateData`) и C2 (Venue `venueTemplateData`): `ContentBlocksPanel`, preview + Raw JSON, registry из `getEventTemplateSpecs` / `getVenueTemplateSpecs`; без нового validate-endpoint и без смены схемы хранения.

*Документ: результат аудита по репозиторию SPBBOATS на дату создания. При появлении новых сервисов — обновить раздел 1.*

---

## 8. Phase A — принятие и следующие шаги (организация)

### 8.1 Статус Phase A

**Phase A (Event Summary) считается принятой (accepted):** опорная структура admin intelligence по событию есть. **Дальнейшие изменения в Phase A — только bugfix**, без «докруток фич» в том же пакете, чтобы не расплескать темп.

### 8.2 Phase A.1 — ближайшие логичные улучшения (не срочно)

Это **не** «надо срочно переделать», а осознанный бэклог после продуктовой аналитики:

| Тема | Суть | Заметка |
|------|------|---------|
| **Пороги `manualBoost` (>30 / >80)** | Сейчас норм как старт; продукт захочет двигать пороги (разреженный vs плотный каталог). | Вынести в конфиг, целевые имена в духе `POPULAR_MIN_BOOST` / `TOP_MIN_BOOST`. |
| **`hasDuplicates` vs `groupingKey`** | Старт годится, но это **не полноценная duplicate-диагностика**, а признак группировки / связи. | В UI трактовать осторожно: не «дубликат», а **«есть связь по группе / возможный дубль»**. |
| **KIDS + `minAge` = blocker** | Логично по правилам, но нужна проверка на **живых данных**. | Если массово `BLOCKED` — продуктовый флажок: ослабить (например `0+` валиден) или **NEEDS_WORK** вместо **BLOCKED**. |

### 8.3 Порядок фаз (без смешения)

| Фаза | Класс задачи |
|------|----------------|
| **Phase B** | Operational / admin intelligence — **Venue Summary Slice** (`GET /admin/venues/:id/summary`) — **реализовано** (см. `Task10-PhaseB-Venue-Spec.md`). |
| **Phase C** | Редакторский UX + preview контент-блоков — **реализовано** (узкий scope C1/C2, см. `Task10-PhaseC-Content-Blocks-Spec.md`). Тяжёлый visual editor / schema studio — отдельные эпики. |

**Пока не распылять на:** полноценную conversion analytics, «настоящий» refund rate, drag-and-drop конструктор блоков, сложную duplicate console — это отдельные эпики после опоры A+B+C.

### 8.4 Практический вывод

- **Event summary** — готово (база).
- **Venue summary** — готово (Phase B).
- **Content blocks (формы + preview + raw JSON)** — готово (Phase C, C1/C2).

**Организационно:** Task 10 по оси «admin intelligence + контент PDP в админке» для A/B/C закрыт; дальнейшие улучшения — отдельными задачами по приоритету продукта.
