# План внедрения: Event Master + расписание (Admin V2 → API)

**Статус:** зафиксирован для команды.  
**Связь:** продуктовый контракт — [Event-Sessions-Product-Contract.md](./Event-Sessions-Product-Contract.md) §2.3, §11; roadmap — `Tasktracker.md` (`roadmap-s2-dual-run`, эпик Event + Sessions).  
**Сценарные данные:** [packages/backend/prisma/seed-scenarios.ts](../packages/backend/prisma/seed-scenarios.ts) (`pnpm --filter @daibilet/backend db:seed:scenarios`).

---

## 1. Цель и границы

- **Цель:** мастер создания/редактирования **сущности Event** с вкладкой **расписания** (SCHEDULED: разовое / повторяющееся; OPEN_DATE: без сеансов), согласованный с доменом и админкой.
- **Вне эпика:** полноценный редактор **Venue**, нормализованная модель категорий цен (oldPrice, weekday, groupSize — см. `Tasktracker.md`, domain-offer-*), отдельный слой «слабый контент» в quality.
- **Граница визард vs карточка:** в визарде сетка = **генератор стартов**; в **EventEdit / ScheduleTab** = **редактор** существующего расписания (отмены, lock/sold, тяжёлые массовые операции).

---

## 2. Стратегия поставки: волна M (моки V2) → волна R (API)

| Волна | Содержание |
|-------|------------|
| **M** | Новый UI в **Admin V2** (dual-run по `Project.md`), данные через **мок-адаптер** (`EventMasterApi` / in-memory / фикстуры). Без обязательных изменений Prisma и без привязки legacy `EventCreate` к мокам. |
| **R** | Расширение backend, общий сервис слотов, supplier-паритет; **замена** реализации адаптера на HTTP; UI волны M по возможности **не переписывать**. |

### 2.1 Волна M — практика

- Общие **TypeScript-типы** контракта визарда и ответов create / batch-create (мок и API совместимы).
- Имитация сети (задержка, ошибки) для проверки состояний UI.
- Таймзона в моках: фиктивный IANA по `cityId` из справочника-мока; тот же контракт, что потом из `GET /admin/cities` (поле `timezone` у `City`).
- Опционально: второй мок-адаптер «supplier» с урезанными действиями (симуляция RBAC).

**Выход с M:** согласованный UX с референсом и макетом; отработаны три временные модели; загрузка/ошибки понятны.

### 2.2 Волна R — практика

- Минимальный diff в UI: смена адаптера + граничные кейсы API (лимит слотов, конфликты).
- Полный редактор расписания по-прежнему в legacy **ScheduleTab** при необходимости ссылки «Открыть в карточке».

### 2.3 Этапы (сводка)

| Этап | Волна | Содержание |
|------|--------|------------|
| **M1** | M | Роут V2 + оболочка мастера, шаги, навигация, «Сохранить и продолжить» → мок `eventId` |
| **M2** | M | Расписание: селект модели + разовое / сетка+предпросмотр / open date — на моках |
| **R1** | R | Backend: DTO, черновик create, `EventSource`, сервис слотов, supplier endpoint |
| **R2** | R | Реальный адаптер + проверки; ссылка из V2 в legacy EventEdit при необходимости |

### 2.4 Что можно пока опустить (не блокирует M и первый cut R)

- **Отдельный диалог «период + дни недели + время»** → генерация слотов: **не входит** в первый проход. Для «повторяющегося» режима достаточно **окна дат + сетки день×час** (как в референс-макете) и развёртки выбранных ячеек в список `startsAt` с предпросмотром количества. Удобный мастер по будням можно вернуть в бэклог как улучшение.
- **Отдельная «A/B фиксация режимов» в доке** (под эксперименты): **не нужна**; продуктовые режимы уже описаны в §3.3 (разовое / повторяющееся / open date).

**Про чек-листы уровня legacy (расширить `CreateEventDto`, `mapDraftToCreatePayload` + `EventCreate`, доработки `EventEdit`):** это задачи **волны R** (и при желании позднего выравнивания legacy). На этапе **только моки V2** их **по времени опускают** — из плана не исключают, переносят на R1/R2.

---

## 3. Продуктовые решения (зафиксировано)

### 3.1 Черновик и навигация по шагам

1. После валидной вкладки **«Информация»** — **один** `POST` создания события (в волне R: реальный API; в M — мок).
2. Далее все шаги опираются на **`eventId`**: `PATCH`, `POST .../sessions/batch-create`, медиа, SEO, quality и т.д.
3. **Не** создавать событие на каждый blur. Создание — при **«Сохранить и продолжить»** или **переходе с первой вкладки дальше** (один раз).
4. После появления `eventId` допустимы **debounced autosave** или **явное сохранение по вкладке**.

### 3.2 Порядок шагов визарда

1. Информация (→ первый save / create)  
2. Вместимость + билеты/цены (один экран или два подряд — UX)  
3. Расписание  
4. Публикация (обзор / submit)

### 3.3 Временная модель на вкладке «Расписание»

Первый контрол — **выбор типа**; далее ветвление:

| Режим | Поведение |
|--------|-----------|
| **Разовое (по умолчанию)** | Дата, время начала, длительность → **один сеанс** (batch-create из одного слота). |
| **Повторяющееся** | Диапазон, сетка день×час, сетка/таблица (облёгчённо), массовый выбор → клиентская развёртка → batch-create с **предпросмотром числа** слотов и **лимитом** (как на бэке, напр. 200). |
| **Открытая дата** | Период в UI; **`dateMode: OPEN_DATE`**, `endDate` / `isPermanent`; **без** сеансов, **без** batch-create, **без** grid. |

### 3.4 Админский черновик (волна R)

- После первого `POST` из мастера: **`isActive: false`**.
- `moderationStatus` для этой волны **не** переводить в `DRAFT` специально — дефолт схемы/current create, пока не решено иначе.

### 3.5 OPEN_DATE без новых колонок (волна R)

- Маппинг: `endDate`, `isPermanent`, `dateMode: OPEN_DATE`.
- **Начало периода** в домене как сейчас — от **`createdAt`** / `computeWindowOpenDate`.
- В UI — **дисклеймер:** отдельного поля «valid from» в БД пока нет; позже нормализация.

### 3.6 Часовой пояс

- **IANA timezone города** (`City.timezone`) — источник для расчёта локальных времён слотов.

### 3.7 Атомарность create + sessions

- Слоты — **отдельным** batch-create после create. Ошибка слотов **не** откатывает событие; дозаполнение с карточки.

### 3.8 Поставщик (волна R)

- Та же продуктовая логика, **другой RBAC**.
- Общий **сервис/use-case** записи слотов: вызывается из admin batch-create и из **нового** supplier batch-create (или эквивалента).
- **Не** использовать для мастера **PUT supplier syncSessions** (семантика полной замены будущих).

### 3.9 «Брошенные» черновики

- Без автоочистки и без фильтра «мастер не завершён» на первой волне; в списке как обычные черновики.

---

## 4. UX-референс

- Репозиторий: [ticket-creation-ux](https://github.com/Twisterrrrr/ticket-creation-ux) (Vite, React, shadcn, Tailwind) — паттерны композиции, не копипаста всего репо.
- Макет: скрин вкладки «Расписание» (сетка день×час, диапазон День/7/14/30, переключатель сетка/таблица) — приложён к обсуждению; при необходимости копия в `draft/` или `docs/`.
- Визуал выровнять с **токенами** существующей `frontend-admin`, не второй бренд.

---

## 5. Аудит текущего кода (опорные точки)

### Уже есть

- [EventEdit.tsx](../packages/frontend-admin/src/pages/events/EventEdit.tsx), [ScheduleTab.tsx](../packages/frontend-admin/src/components/events/ScheduleTab.tsx), [schedule-sync.adapter.ts](../packages/frontend-admin/src/components/events/schedule-sync.adapter.ts).
- `POST /admin/events/:id/sessions/batch-create` в [admin-events.controller.ts](../packages/backend/src/admin/admin-events.controller.ts) — логика **в контроллере**, без выделенного сервиса.
- [EventWizard](../packages/shared-ui/src/workflow/event-wizard/EventWizard.tsx), [EventCreate.tsx](../packages/frontend-admin/src/pages/events/EventCreate.tsx), [EventWizard.mappers.ts](../packages/shared-ui/src/workflow/event-wizard/EventWizard.mappers.ts) — create **без** расписания в одном POST.
- `PATCH /admin/events/:id/venue-settings` (venueId, dateMode).
- Supplier: `POST /supplier/events`, `PUT .../sessions` (sync), **без** batch-create и без общего сервиса с admin.

### Остаётся сделать (волна R)

- Admin create: **`isActive: false`** для мастера; расширить **CreateEventDto** (`venueId`, `dateMode`, `defaultCapacityTotal`).
- Исправить **`Event.source`:** `EventSource.MANUAL`, не `OfferSource`.
- Ранний POST + PATCH + batch-create по шагам (сейчас один POST в конце EventCreate).
- Общий сервис слотов + supplier batch-create.
- Ветвление временной модели и таймзона в данных визарда (после моков — в адаптере).

---

## 6. Детализация волны R (backend / интеграция)

1. Расширить `CreateEventDto` + `createEvent` (поля выше, `EventSource.MANUAL`, subcategories на create проверить).
2. Вынести логику batch-create в **сервис**; подключить supplier.
3. Подключить V2-визард к API: шаг 1 → POST; далее PATCH / batch-create.
4. Расписание в UI уже от M2 — подставить лимиты и ошибки с бэка.
5. Legacy EventEdit — полный редактор; визард V2 не дублировать.

---

## 7. Definition of Done

### Волна M

- [ ] Мастер в Admin V2: шаги, навигация, мок `eventId` после сохранения информации.
- [ ] Три ветки расписания, предпросмотр слотов, сетка/таблица в согласованном объёме.
- [ ] Legacy EventCreate/EventEdit без переключения на мок.
- [ ] Typecheck затронутых пакетов V2.

### Волна R

- [ ] Реальный черновик с первого шага; последующие вызовы с `eventId`.
- [ ] Разовое / повторяющееся / open date согласно §3.3.
- [ ] Supplier под тем же use-case с RBAC.
- [ ] Typecheck backend + frontend без регрессий.

---

## 8. Связанные документы и долг

- [Event-Sessions-Product-Contract.md](./Event-Sessions-Product-Contract.md)  
- [Tasktracker.md](./Tasktracker.md) — в т.ч. domain-offer-* (нормализация цен/ограничений после UX-слоя в externalData в сиде).  
- План в Cursor (короткая отсылка): [.cursor/plans/event-master-schedule-grid.plan.md](../.cursor/plans/event-master-schedule-grid.plan.md)
