# Спецификация: Админка событий — готовность, расписание, мультисобытия, SEO-аудит

> Финальная спецификация (март 2026). Референс UX: Teplohod.info.  
> **Scope:** только события, создаваемые через админку/ЛК Daibilet (импортируемые передаются как есть).

---

## 1. Готовность события и причины неактивности

### On-demand, без записи в БД

**Проблема:** `validateForPublish` вызывается только при POST `/publish` → редактор видит причины поздно, они устаревают.

**Решение:** эндпоинт on-demand, считать «на лету», ничего не писать.

```
GET /admin/events/:id/quality
→ { isSellable: boolean, issues: [{ code, field, message, severity, tabKey }] }
```

Использовать `EventQualityService.validateForPublish()` (уже есть коды и field). Добавить маппинг field → tabKey.

### Маппинг field → tabKey (вкладка в EventEdit)

| field | tabKey |
|-------|--------|
| title, description, imageUrl, category | main |
| cityId, location | location |
| offers, NO_VALID_PRICE, MISSING_ACTIVE_OFFER | offers |
| sessions, NO_FUTURE_SESSIONS, END_DATE_PASSED | schedule |

### UX в админке

- **Баннер сверху:** «Неактивно: NO_FUTURE_SESSIONS, MISSING_ACTIVE_OFFER …» (коды), клик раскрывает список + кнопки «перейти к вкладке».
- **Подсветка вкладок** по tabKey.
- Checklist: каждый пункт кликабелен → переход на вкладку.

---

## 2. Ручное включение/выключение

### isHidden ≠ «активность»

- **isHidden** = ручное скрытие (переключатель «Скрыть/Показать»).
- **sellability** = вычисляемо (качество + будущие сеансы + валидные цены).
- **published/editorStatus** = статус редактора (если есть).

### UX — одна строка статуса

- **В каталоге:** Да/Нет — учитывает `!isHidden && isSellable && statusOk`.
- **Скрыто вручную:** Да/Нет (тумблер isHidden).
- **Причины неготовности:** список issues из GET /quality.

### Publish

- POST /admin/events/:id/publish — если isReady=false → 409 + issues; иначе ставит статус публикации.
- Кнопка Publish: disabled при blockingIssues, рядом «почему» + ссылка на checklist.

### MVP

- Никакого `forceActive` на MVP (иначе ломается quality gate).
- Кнопки: «Скрыть/Показать» (как сейчас), «Опубликовать».

---

## 3. Мультисобытия в админке

### Принцип

Мультисобытие — отдельная сущность «группы/серии». Без отдельного раздела редактор «слепой».

### Минимум

**A) В списке Events:**

- колонка `groupingKey` (или «Группа»)
- фильтр «показать только в группе»
- клик → список событий группы (боковая панель или отдельная страница)

**B) Раздел «Группы событий»:**

- список групп (groupingKey / slug)
- внутри: таблица «варианты» (город → event → ближайший сеанс → статус качества)

Обычное событие: «Входит в группу: <GroupTitle>» (ссылка) + «выйти из группы» (с правами).

---

## 4. Раздел SEO-аудит

### Структура

- **Дашборд:** индексируемые страницы, 404/500, редиректы, thin content, дубли meta, страницы без OG/schema.
- **Рекомендации как задачи:**
  - type: content | technical | indexing | internal links | schema
  - severity: blocking | high | medium | low
  - entity: city | event | multievent | article | landing
  - why, fix, action link, status (open | in_progress | done | ignored)

### MVP

- Генерация рекомендаций из данных + краулер по sitemap.
- Таблица `seo_issues`.
- Список задач в админке с фильтрами.

---

## 5. Расписание событий — Teplohod-style (только MANUAL события)

### Важно

- **Слот = EventSession** в рамках Event. Ни slug, ни SEO, ни отдельной страницы.
- **Draft** только в UI (до сохранения — не пишем в БД).
- **Таблица:** дата × часы (00–23), группировка на фронте: date → hour → [sessions].

### Целевой MVP-набор полей

**Цель:** не ломать схему и импорт, быстро v1, прямой путь к v2 без переделок БД.

| Концепт | Поле | Решение |
|---------|------|---------|
| Статус | `isActive` + `canceledAt`, `cancelReason` | Пауза = isActive false. CANCELED = canceledAt IS NOT NULL. Enum позже. |
| Время | `startsAt` | Не переименовывать. |
| Вместимость | `Event.defaultCapacityTotal`, `EventSession.capacityTotal?` | Без capacityByCategory в MVP. |
| soldCount | **computed** | Из PackageItem (BOOKED+CONFIRMED), одним агрегатным запросом по диапазону. GET sessions возвращает soldCount в каждом сеансе. |
| locked | **computed** | `soldCount > 0`, не поле в БД. |
| offerId | nullable | MANUAL-сессия может без offerId. Событие не sellable, пока нет активного оффера (quality gate). |
| tcSessionId | `manual-{uuid}` | При batch-create, unique. |

**Event:** `defaultCapacityTotal Int?`

**EventSession:** `startsAt`, `isActive`, `canceledAt`, `cancelReason`, `capacityTotal?`, `offerId?`, `tcSessionId`

### API (использовать sessions, не occurrences)

| Метод | Описание |
|-------|----------|
| GET /admin/events/:id/sessions?from&to | Список сеансов + soldCount (один агрегат по диапазону, без N+1) |
| POST /admin/events/:id/sessions/batch-create | Создание пачкой после модалки минут |
| PATCH /admin/sessions/:id | pause/resume (isActive), startAt (move если sold=0) |
| PATCH /admin/sessions/:id/capacity | Изменение capacityTotal; ограничение: ≥ soldCount |
| DELETE /admin/sessions/:id | Только soldCount=0 |
| POST /admin/sessions/:id/cancel | sold>0 → refunds |
| GET /admin/sessions/:id/tickets | Список билетов (PackageItem по sessionId) |

### DTO batch-create

```ts
// POST /admin/events/:id/sessions/batch-create
{ sessions: [{ startAt: "2026-05-09T21:00:00Z", capacityTotal?: 142 }] }
// startAt — полный datetime (дата+час+минуты из модалки)
```

### Создание: час → отметки → минуты → сохранить

1. Выбор часа (21).
2. Клик по ячейкам (v1) или клик/drag/ctrl-brush (v2) → черновики в UI (date, hour, minute=null).
3. Кнопка «Подтвердить слоты (N)» → модалка «Минуты».
4. В модалке: для каждого — минуты (00–59), опционально capacity; «применить всем».
5. Сохранение → POST batch-create с `startAt = date + hour:minute`.

**Поэтапность:** PR2 = v1 без drag (клик + модалка + batch-create + контекстное меню). PR2.5/PR5 = v2 (drag, ctrl-brush, RMB-ластик). Те же endpoints и EventSession — v2 только UI.

### Редактирование, Модель A

**soldCount = 0:**
- Пауза/Возобновить, Перенести (drag в v2), Удалить, Места.

**soldCount > 0:**
- Пауза/Возобновить, Отменить (+ refunds), Места (только ≥ sold), Список билетов.
- ❌ Удалить, ❌ Перенести — запрещено.

**capacityTotal:** при редактировании — нельзя ниже soldCount.

### RMB ластик (v2)

- Черновик: убрать.
- Сеанс, sold=0: пометить к удалению.
- sold>0: ничего, подсказка «есть продажи — только отмена».

### Производительность публичной страницы

- Одна страница события + расписание по диапазону (без размножения URL).
- Кэш: контент 5–30 мин, расписание 30–120 сек.
- Расписание: GET /events/:slug/sessions?from&to, не тянуть все сессии в SSR.

### 5.1 Финальная модель MVP (БД vs вычисляемое)

**В БД**

| Таблица | Поле | Тип |
|---------|------|-----|
| Event | defaultCapacityTotal | Int? |
| EventSession | startsAt | DateTime |
| EventSession | isActive | Boolean @default(true) |
| EventSession | canceledAt | DateTime? |
| EventSession | cancelReason | String? |
| EventSession | capacityTotal | Int? |
| EventSession | offerId | String? |
| EventSession | tcSessionId | String @unique |
| EventSession | @@unique([eventId, startsAt]), @@index([eventId, startsAt]) | |

**Вычисляется (НЕ хранится)**

- `soldCount` — из PackageItem (BOOKED + CONFIRMED)
- `locked` = soldCount > 0
- `CANCELED` = canceledAt IS NOT NULL

Производные состояния не дублируем в БД.

### 5.2 Агрегация soldCount (ключевой момент)

- **Только** статусы BOOKED + CONFIRMED
- **Только** PackageItem для конкретного EventSession
- **Один запрос** по диапазону (без N+1)

**Рекомендованный SQL** для GET /admin/events/:id/sessions?from&to:

```sql
SELECT
  s.id,
  s."startsAt",
  s."isActive",
  s."canceledAt",
  s."capacityTotal",
  s."tcSessionId",
  COALESCE(SUM(pi."adultTickets" + pi."childTickets"), 0)::int AS sold_count
FROM "event_sessions" s
LEFT JOIN "package_items" pi
  ON pi."sessionId" = s.id
  AND pi.status IN ('BOOKED', 'CONFIRMED')
WHERE s."eventId" = $1
  AND s."startsAt" BETWEEN $2 AND $3
GROUP BY s.id;
```

O(1) запрос на диапазон, без дополнительного поля в БД. В проекте колонки в camelCase (без @map).

### 5.3 Модель A (строгая логика)

| Условие | delete | move (startsAt) | pause | cancel | capacityTotal |
|---------|--------|-----------------|-------|--------|---------------|
| soldCount = 0 | ✓ | ✓ | ✓ | ✓ | свободно |
| soldCount > 0 | ❌ | ❌ | ✓ | ✓ | ≥ soldCount |

- `isActive = false` ≠ canceled. Cancel — юридическое действие (далее refunds).
- locked: запрет delete и move.

### 5.4 Sellability при nullable offerId

Событие **sellable**, если:

- есть ≥ 1 будущий session
- session.isActive = true
- session.canceledAt IS NULL
- есть хотя бы один ACTIVE offer (как сейчас)

MANUAL-сессия без offerId может существовать, но не продаётся, пока нет оффера.

### 5.5 Именование колонок (camelCase)

В проекте БД использует camelCase (`defaultCapacityTotal`, `capacityTotal`, `canceledAt`, `cancelReason`). Prisma — без @map. Не смешивать snake_case и camelCase.

### 5.6 Чек и фиксы перед merge PR2

**Порядок миграций PR2:**

1. **20260301170000_pre_unique_safety** — индексы package_items, backfill tcSessionId, детектор дублей (NOTICE)
2. **20260301180000_admin_schedule_capacity** — defaultCapacityTotal, capacityTotal, canceledAt, cancelReason, UNIQUE(eventId, startsAt)

| Проверка | Действие |
|----------|----------|
| Индекс `package_items(sessionId)` | Миграция pre-unique-safety; см. SQL ниже при ручной проверке |
| Индекс `event_sessions(eventId, startsAt)` | Есть в миграции 20260302160000_event_grouping_indexes |
| Пустые `tcSessionId` | Backfill в pre-unique-safety |
| Дубликаты (eventId, startsAt) | Детектор в pre-unique-safety (NOTICE); разрешить вручную до admin_schedule_capacity |

**1) Индекс package_items(sessionId)**

```sql
-- Проверка
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'package_items' AND indexdef ILIKE '%(sessionId%';
```

Если индекса нет — миграция (в транзакции Prisma — без CONCURRENTLY; для production вручную — CONCURRENTLY):

```sql
CREATE INDEX IF NOT EXISTS "package_items_sessionId_idx" ON "package_items" ("sessionId");
-- Оптимально для агрегации soldCount (фильтр по status):
CREATE INDEX IF NOT EXISTS "package_items_sessionId_status_idx" ON "package_items" ("sessionId", "status");
```

**2) Backfill пустых tcSessionId**

```sql
-- Проверка
SELECT COUNT(*) FROM "event_sessions" WHERE "tcSessionId" IS NULL OR btrim("tcSessionId") = '';

-- Починка (перед unique constraint)
UPDATE "event_sessions"
SET "tcSessionId" = CONCAT('import-', id)
WHERE "tcSessionId" IS NULL OR btrim("tcSessionId") = '';
```

**3) Дубликаты (eventId, startsAt)**

```sql
SELECT "eventId", "startsAt", COUNT(*) AS cnt
FROM "event_sessions"
GROUP BY "eventId", "startsAt"
HAVING COUNT(*) > 1 ORDER BY cnt DESC;
```

Если найдены: удалить мусор или разрулить (например оставить isActive=true, остальные isActive=false). Решать вручную до миграции.

### 5.7 Совместимость PR1 и PR2

PR1 и PR2 не конфликтуют, если: **PR1 не пишет в БД**, **PR2 не меняет критерии sellability**, а только добавляет данные/UX для сессий.

**Критическое правило — источник истины для quality в UI:**

- EventEdit **всегда** читает качество из **GET /admin/events/:id/quality** (on-demand).
- **Не использовать** EventOverride.qualityIssues / qualityCheckedAt как источник для баннера и подсветки вкладок.
- POST /publish может продолжать писать persisted quality (как есть), но UI опирается только на GET /quality — иначе расхождение баннера с реальным состоянием.

**Чек-лист совместимости**

| Контракт | Требование |
|----------|------------|
| tabKey `schedule` | PR1 маппинг field → tabKey; PR2 не переименовывает без обновления маппинга. |
| Источник sessions | NO_FUTURE_SESSIONS проверяет EventSession.startsAt — те же сущности, что редактирует PR2. |
| Scope MANUAL | Расписание — только MANUAL. См. ниже про импортные. |
| Publish flow | PR1 и PR2 не меняют publish — иначе риск расхождений. |

**Импортные события и вкладка Schedule**

Для `sourceType != MANUAL` или `SupplierAccessMode = READONLY` подсветка PR1 не должна вводить в заблуждение:

- вкладка Schedule: **read-only** ИЛИ **скрыта**;
- если скрыта — клик по tabKey=schedule ведёт на блок с текстом «Расписание управляется поставщиком».

**Последовательность:** PR1 (quality endpoint + UI с пустой заглушкой schedule) → PR2 (контент вкладки «Расписание»). После PR2 подсветка ведёт в реальный UI.

---

## 6. План PR (без философии)

> **Cursor Auto Pipeline:** `docs/AdminSchedulePipeline.md` — разбивка PR1→PR4 на подзадачи с AC, UX и no-regress правилами.

**PR2 архитектурно безопасен:** нет новых enum-статусов, триггеров, materialized aggregates, сложных миграций, переименований колонок. Drag/brush/ластик не трогаем в PR2 — low risk.

| PR | Scope |
|----|-------|
| **PR1** | Readiness: GET /admin/events/:id/quality (on-demand). UI: верхний статус-блок, checklist, подсветка вкладок, кнопка Publish. |
| **PR2** | Расписание v1: таблица date×00–23, клики → черновики, модалка минут, batch-create, контекстное меню, Модель A. Без drag/brush/ластик. |
| **PR2.5/PR5** | Расписание v2: drag, ctrl-brush, RMB-ластик (те же endpoints). |
| **PR3** | Колонка groupingKey + фильтр в Events. Раздел «Группы событий» + просмотр вариантов. |
| **PR4** | /admin/seo-audit, GET /admin/seo/audit, списки ошибок + ссылки «исправить». |
