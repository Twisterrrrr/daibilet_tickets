# Project foundation — что это за система сейчас

**Назначение:** единственный обязательный ответ на вопрос «что мы строим и в какой фазе». Не дневник и не бэклог задач — для статуса исполнения см. [`ROADMAP.md`](ROADMAP.md) и [`Tasktracker.md`](Tasktracker.md).

---

## 1) Что за продукт

**Дайбилет** — агрегатор билетов на экскурсии, музеи и мероприятия с умным подбором программы поездки. Стартовые города: Москва, Санкт-Петербург, Казань, Калининград, Владимир, Ярославль.

**Конкурентная рамка (кратко):** главный ориентир по рынку — Tripster; обходим не «копированием UX», а сильными зонами: многоуровневая таксономия и SEO-поверхность, AI-контент с привязкой к данным, планировщик туров как долгосрочный дифференциатор. Подробнее: [`PRODUCT.md`](PRODUCT.md) § конкурентная стратегия.

---

## 2) Текущий этап (Now / Next / Later)

### Now (4–6 недель)

- **Admin V3** — основной UI для операционки: `packages/frontend-admin-v3`, mount `/admin-v3/*`. Каталог + контент + качество/SEO + поддержка + ops/settings **без** полноценного Supplier self-service и без полного финансового UI.
- **Импорт как основа каталога:** Ticketscloud и Teplohod.info — управление импортированными сущностями, readiness/publish-gate, контроль качества.
- **Стабильность read-heavy списков:** договорённость `lite=1` на admin list endpoints где нужно; baseline для событий: `scripts/admin-events-baseline.mjs`.

### Next

- **Supplier MVP (тонкий V3-style):** read-first, минимальные действия по необходимости.
- **Расписание / сеансы:** сначала read-only обзор и безопасные bulk-операции там, где допустимо; редактирование — точечно и по правилам источника.

### Later (сознательно не приоритет)

- Полный финансовый контур в UI (payouts, юркабинет, глубокая аналитика), пока основной поток — виджеты / внешние контуры оплаты.

**Legacy Admin V1** (`packages/frontend-admin`): toolbox для редких операций, не цель развития.

---

## 3) Source of Truth — система задаётся только этими документами

Единственный «верхний» вход по продукту и фазе — **этот файл** (`PROJECT-FOUNDATION.md`). Ниже — **канонические слои** (не дублировать их смысл в произвольных `.md`).

Система в части устройства и поведения определяется **только**:

- [`SYSTEM.md`](SYSTEM.md) — инварианты данных, интеграций, API, эксплуатационные правила
- [`PRODUCT.md`](PRODUCT.md) — поведение продукта для пользователя и бизнеса
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — карта системы и навигация (детали — [`core/architecture.md`](core/architecture.md))
- [`ADMIN_V3.md`](ADMIN_V3.md) — админский контур V3
- [`SEO.md`](SEO.md) — верхний вход SEO (детали — `product/seo.md` и др.)
- [`OPERATIONS.md`](OPERATIONS.md) — верхний вход ops (детали — `runbooks/infra.md` и др.)
- [`ROADMAP.md`](ROADMAP.md) — этапы и исполнение

**Всё остальное** в `docs/` — справочники по доменам (`core/`, `product/`, `domains/`, `entities/`), отчёты, трекер, дневник, ADR — либо **legacy** в [`archive/`](archive/). Их нельзя противопоставлять канону выше без явного обновления канона.

### Быстрый указатель (не дубли канона)

| Тема | Документ |
|------|----------|
| План работ / статусы задач | [`ROADMAP.md`](ROADMAP.md), детали — [`Tasktracker.md`](Tasktracker.md) |
| Полная карта фаз Admin V3 | [`admin-v3/grand-master-plan.md`](admin-v3/grand-master-plan.md) |
| Checkout / виджет (инварианты) | [`core/checkout.md`](core/checkout.md) |
| Классификация / publish-gate | [`core/classification.md`](core/classification.md) |
| События и сеансы (контракт) | [`core/events.md`](core/events.md) |
| Лендинги | [`product/landings.md`](product/landings.md) |
| Импорт / ingestion | [`core/ingestion.md`](core/ingestion.md) |

Полный старый монолитный конспект (до разбиения): [`archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md`](archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md) — **только reference**, не источник истины.

---

## 4) Принципы модели данных (кратко)

- **Импорт vs локальные override:** внешний источник владеет своими полями; локальные override и редакционные слои не должны «ломаться» незаметно при синке.
- **Links-first** для канонических связей (например подкатегории): читать links + справочник; legacy enum — только fallback для старых строк.
- **Read-model / DTO:** публичные и админские ответы — проекции; тяжёлые агрегаты не дублируют «вторую БД» без необходимости.
- **Идемпотентность** платежей/webhook и инварианты checkout — см. [`core/checkout.md`](core/checkout.md).

---

## 5) Связанные документы

- Решения и наблюдения по датам: [`Diary.md`](Diary.md)
- Формализация важных решений (ADR-стиль): [`DECISIONS.md`](DECISIONS.md)
- Устаревший редирект: [`DIRECTION.md`](DIRECTION.md) → сюда
