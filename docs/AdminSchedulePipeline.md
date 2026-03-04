# Cursor Auto Pipeline: PR1→PR4

> Пайплайн задач для Cursor с границами PR, критериями приёмки и no-regress правилами.  
> Спецификация: `docs/AdminScheduleSpec.md`.

**Общие правила (вшить в промпт):**

- Quality UI = только GET /quality (persisted EventOverride не использовать — AdminScheduleSpec §5.7)
- Импортные события: расписание read-only
- PR2 v1 без drag; drag/ctrl-brush/RMB — отдельный PR2.5/PR5 без изменений БД/эндпоинтов
- Везде camelCase в БД и Prisma без @map (как в спеке)
- Не менять публичные URL, не плодить страницы слотов
- Никаких изменений критериев sellability в PR2 — только инструмент редактирования расписания

**PR1↔PR2 — конфликтов нет** (AdminScheduleSpec §5.7): PR1 не пишет в БД, PR2 не меняет sellability, tabKey=schedule валиден. Единственный риск — если кто-то начнёт использовать persisted qualityIssues в UI. **Запрещено.**

**Стратегия выполнения:** PR1 backend → PR1 frontend → PR2-0 DB safety → PR2 backend → PR2 frontend → PR3/PR4. **PR2 UI нельзя начинать без готовых endpoints.**

---

## PR1 — Quality (on-demand) + UI подсветка

### PR1-1 Backend: GET /admin/events/:id/quality

**Файлы:** `admin-events.controller.ts`, `event-quality.service.ts` (или где validateForPublish), `dto/event-quality.dto.ts`

**Задачи:**
- Endpoint GET /admin/events/:id/quality
- Вызов EventQualityService.validateForPublish(eventId)
- Ответ: `{ isSellable, issues: [{ code, field, message, severity: 'BLOCKING'|'WARNING', tabKey }] }`
- Реализовать mapping field → tabKey (main | location | offers | schedule)
- **Запрет:** не читать/не писать EventOverride.qualityIssues/qualityCheckedAt

**AC:** Endpoint <300ms, tabKey всегда заполнен, работает для MANUAL и импортных. Никаких изменений в БД.

### PR1-2 Backend: unit tests

- Тесты маппинга field→tabKey
- Тесты: отсутствие будущих сессий → tabKey=schedule
- Тесты: offers → tabKey=offers

### PR1-3 Frontend: QualityBanner + tab badges

**Файлы:** `EventEdit.tsx`, `components/events/quality/QualityBanner.tsx`, `lib/api/adminEventsQuality.ts`

**UX (обязательно):**
- Визуально отдельный блок сверху формы
- Счётчик проблем
- Раскрытие списка (кнопка «Показать причины»)
- Каждая причина: человекочитаемый текст + кнопка «Перейти» → вкладка по tabKey + скролл
- Badge count проблем по tabKey на вкладках
- Для импортных: если issue → schedule и schedule read-only → хинт «read-only»

**Нельзя допустить:** просто список текстом без навигации; вывод только кодов без человекочитаемого текста.

**AC:** UI только из GET /quality. Никаких зависимостей от PR2.

### PR1-4 Frontend: статусная строка

**UX:**
- «В каталоге: Да/Нет»
- «Скрыто вручную: Да/Нет» (toggle)
- «Причины: N»

**AC:** isHidden ≠ активность. Переключатель не ломает качество.

### PR1-5 Non-regress

- Линт/типизация
- Smoke: EventEdit → баннер + подсветка вкладок

---

## PR2 — Расписание v1 (без drag)

### PR2-0 DB pre-unique safety

- Индексы package_items(sessionId[,status])
- Backfill пустых tcSessionId
- Проверка дублей (eventId, startsAt)

**AC:** БД готова к unique constraint. Миграция `20260301170000_pre_unique_safety`.

### PR2-1 Prisma + миграция

**Файлы:** `schema.prisma`, миграция `20260301180000_admin_schedule_capacity`

- Event.defaultCapacityTotal Int?
- EventSession: capacityTotal, canceledAt, cancelReason
- tcSessionId unique, @@unique([eventId, startsAt]), @@index([eventId, startsAt])
- startsAt не переименовывать, offerId nullable

**AC:** Никаких enum/триггеров/materialized aggregates.

### PR2-2 Backend: range sessions + soldCount

**Endpoint:** GET /admin/events/:id/sessions?from&to

- sessions в диапазоне
- soldCount — один агрегатный запрос (BOOKED+CONFIRMED)
- locked = soldCount > 0
- Поля: id, startsAt, isActive, canceledAt, capacityTotal, tcSessionId, soldCount, locked

**AC:** Один запрос на диапазон, <300ms на 30 дней. Корректный soldCount.

### PR2-3 Backend: batch-create + операции Model A

**Endpoints:**
- POST /admin/events/:id/sessions/batch-create
- PATCH /admin/sessions/:id (pause/resume)
- PATCH /admin/sessions/:id/capacity
- DELETE /admin/sessions/:id
- POST /admin/sessions/:id/cancel
- GET /admin/sessions/:id/tickets (stub)

**batch-create:**
- Вход: `{ sessions: [{ date, hour, minute?, capacityTotal? }] }` (или `startAt` полный datetime)
- Per-item validation: minute 0–59, duplicate (eventId, startsAt)
- **Per-item результат** (для v2 конфликтов): не падать целиком при частичных ошибках
- Рекомендуемый формат ответа: `{ results: [{ tempId, ok, sessionId? }, { tempId, ok: false, code, message }] }`

**Model A:** soldCount>0 → нельзя delete, нельзя менять startsAt; capacityTotal ≥ soldCount; можно pause/resume/cancel. tcSessionId = manual-{uuid}.

**AC:** Модель A строго. Move в v1 не нужен. batch-create возвращает per-item результаты.

### PR2-4 Frontend: вкладка «Расписание» v1

**Компоненты:** EventScheduleTab, ScheduleGrid, SessionPill, MinutesModal, SessionMenu, CapacityModal

**Критический UX (иначе сломается):**
- **Массовое создание:** черновики в state, один batch-create в конце. **Никаких POST на каждый клик.**
- Если сделать «клик → сразу POST», UX будет неудобным.

**UX:**
- Фильтр диапазона дат (From/To, пресеты 7/14/30 дней)
- Sticky header часов (при диапазоне 30 дней без sticky UX сломается)
- Таблица: строки = даты, столбцы = 00–23
- Селектор часа 00–23
- Hover у ячеек при активном часе: подсказка «+ создать»
- Клик по ячейкам → draftSlot (minute=null)
- Панель «Черновики: N» + «Задать минуты»
- Модалка минут: дата + HH:[минуты], 00–59, «применить всем»
- Контекстное меню: pause/resume, capacity, tickets, delete (sold=0), cancel (sold>0)
- **Цветовая система плашек:** active | paused | canceled | locked (иначе таблица нечитаема)
- **Model A UX:** soldCount>0 → delete и move disabled + tooltip «есть продажи»; cancel остаётся доступен. Должно быть визуально понятно, не только через 400/409 от бэка.
- Маркеры: sold/capacity, замок если locked, paused/canceled badge

**DraftSlot:**
```ts
type DraftSlot = {
  tempId: string;
  date: string;       // YYYY-MM-DD
  hour: number;       // 0..23
  minute: number | null;
  capacityTotal: number | null;
};
```

**AC:** N слотов за час → массово минуты. Несколько плашек в ячейке. Model A disabled + tooltip.

### PR2-5 PR1 compatibility + Import events

- QualityBanner schedule → вкладка «Расписание»
- **Импортные (sourceType != MANUAL):** вкладка Schedule read-only, текст «Расписание управляется поставщиком». Если quality ведёт в schedule → тот же текст. AdminScheduleSpec §5.7.

**AC:** READONLY без возможности редактирования.

### PR2 Code Review Checklist (перед merge)

**A. DB / миграции**
- [ ] Только MVP-поля: Event.defaultCapacityTotal, EventSession.capacityTotal, canceledAt, cancelReason, unique tcSessionId, unique (eventId, startsAt)
- [ ] Нет переименований колонок (startsAt остаётся)
- [ ] Индекс event_sessions(eventId, startsAt) есть (не дублируется)
- [ ] Индекс package_items(sessionId) и желательно (sessionId, status)
- [ ] Нет пустых tcSessionId (или backfill выполнен)
- [ ] Нет дублей (eventId, startsAt) (или устранены)
- [ ] tcSessionId для MANUAL = manual-{uuid}, уникален

**B. Backend API**
- [ ] GET sessions возвращает: id, startsAt, isActive, canceledAt, capacityTotal, tcSessionId, soldCount, locked
- [ ] soldCount — один агрегатный запрос (без N+1)
- [ ] locked не в БД, вычисляется soldCount>0
- [ ] batch-create: per-item validation (minute 0–59), per-item ошибки (duplicate), не падает целиком
- [ ] DELETE при soldCount>0 запрещён
- [ ] Изменение startsAt при soldCount>0 запрещено (защита на сервере)
- [ ] PATCH capacity: capacityTotal ≥ soldCount
- [ ] POST cancel: canceledAt, cancelReason
- [ ] validateForPublish() не меняется

**C. Frontend UX**
- [ ] Вкладка «Расписание» для MANUAL, read-only для импортных
- [ ] Таблица: даты × 00–23, несколько плашек в ячейке
- [ ] Диапазон + пресеты 7/14/30 дней, выбор часа
- [ ] Клик → draft, без сетевого запроса
- [ ] Панель «Черновики: N» → MinutesModal
- [ ] MinutesModal: минуты 00–59, «применить всем», per-row ошибки
- [ ] Плашка: HH:MM, sold/capacity, paused/canceled, lock
- [ ] Контекстное меню: pause/resume, capacity, tickets, delete (sold=0), cancel (sold>0)
- [ ] Model A: запрещённые действия disabled + tooltip

**D. Перформанс**
- [ ] 30 дней — один запрос, без N+1
- [ ] Ошибки API: toast + подсветка в модалке
- [ ] TZ консистентен (admin TZ зафиксирован)

**E. PR1 совместимость**
- [ ] QualityBanner schedule → вкладка «Расписание»
- [ ] UI качества только из GET /quality

---

## PR2.5 / PR5 — Расписание v2 (drag/brush/erase, без изменений бэкенда)

**Цель:** те же endpoints PR2, только UI-слой. Бэкенд без изменений.

### PR2.5-1 Draft overlay + pending delete

- pendingDeletes: Set&lt;sessionId&gt;
- Стиль «to be deleted» (перечёркнуто, badge УДАЛИТЬ)
- Панель изменений: «+N новых, −M удалений» + [Применить] [Отменить]

### PR2.5-2 Batch apply orchestration

- Apply = batch-create → delete
- Per-item ошибки → error state в draftSlots, подсветка
- Формат ответа batch-create (должен быть в PR2): `{ results: [{ tempId, ok, sessionId? }, { tempId, ok: false, code, message }] }`

### PR2.5-3 Interaction layer (drag/brush/erase)

**Режимы:** mode: 'idle' | 'paint' | 'erase' | 'move'

**Paint (ЛКМ drag):** старт на ячейке выбранного часа → pointermove по датам → draftSlots, visitedDates Set против дублей.

**Ctrl-brush:** Ctrl+drag = stamp по датам, Ctrl+click = один draftSlot.

**RMB erase:** draft → удалить draft; existing sold=0 → toggle pending delete; existing sold>0 → tooltip «есть продажи». Без сетевых запросов.

**Move:** в v2 не делать (требует endpoint). Либо v3, либо delete+create (теряется sessionId).

### PR2.5-4 Inline конфликт-редактор

- Конфликтная draft-плашка: красная, badge КОНФЛИКТ, tooltip
- Клик → mini-popover «Минуты: [15] [Сохранить]» — меняем state, сохранение при следующем Apply
- MinutesModal: строка с ошибкой подсвечена

### Wireframe v1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Диапазон: [2026-03-01]—[2026-03-30]  (7д)(14д)(30д)  [Обновить]             │
│ Активный час: [21▼]    Черновики: 12   [Задать минуты] [Очистить]           │
└─────────────────────────────────────────────────────────────────────────────┘
Легенда: ● ACTIVE   ▌PAUSED   ✖ CANCELED   🔒 есть продажи

┌──────────┬──00──┬ ... ┬──21──────────────────────────┬──22──┬──23──┐
│ 01.03 Пн │      │     │ 21:00 18/142 🔒               │      │      │
│ 02.03 Вт │      │     │ 21:15  0/142                  │      │      │
│          │      │     │ 21:45 PAUSED 0/142            │      │      │
│ 03.03 Ср │      │     │ [черновик 21:—]               │      │      │
└──────────┴──────┴─────┴──────────────────────────────┴──────┴──────┘
```

### Wireframe v2 (с превью и конфликтами)

```
│ Изменения: +12  −3   Ошибки: 2    [Задать минуты] [Применить] [Отменить]   │

┌──────────┬──21─────────────────────────────────────────────────┬──22──┐
│ 02.03 Вт │ 21:00 18/142 🔒  21:15 0/142  21:45 PAUSED 0/142    │      │
│ 03.03 Ср │ [DRAFT] 21:—  (пунктир)                              │      │
│ 04.03 Чт │ [DRAFT] 21:00  (пунктир)                              │      │
│ 05.03 Пт │ 21:30 0/142 [УДАЛИТЬ] (перечёркнуто)                 │      │
│ 06.03 Сб │ [КОНФЛИКТ] 21:15  (красный)                          │      │
└──────────┴─────────────────────────────────────────────────────┴──────┘
```

### MinutesModal wireframe

```
┌──────────────────── Минуты ────────────────────┐
│ Применить всем минуты: [00] [Применить]         │
│ (опц.) Применить всем места: [142] [Применить]  │
│ Дата        Время        Места    Ошибка        │
│ 02.03       21:[00]      [142]                  │
│ 03.03       21:[15]      [142]  (уже есть 21:15)│
│ 04.03       21:[45]      [120]                  │
│ [Удалить выбранные]              [Сохранить]    │
└─────────────────────────────────────────────────┘
```

### Контекстное меню плашки (sold>0)

```
21:00  sold 18/cap 142  🔒
- Поставить на паузу
- Изменить места
- Список билетов
- Отменить (с возвратами)
(Удалить и Перенести — скрыты/disabled)
```

---

## PR3 — Мультисобытия

### PR3-1 Events list: groupingKey + фильтр

- Колонка «Группа»
- Фильтр «в группе/без группы»
- Клик → список событий группы

### PR3-2 Раздел «Группы событий»

- Список групп
- Деталь: варианты по городам + ближайший сеанс + статус качества

**AC:** Только админский UX, не менять публичные страницы.

---

## PR4 — SEO-аудит MVP

### PR4-1 Backend: GET /admin/seo/audit

- Пустые meta title/description, дубли, пустые OG, canonical
- Агрегаты + списки сущностей с ссылками

### PR4-2 seo_issues (опционально)

- Prisma model + миграция
- CRUD: mark done/ignored

### PR4-3 Frontend: /admin/seo-audit

- Дашборд (счётчики)
- Список проблем + severity + ссылка «исправить»
- Статусы open/done/ignored

---

## Порядок выполнения

**Строгая последовательность:**

1. **PR1 backend:** PR1-1 → PR1-2
2. **PR1 frontend:** PR1-3 → PR1-4 → PR1-5
3. **PR2-0 DB safety** (индексы, backfill, дубли)
4. **PR2 backend:** PR2-1 → PR2-2 → PR2-3
5. **PR2 frontend:** PR2-4 → PR2-5 *(только после готовых endpoints)*
6. **PR3:** PR3-1 → PR3-2
7. **PR4:** PR4-1 → PR4-2 (если нужно) → PR4-3
8. **PR2.5 (v2):** PR2.5-1 → PR2.5-2 → PR2.5-3 → PR2.5-4 *(только после PR2, без изменений бэкенда)*
