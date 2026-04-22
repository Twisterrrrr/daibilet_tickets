# Дневник проекта (актуальный)

Цель: фиксировать историю изменений через призму **наблюдений / решений / проблем**.  
Старые записи (legacy): `archive/process/legacy-folders-process/Diary.md`.

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
