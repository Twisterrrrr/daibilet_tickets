# Admin V4 Imported Sales — Runbook (операции)

Документ описывает ежедневные проверки и типовые реакции для **Admin V4** в текущем замороженном scope Imported Sales (read-only контрольная панель).

Цель: оператор быстро понимает «каталог жив / импорты живы / где болит / что делать дальше», не влезая в разработку.

---

## Контуры и источники данных (куда смотрим)

- **Dashboard**: `Admin V4 → Dashboard`  
  Основной «сводный» экран. Важен как **индикатор** деградаций, а не как абсолютная истина.
- **Import Sources**: `Admin V4 → Источники импорта`  
  Реестр интеграций и их состояние/ошибки.
- **Sync Health**: `Admin V4 → Здоровье синхронизации`  
  Метрики синка каталога + очереди.
- **Mapping Inbox**: `Admin V4 → Очередь маппинга`  
  Правила маппинга категорий + неизвестные категории.
- **External Orders**: `Admin V4 → Внешние заказы`  
  Read-only зеркало заказов провайдеров.
- **Events / Venues / Cities / Landings / Collections**: list/detail, read-only.
- **SEO Audit**: диагностика контента/SEO (soft gate).
- **Audit Log**: журнал административных действий (если включён endpoint).

---

## Daily operator checklist (15–30 минут)

### 1) Быстрый health-check (Dashboard)

- **Открыть Dashboard**
  - Если видите **partial** + предупреждения — зафиксировать, какие источники недоступны.
  - Если есть явные аномалии (скачок missingVenue/missingPurchaseLink, рост stale sources, просадка published) — перейти к соответствующим чеклистам ниже.

### 2) Import source health

- **Открыть Import Sources**
  - Проверить интеграции **Ticketscloud** и **Teplohod.info**:
    - `consecutiveErrorCount == 0`
    - `lastSuccessAt` не слишком старый (см. stale handling)
    - `openIssuesCount` не растёт резко

### 3) Sync Health

- **Открыть Sync Health**
  - Очередь sync не должна «застревать»:
    - `active + waiting` не растут бесконечно
    - `failed` не увеличивается стабильно
  - `lastSyncAt` должен обновляться с ожидаемой частотой (зависит от режима импорта/инкремента).

### 4) Mapping Inbox

- **Открыть Mapping Inbox**
  - `Unknown categories` и `Unknown hits (sum)`:
    - рост unknown hits → сигнал, что пришли новые категории/опечатки/изменения у провайдера
    - рост правил при нуле unknowns — нормальный результат «расшивки»

### 5) External Orders check

- **Открыть External Orders**
  - Проверить, что лента обновляется (есть «recent» за сутки, если ожидаем трафик/импорт).
  - По provider/status: убедиться, что нет массового «CANCELLED/FAILED» (в рамках зеркала).

### 6) Event publish checklist (read-only readiness)

- **Открыть Events**
  - Проверить фильтры:
    - `active=true` (published)
    - `missingPurchaseLink=true` (если есть)
    - `hasFutureSessions=true` (если используется)
  - Цель: быстро увидеть «каталог готов к продаже» на уровне сигналов, без ручной публикации из V4.

---

## Import source health checklist (подробно)

### Сигналы деградации

- `consecutiveErrorCount > 0`
- `lastSuccessAt` отсутствует или «слишком старый»
- `openIssuesCount` растёт из дня в день
- в Sync Health растёт `failed`

### Что делать (оператор)

- Зафиксировать:
  - какой provider
  - время последнего успеха
  - краткое описание последнего run/issue (если видно)
- Передать в разработку/онколл:
  - скрин/текст состояния + временной диапазон
  - если UI показывает `requestId` при ошибке — приложить его

---

## Mapping inbox checklist

### Когда это срочно

- `Unknown hits (sum)` резко вырос за сутки
- Unknown’ы имеют высокие hits и продолжают расти

### Что делать (оператор)

- Собрать 5–10 top unknown по hits (source + externalCategoryRaw + externalCategoryNorm).
- Если есть очевидный маппинг — завести задачу на добавление правила (в текущем scope V4 это **не делается из UI**).

---

## Event publish checklist (минимальная интерпретация)

Важно: Admin V4 сейчас **не публикует**, а только показывает read-model.

### «Каталог готов» (операционная эвристика)

- `published events` не падает
- `missing venue` близко к нулю или не растёт
- `missing purchase link` не растёт аномально
- `hasFutureSessions=true` даёт достаточно событий для продаж на ближайшие дни

---

## External orders check (операционная эвристика)

- `recent external orders count` на Dashboard:
  - если **0** при ожидаемом импорте — подозрение на остановку импорта/вебхуков/коннектора.
- В External Orders:
  - фильтр `status=OPEN` (pending) не должен «залипать» навечно (сигнал проблем у провайдера или интеграции).

---

## Dashboard interpretation (как читать)

### Общие правила

- Dashboard — это **агрегация read-model**, часть сигналов может быть `N/A`.
- `partial` означает, что хотя бы один источник/endpoint недоступен, и часть значений может быть неполной.

### Блоки

- **Catalog Readiness**
  - `events_total`, `events_published`
  - `events_missing_venue`
  - `events_missing_purchase_link`
- **Landing Traffic Engine**
  - `landings_total`, `landings_published`
  - `landings_missing_seo`
  - `landings_city_count`, `landings_multi_city_count`
- **Import Health**
  - `open sync issues`
  - `stale source count` (24h threshold)
- **External Orders Feed**
  - `recent`, `confirmed`, `pending`, `cancelled`

---

## Stale source handling (24h threshold)

### Что считается stale

- Интеграция, у которой `lastSuccessAt` отсутствует **или** старше 24 часов.

### Типовые причины

- у провайдера изменились токены/права
- лимиты API/бан
- падение воркеров/очередей
- фатальная ошибка в адаптере

### Что делает оператор

- Подтвердить stale в **Import Sources** (последний успех) и **Sync Health** (очереди/failed).
- Эскалировать в разработку с:
  - provider, integration id/name
  - lastSuccessAt
  - concurrent errors / issues count
  - период, когда «сломалось»

---

## Common failure cases (симптом → куда смотреть)

- **Dashboard: partial + warnings**
  - проверить конкретные endpoints (обычно импорт/seo/ops), затем Sync Health
- **Списки пустые, но ошибок нет**
  - проверить фильтры URL (q/status/city) и статус синка
- **Ошибка 403 (Доступ запрещён)**
  - это RBAC/роль. В рамках scope: попросить доступ/роль, не лечить «в UI».
- **Ошибка 500 / network**
  - повторить запрос, приложить `requestId` (если есть), зафиксировать время
- **Sync Health: растёт failed**
  - подозрение на деградацию воркеров/инфры/адаптера → эскалация

