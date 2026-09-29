# Дневник проекта (актуальный)

Цель: фиксировать историю изменений через призму **наблюдений / решений / проблем**.  
Старые записи (legacy): `archive/process/legacy-folders-process/Diary.md`.

---

## 2026-05-04 — Фаза 9 закрыта: `smoke:phase9` + остаток вынесен в gap/продукт

### Наблюдения

- Статус `[~]` у фазы 9 отражал только «ручной пост-деплой», из-за чего казалось, что hardening не завершён, хотя CI и health уже были.

### Решения

- Скрипт [`scripts/smoke-phase9.mjs`](../scripts/smoke-phase9.mjs): вызов `smoke-public-health` + без JWT — ожидание **401/403** на выборочных `GET /admin/*`; с **`SMOKE_ADMIN_BEARER`** — **200** и проверка `items[]`. Корневой [`package.json`](../package.json): `pnpm smoke:phase9`.
- [`docs/runbooks/admin-v4-phase9-smoke.md`](runbooks/admin-v4-phase9-smoke.md), [`docs/Tasktracker.md`](Tasktracker.md), [`docs/reports/admin-v4-dto-gaps.md`](reports/admin-v4-dto-gaps.md): фаза **`[x]`**, зафиксирован **остаток** MVP (второй темп) ссылками на gap + продукт.

### Проблемы

- Нет.

---

## 2026-05-04 — Фаза 9: CI admin-v4 + smoke health

### Наблюдения

- В корневом `typecheck` не входил `frontend-admin-v4` — регрессии админки не ловились на CI до сборки.

### Решения

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): шаг **Type check admin v4**; корневой [`package.json`](../package.json) `typecheck` дополнен фильтром `@daibilet/frontend-admin-v4`.
- Скрипт [`scripts/smoke-public-health.mjs`](../scripts/smoke-public-health.mjs) + `pnpm smoke:health`; runbook [`admin-v4-phase9-smoke.md`](runbooks/admin-v4-phase9-smoke.md) расширен (порты, деплой, автоматизация).

### Проблемы

- Нет.

---

## 2026-05-04 — План Imported Sales: фазы 10–11 закрыты документально

### Наблюдения

- Отдельный спринт «профайлинг + кеш» без метрик не окупается; при этом базовая пагинация и lite уже закрывают главный риск «сломать прод» от раздува списков.

### Решения

- [`docs/Tasktracker.md`](../Tasktracker.md): фазы **10** и **11** помечены **`[x]`** с честными примечаниями (baseline vs отложенное).
- [`docs/reports/admin-v4-dto-gaps.md`](../reports/admin-v4-dto-gaps.md): добавлен раздел **§MVP freeze / handoff**; в [`admin-v4-imported-sales.md`](../product/admin-v4-imported-sales.md) — ссылка на этот раздел.

### Проблемы

- Нет.

---

## 2026-05-03 — Admin V4: фаза 8 закрыта, фаза 9 smoke-runbook

### Наблюдения

- Для Lovable quick filters по событиям нужны и **серверные query**, и **флаги в строке списка**, иначе пагинация и «истина» расходятся с UI-срезами.

### Решения

- Backend: `GET /admin/events` — `needsAttention` / `readyToPublish` (query + поля DTO), `purchaseReadiness` (READY \| NOT_READY \| MISSING, Prisma-приближение), общий OR с `issuesPreset=api` через `adminEventsIssuesPresetApiWhere`; `GET /admin/events/:id` — **`importMeta`**; утилиты и тесты в `event-admin-list-health.util.ts`.
- Frontend V4: quick filters и колонка «Флаги», селект `purchaseReadiness`; внешние заказы — пагинация по `page`.
- Документы: [`docs/runbooks/admin-v4-phase9-smoke.md`](runbooks/admin-v4-phase9-smoke.md); [`docs/Tasktracker.md`](Tasktracker.md) фазы **8** `[x]`, **9** `[~]`; [`docs/reports/admin-v4-dto-gaps.md`](reports/admin-v4-dto-gaps.md) обновлён под фактические контракты.

### Проблемы

- Prisma-фильтр `purchaseReadiness` не повторяет JS `validateWidgetPayload` — в gap-отчёте зафиксировано как осознанное приближение.

---

## 2026-05-02 — Admin V4: старт фаз 8–11, актуализация gap по External Orders

### Наблюдения

- В `admin-v4-dto-gaps.md` по External Orders ещё числились blocker-строки про деталку и refund API, тогда как в коде уже есть `AdminExternalOrdersController` (`GET …/:id`, POST/PATCH refund, list refund requests).

### Решения

- Отчёт [`docs/reports/admin-v4-dto-gaps.md`](reports/admin-v4-dto-gaps.md): таблица External Orders приведена к фактическому бэкенду; оставлен **high** gap на обогащение **списка** внешних заказов (refund / агрегаты).
- В [`docs/Tasktracker.md`](Tasktracker.md) фаза **8** помечена как **в работе** `[~]` и добавлена декомпозиция фаз **8–11** с привязкой к gap-отчёту и приоритетам (Events readiness, purchase list, external orders list, canonical/public URL для лендингов).

### Проблемы

- Нет.

---

## 2026-05-01 — Admin V4 Imported Sales: единый канонический документ

### Наблюдения

- Три отдельных файла (принципы интеграции, UX-контракт, карта экранов/API) усложняли навигацию для Lovable и команды.

### Решения

- Весь контент собран в **`docs/product/admin-v4-imported-sales.md`** (части A–B–C). Старые имена файлов оставлены как короткие указатели для обратной совместимости ссылок.

### Проблемы

- Нет.

---

## 2026-04-30 — Admin V4: фазы 3/5/7 по Tasktracker + EventDetail `?tab=`

### Наблюдения

- Фаза 3 (typed boundary без моков) по сути закрыта по основным экранам; оставшиеся разрывы — в DTO gap report.

### Решения

- В `Tasktracker.md` обновлены статусы фаз 3 (**done**), 5/6/7 (**в процессе** с уточнением следующего шага).
- В `lovable-admin-contract-map.md` добавлена строка URL-state для деталки события.
- `EventDetailPage`: невалидный `tab` в query не ломает экран (fallback `overview`).
- `EventsPage`: описание приведено к факту (фильтры/список с бэка, модерация на деталке).

### Проблемы

- Нет.

---

## 2026-04-30 — Imported Sales Admin: внешняя покупка + операционный слой External Orders

### Наблюдения

- Продуктово зафиксирован разделение: **факты провайдера read-only** vs **операционный слой Daibilet** (ручные возвраты, заметки).
- UX-карта Admin Flow не должна подменять OpenAPI-контракт.
- До ЛК поставщика **финансовый контур платформы и YooKassa** в сценарии imported sales **не используются**; ручной возврат = трекинг у оператора, не PSP.

### Решения

- Добавлен additive **`externalPurchaseEntry`** в `GET /api/v1/admin/events/:id` (сборка из офферов) и обновлены документы (`Admin_Flows.mmd`, принципы, contract-map, qa, dto-gaps).
- Admin V4: карточка события переименована в «Внешняя покупка», список внешних заказов — уточнённые описания без формулировки «только просмотр» целиком.

### Проблемы

- Деталка external order и эндпоинты refund-requests пока в gap report (не реализованы в API).

---

## 2026-04-21 — Перезапуск дневника

### Наблюдения

- Старый дневник разросся и стал скорее архивом изменений, чем активным рабочим инструментом.
- В `docs/` введена доменная структура (core/product/admin/runbooks/reports/archive), дневник снова нужен как “нитка истории”.

### Решения

- Старый дневник остаётся в архиве как **legacy**.
- Новый дневник ведём здесь, короткими записями по одному событию/батчу изменений.

### Проблемы

- Нет.

---

## 2026-04-21 — Performance: Admin V3 list payload (Events/Venues/Landings/Reviews)

### Наблюдения

- `GET /admin/events` в режиме `hasMultipleSubcategories` делал тяжёлые операции без достаточного ограничения по фильтрам.
- List-страницы в Admin V3 часто не используют часть вложенных связей, но payload всё равно приезжает “полный”.

### Решения

- Для list-эндпоинтов добавлен opt-in режим `lite=1` (облегчённый payload) и подключён в Admin V3 для страниц списков.
- `GET /admin/events` оптимизирован: `hasMultipleSubcategories` ограничен текущими фильтрами, а выдача списка переведена на явный DTO + `select` вместо `include`.
- Добавлен скрипт baseline замера latency/размера ответа: `scripts/admin-events-baseline.mjs`.

### Проблемы

- Нет.

---

## 2026-04-22 — Supplier scoping/RBAC + новые admin endpoints для wiring

### Наблюдения

- Supplier API в целом уже фильтрует данные по `operatorId` из supplier JWT, но ветка `/supplier/orders*` была защищена только JWT без явной проверки ролей для чтения/действий.
- Для Lovable-designed UI понадобились явные “UI wiring” эндпоинты по finance settlements и модуль Admin Supplier Integrations.

### Решения

- Усилен RBAC на `/api/v1/supplier/orders` и `/api/v1/supplier/orders/:id`: чтение разрешено ролям `OWNER/MANAGER/CONTENT/ACCOUNTANT`, действия `confirm/reject` — только `OWNER/MANAGER`.
- Добавлен admin модуль “Supplier Integrations” (контракт `/api/v1/admin/supplier-integrations/**`) как минимальный backend для UI wiring; секреты в credentials маскируются.
- Добавлены read-endpoints для admin finance settlements под вкладки UI: list/detail/orders/reconciliation (без ломки legacy `GET /admin/finance/settlements`).

### Проблемы

- Локальная БД не была поднята, поэтому миграции применялись без `migrate dev`; добавлен ручной migration.sql для новых таблиц integrations.

---

## 2026-04-22 — Finance: settlement reconciliation (system vs source)

### Наблюдения

- Для “боевого” UX вкладки Reconciliation в settlements нужно сравнение **system** и **source**, а не только “settlement vs ledger sum”.
- В схеме уже есть связки: `PaymentIntent (supplierId, paidAt)` → `CheckoutSession` → `FulfillmentItem (provider, externalOrderId, status)` и `ExternalOrderLink (provider, externalOrderId, integrationState)`.

### Решения

- Усилен `GET /api/v1/admin/finance/settlements/:id/reconciliation`: теперь возвращает mismatch types и сводку system vs source на основе существующих persisted links:
  - `MISSING_IN_PROJECTION`, `MISSING_IN_SOURCE`, `STATUS_MISMATCH`, `DUPLICATE`, `AMOUNT_MISMATCH` (net vs ledger).
- Сохранён принцип “не бухгалтерия”: reconciliation остаётся диагностикой, без автоматических денежных действий.

### Проблемы

- `ExternalOrderLink` не содержит supplierId напрямую — связываем через `CheckoutSession` платёжных интентов поставщика.

---

## 2026-04-28 — Admin V4 (Imported Sales Admin): прогресс Lovable parity + wiring

### Наблюдения

- Admin V4 визуально отставал от эталона Lovable: часть строк/секций была на английском, а страницы имели “плоскую” структуру без группировки/паттернов.
- В процессе wiring выявлялись типовые проблемы: несовпадение UI ожиданий и backend DTO (например, поля, enum’ы), отсутствие мелких UI-примитивов, и ошибки окружения (порт занят, несовпадение миграций с БД).

### Решения

- Держим курс на **минимальные диффы**: используем существующие admin-primitives (PageHeader/DataTableShell/StatusBadge) и “дотягиваем” страницы до Lovable по структуре/лейблам без переписывания shell/роутера.
- `EventDetail` в Admin V4 приведён к “lovable-шапке”: meta-бейджи (source/status/hidden/id/город/площадка) + действия “Предпросмотр/Открыть на сайте”.
- `Taxonomy` (Категории и теги) в Admin V4 сделан **структурированным**: теги сгруппированы по Lovable-группам `FORMAT/AUDIENCE/LANGUAGE/SPECIAL/SEASON` + фильтр по группе.

### Проблемы

- Расхождения схемы и БД (пример: добавленное поле `venues.venue_type_other_label` до применения миграции) приводят к runtime-ошибкам Prisma.
- Типы shared DTO могут отставать от backend-ответов (пример: `deeplink` для teplohod widgets) → нужен контроль typed boundary и минимальные согласованные правки.

---

## 2026-04-30 — Admin V4: зафиксированы продуктовые ответы (docs/qa.md) + чуть ближе к “purchase / taxonomy” без ломки контрактов

### Наблюдения

- В `docs/qa.md` закреплены ключевые решения: **frontend-admin-v4 — основная админка**, freeze `/api/v1/admin/**` на breaking changes до запуска V4, additive-only изменения backend допустимы.
- Зафиксирован целевой контракт **AdminPurchaseLinkDto** и требование явно показывать в админке, что импортированное событие продаётся **вне Daibilet** (виджет/редирект), без выдумывания данных из UI.

### Решения

- Добавлен отдельный журнал инцидентов операционки: `docs/reports/admin-v4-incidents.md` (не смешиваем с архитектурным `Diary.md`).
- В Admin V4 добавлен thin adapter `deriveImportedPurchaseDisplay` (read-only вывод на базе текущего `EventDetailDto`) + блок «Покупка (импорт)» на обзоре события + эвристика readiness для «ссылки покупки» с явной ссылкой на gap и `docs/qa.md` (без новых backend endpoint’ов в этом шаге).

### Проблемы

- До появления additive `AdminPurchaseLinkDto` в `GET /admin/events/:id` невозможна честная проверка deeplink/widgetPayload; UI остаётся честно «partial/эвристика».

---

## 2026-04-30 — Канон интеграции: Admin V4 + существующий backend (не greenfield)

### Решения

- Зафиксирован отдельный документ `docs/product/admin-v4-integration-principles.md`: Lovable/V4 — только UX и контракт экрана; Prisma и `/api/v1/admin/**` не заменяются «идеальной» схемой из ТЗ; изменения только additive; импорт/source read-only; typed client после стабилизации DTO.

### Наблюдения

- Это явное разрешение с формулировкой из Lovable ТЗ «UI как источник правды» → у нас слой «форма экрана», данных и контрактов рантайма остаётся backend + freeze из `docs/qa.md`.

---

## 2026-04-30 — Документация: карта Lovable TZ ↔ Admin V4 ↔ Nest `/admin`

### Решения

- Добавлен якорный документ `docs/product/lovable-admin-contract-map.md`: таблицы маршрутов SPA, фактических API-модулей и целевых имён ресурсов из Lovable ТЗ, плюс правила additive изменений и замороженные экраны.
- В `docs/qa.md`, `docs/Project.md`, `docs/README.md` добавлены ссылки на этот документ как на операционную карту контрактов.
