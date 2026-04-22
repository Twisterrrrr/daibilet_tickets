# Admin V3 — roadmap к запуску витрины (TC + Teplohod)

**Стратегия и полная фазовая модель (фазы 0–8, Stages A–F, домены):** [`admin-v3-grand-master-plan.md`](./admin-v3-grand-master-plan.md).

**Назначение:** единая точка правды для приоритизации работ в `frontend-admin-v3` и смежном backend. Документ **живой**: при смене фазы или критериев готовности — обновлять раздел «Текущий фокус» и чеклисты.

**Принцип отбора задач (не нарушать):** админка — инструмент для импорта, нормализации каталога и публикации витрины, а не продукт сам по себе.

**Фильтр на любую задачу:**

> Приближает ли это **запуск витрины** с импортируемыми событиями (Ticketscloud + Teplohod): стабильно, без мусора, с контролируемым качеством?

Если нет — в бэклог после текущей фазы (или явно помечать как техдолг).

---

## Сжатый порядок доменов

Не «страницы», а **цепочка данных**:

`venue candidates` → **canonical venues** → **events** → (quality gate) → **витрина**

Позже: suppliers (read-heavy), collections/landings, promo, расширенная модерация и health.

**Не переносить Admin V1 «как есть»:** брать логику, поля и сценарии; не брать старый UI и архитектуру целиком.

**UI-паттерн списков (foundation):**  
`Identity` → `Health` → `Stats` → `Meta` → `Actions` — переиспользовать по мере появления новых экранов.

---

## ФАЗА 1 — LAUNCH CORE (критично для запуска)

**Цель:** рабочая витрина событий с импортом TC + Teplohod: стабильно, без мусора, с контролируемым качеством.

### 1. Импорт и синхронизация (backend — в основном есть)

**Довести до устойчивого состояния:**

- стабильный sync **Ticketscloud**
- стабильный sync **Teplohod**
- **дедуп:** events, **venues** (через candidates flow)
- **id mapping** (`tcEventId` и аналоги)

**DoD:**

- импорт можно запускать **без ручных фиксов** в типичном сценарии
- обновления **не ломают** существующие данные (идемпотентность / предсказуемые конфликты)

### 2. Venue Candidates

**Уже есть (база):** список, фильтры, similar, approve / merge / reject.

**По плану доработок (ориентиры):**

| ID   | Смысл |
|------|--------|
| 2.1  | confidence + sorting |
| 2.2  | merge preview |
| 3.1  | URL + связность (навигация/контекст в админке) |
| 2.3  | batch approve / reject (с preview и `expectedUpdatedAt` где применимо) |

**DoD:** модератор может за **1–2 часа** разобрать **большой поток** кандидатов без постоянных обходных путей.

### 3. Canonical Venues (следующий обязательный блок после candidates)

Без canonical-площадок витрина остаётся «грязной».

**Нужно:**

- `/admin-v3/venues` — **список**
- `/admin-v3/venues/:id` — **карточка**
- **связи:** events, **supplier (read-only)**
- **базовые поля:** name, address, city, geo (опционально)
- **статус:** active / published

**DoD:** у каждой площадки на витрине есть **один canonical объект**; поток из candidates **реально схлопывается** в venues.

### 4. Events (довести до production-уровня)

**Уже есть:** список, карточка (как минимум в зачатке).

**Добить:**

- publish / unpublish
- `isActive`
- source (например IMPORTED)
- минимальный **quality layer** в UI/логике: есть цена, есть сессии, есть venue
- **ссылка на venue**

**DoD:** событие можно **безопасно показать** на витрине (нет «дырявых» обязательных связей для публикации).

### 5. Минимальный quality gate (не раздувать)

Только **блокирующие** правила для публикации:

- нет venue → **нельзя** публиковать
- нет цены → **нельзя** публиковать
- нет будущих сессий → **нельзя** публиковать

**DoD:** витрина не содержит заведомо «битых» опубликованных событий по этим критериям.

### 6. Admin как control panel (фаза 1)

Дашборд не обязателен. Достаточно **трёх опорных разделов:**

- Events (list)
- Venues (list + card)
- Venue candidates

**Результат Фазы 1:** рабочая витрина TC + Teplohod + управляемое качество через админку.

---

## ФАЗА 2 — STABILIZATION & OPERATIONS (после запуска)

**Цель:** админка удобна для ежедневной работы.

1. **Suppliers (облегчённый домен, read-heavy):** список, агрегаты (eventsCount, activeEvents, venuesCount, last sync, health).
2. **Events UX:** фильтры (город, поставщик, статус), быстрые переходы; массовые действия — позже.
3. **Venues UX:** фильтры, поиск, связь с candidates, базовые quality indicators.
4. **SEO / landing минимум:** collections, city pages, topic pages (ручная сборка страниц под трафик).
5. **Promo blocks** (если витрина использует): простой create/edit/list, привязка к событиям/подборкам.

**Результат:** админка — **операционный инструмент**, а не только «панель загрузки».

---

## ФАЗА 3 — SCALING CATALOG

**Цель:** большой каталог без хаоса.

1. **Unified moderation** — расширять текущее (venues candidates; опционально events/content), не переписывать с нуля.
2. **Tags / Subcategories** — под SEO, фильтрацию и структуру каталога, не «UI ради UI».
3. **Listing health system** (events / venues / suppliers): no photo, weak description, no sessions, no price, и т.д.
4. **Batch-инструменты:** развитие batch approve/reject; batch edit — очень осторожно и по необходимости.

---

## ФАЗА 4 — BUSINESS LAYER (не раньше стабилизации каталога)

Только когда каталог и процессы выдерживают нагрузку:

финансы, выплаты, документы, supplier portal, users/roles, support/tickets, chat и т.п.

Иначе — перегруз и замедление запуска продуктовой витрины.

---

## Roadmap «сейчас → затем»

| Когда | Фокус |
|--------|--------|
| **Сейчас** | **Canonical Venues:** довести карточку до DoD (actions active/published + supplier/geo по API); параллельно — **стабильность импорта** TC/Teplohod. **Venue candidates:** крупные пункты (2.2, 3.1, 2.3) закрыты; при необходимости — **2.1** (confidence/sorting UX). **Events:** явный publish/unpublish (через quality gate) + UX по quick-filters/quality. |
| **Затем** | **Canonical Venues** довести до DoD (связи, supplier read-only, поля) |
| **Затем** | **Events** до production + **quality gate** на публикации |
| **Затем** | Запуск витрины / итерации по данным |
| **После запуска** | Suppliers light, collections/landings, promo, UX |
| **Потом** | Расширенная модерация, health, batch-масштаб |
| **В конце** | Бизнес-слой |

---

## Текущий фокус (живой чеклист)

_Последнее обновление: 2026-04-13 — по состоянию кода `packages/frontend-admin-v3` и точечному обзору backend._

### Снимок репозитория (кратко)

| Область | Статус |
|--------|--------|
| **`/admin-v3/venues/candidates`** | Рабочий поток: фильтры, similar batch, single approve / merge / reject, **batch approve через preview** и `items` + `expectedUpdatedAt`, batch reject с **reasonCode/reasonText**, decision hints, отображение stale в UI. |
| **`/admin-v3/venues` (список)** | Реализовано: таблица + фильтры/сортировки + readiness/hub snapshot. |
| **`/admin-v3/venues/:id`** | Базовая **read-only** карточка (поля, город, источник, публикация), ссылки на **события площадки** и **префильтр кандидатов**. Нет блока **supplier**, нет **geo**, нет полноценных **actions** по active/published на карточке. |
| **`/admin-v3/events`** | Список развит (фильтры, batch archive и т.д.). **URL-state** для quick-filters и доп. фильтров — ✅ (можно шарить ссылку / back-forward). |
| **`/admin-v3/events/:id`** | Summary/readiness/**качество**, связь с **venue**, сохранение **архива** и **подкатегорий**. Добавлены явные **publish/unpublish** (через quality gate) с отображением результата gate/quality. |
| **`/admin-v3/promo-blocks`** | Управление витриной: list + create/edit + delete, **toggle active** из списка, порядок (priority/sortOrder), scope/таргетинг и AUTO-подбор (selectionMode/auto*). |
| **`/admin-v3/moderation`** | Очередь как entry-point по events: URL-state (status/sort/page), deep-links в event/supplier, быстрые approve/reject + «Открыть». |
| **`/admin-v3/reviews`** | Операционный экран: фильтр status, URL-state (tab/status/eventId/page), deep-links в event/venue, approve/reject/delete, supplier responses, disputes. |
| **Импорт (backend)** | Сервисы вроде `venue-import` и интеграции с источниками есть; **операционная стабильность** sync TC/Teplohod проверяется прогонами, не только кодом. |

### Чеклист (актуализировать в начале спринта)

**1. Импорт и sync**

- [ ] Подтвердить стабильные прогоны **Ticketscloud** и **Teplohod** (без ручных правок, предсказуемые обновления).

**2. Venue candidates (пункты плана 2.x / 3.1)**

- [x] **2.2** Merge preview (предпросмотр перед merge).
- [x] **3.1** URL + связность (query state, контекст «похожие», навигация).
- [x] **2.3** Batch approve/reject (preview → confirm → результат; structured reject; stale-lock).
- [ ] **2.1** Confidence + sorting: довести UX до «удобно в большом потоке» (подписи, дефолты, подсказки — по необходимости).

**3. Canonical Venues — следующий крупный блок**

- [x] Реальный **`/admin-v3/venues`** (таблица, поиск/фильтры минимум).
- [ ] Доработать **`/admin-v3/venues/:id`**: **supplier (read-only)**, **geo** (если есть в API), действия по **active / published** согласно контракту backend.

**4. Events — до production по roadmap**

- [ ] Реализовать вкладки **Цены** и **Расписание** (минимум для контроля витрины; если уже есть — добить до DoD).
- [x] Явные **publish / unpublish** — через `/admin/events/:id/publish` + `/admin/events/:id/unpublish`, с отображением gate/quality результата.
- [x] **Events list filters:** quick-filters и доп. фильтры синхронизированы с URL (init + update + reset).
- [ ] **Quality gate:** нет venue / нет цены / нет будущих сессий → нельзя опубликовать (единые правила UI + backend).

---

## Связанные документы

- При необходимости см. также документы в `docs/` про foundation/reset и миграции каталога (если есть в репозитории).
