# Tasktracker — Агрегатор билетов + Trip Planner

> Последнее обновление: 2026-03-01. См. `docs/Reference.md`, `docs/Deploy.md`.
> **Отложено 6+ мес** (Q3 2026+): Planner, Unified Checkout, ML-рекомендации, PWA, сложная дедупликация, gRPC-оптимизации, микрооптимизация Web Vitals, расширенная CI-инфра.
> План 26 PR: `docs/InfraTypizationUXCheckoutPlan.md` (инфра, типизация, UX, Checkout + YooKassa).

---

## Легенда

- **Приоритет**: Критический / Высокий / Средний / Низкий
- **Статус**: `[ ]` не начато, `[~]` в работе, `[x]` выполнено, `[-]` отменено
- **Отложено 6+ мес**: помечено `(⏸ 6+ мес)` — возврат к задаче не ранее Q3 2026

---

# Часть I — Закрытые задачи (Выполнено)

> Сводка выполненных работ по темам. Детали — в секциях ниже и в `docs/Diary.md`.

## Cursor Master Pipeline PR-1–PR-8 (01.03.2026) ✅

- **PR-1 (A1)** EventOverride.subcategories: INHERIT/OVERRIDE/CLEAR (resolveSubcategories).
- **PR-2 (A2)** Redis cache: TTL (cities 6h, events 2m/10m), инвалидация catalog при изменении события.
- **PR-3 (A3)** Publish-gate: isSellable(), фильтр offers с priceFrom > 0, voucherUrl в tracking.
- **PR-4 (C2)** Mobile checkout: прогресс-бар, fixed bottom bar ≤420px.
- **PR-5 (C3)** /orders/[id]: таймлайн, операционная инфо, ваучер.
- **PR-6 (B1+B2)** JSON-LD: buildArticleJsonLd(), Article schema на blog/[slug], FAQPage в FaqSection.
- **PR-7 (D1)** ESLint no-explicit-any: уже включён (warn); overrides для DTO, тестов.
- **PR-8 (D2)** Типизация tc-sync: TcVenueCity, TcTicketSetRule, TcOffer, isTcEvent, валидация.

## Инфра + типизация + UX + Checkout (26 PR) ✅

- T1–T26 выполнены (22.02): Nginx uploads, Feature Flags, Pino, Sentry, TcEvent[], Prisma where builders, catalog keys, cache, email order-confirmed/completed, view toggle, skeleton, Teplohod widgets, Supplier RBAC, /checkout/[packageId], createPackage, YooKassa flow, webhook idempotency. Миграции M1–M8.

## Ops Foundation (Cursor Auto) ✅

- **Batch 1**: IdempotencyKey, IdempotencyService.run, миграция, unit-тесты
- **Batch 4**: POST resend-email, retry-fulfilment, set-status (reason, audit)
- **Batch 5**: Runbooks (payment-succeeded, order-exists-no-voucher, refund, cancel, webhook-failures, disaster-recovery)
- **Batch 6**: scripts/backup.sh, restore-to-staging.sh

## Каталог, главная, TEPLOHOD ✅

- Главная: фильтр по городу, fallback популярных, HeroCitySearch, чипы городов.
- TEPLOHOD classifyTep: EXCURSION+RIVER, EXTREME только для наземных.
- fix-teplohod-river, единый каталог (Вариант B), «Показывать по» 20/50/100.
- Шаблоны событий (EventTemplateFields), посадочная «Музеи», страница-шаблон экскурсий, шаблон «Мероприятия».

## Решения 13 вопросов + Supplier ✅

- Email GiftCertificate, session.prices, CacheInvalidationService, reclassify-events, CartIcon→null, PageTemplateSpecs, GiftCertificate в checkout, EventOverride category+subcategory.
- SupplierArchitecture, createdByType, RBAC, Event/Venue createdById, RBAC guards.

## Далее (приоритетная очередь) ✅

- Merge дублей (admin UI), автодедуп, Review.venueId, sitemap, SeoTemplate, SeoMeta, SeoGeneratorService.

## 23.02.2026 — UX + типизация + Planner ✅

- **Frontend:** loading.tsx для /events, EventEdit подсказки «Оригинал»/«Для Daibilet», SearchAutocomplete city filter
- **Backend:** JwtPayload/auth.types, req типы (PartnerApiUser, SupplierAuthUser), Prisma.PackageWhereInput
- **Planner:** Кнопка «Заменить» на слоте → POST /planner/customize

## Production Hardening, Technical Debt ✅

- FK-индексы, Logger, env для teplohod, CSV streaming, pagination, requestId, PII masking, идемпотентные миграции, frontend typecheck.

## Музеи и Арт, Venues, Partner API, Supplier Portal ✅

- Полный цикл: модели, миграции, API, Admin UI, фронт /venues, JSON-LD, Reviews, UGC, Checkout flow, PaymentIntent, State machine.

## Админка, Фазы 1–6 (основное) ✅

- Auth, RBAC, CRUD (Events, Cities, Tags, Landings, Combos, Articles, Orders), AuditLog, EventOverride, PricingConfig, Ops controls, редизайн shadcn/ui, Reviews, UGC.

## Consolidation (Admin DTO) ✅

- Admin DTO: единая точка импорта `./dto/admin.dto` (CreateTagDto, UpdateTagDto, UpdateCityDto inline; остальные re-export). Все admin-контроллеры переведены на импорт из admin.dto.

## Consolidation (Supplier, Partner, SEO) ✅

- **Supplier**: 5 контроллеров (auth, dashboard, events, reports, settings) → 1 supplier.controller.ts
- **Partner**: 3 контроллера (events, orders, reports) → 1 partner.controller.ts
- **SEO**: 2 контроллера (public, admin) + 2 сервиса (meta, generator) → 1 seo.controller.ts (2 класса) + 1 seo.service.ts

## Решения 13 открытых вопросов (19.02.2026) ✅

> Все решения приняты. Реализация: часть выполнена, остальное — в соответствующих разделах Part II.

| # | Вопрос | Решение | Выполнено |
|---|--------|---------|-----------|
| 1 | Переклассификация событий | Скрипт reclassify-events.ts | ✅ |
| 2 | EventOverride.subcategories | Жёсткий override: category, subcategory, clear | — |
| 3 | GiftCertificate — email | Шаблон, fulfillment, retry, лог admin | ✅ |
| 4 | Скрыть корзину | Прямой checkout per-offer | ✅ |
| 5 | Планировщик MVP | Отложить до базы 2000+ событий | — |
| 6 | PageTemplateSpecs | Аудит соответствия | — |
| 7 | session.prices | NormalizedPrice | ✅ |
| 8 | Лендинг salyut | Проверить в проде, unit-test getPrice | — |
| 9 | Типизация any | «Ни одного нового any» | — |
| 10 | Кэш и инвалидация | CacheInvalidationService | ✅ |
| 11 | GiftCertificate в checkout | Поле «Ввести код» | — |
| 12 | Избранное → аккаунт | Оставить localStorage | — |
| 13 | Аудит категоризации | SQL-отчёт | — |

---

# Часть II — Открытые задачи (Gates)

> Часть I остаётся историей; фактический статус для запуска считаем по Gate 0–3.
> Задачи ниже разбиты по “воротам” (Gates). Всё, что не попало в них, — в блоке «После запуска / 6+ мес».

---

## Gates (минимальный путь к запуску)

### Gate 0 — проект доступен по доменам + есть бэкап

- [ ] **Критический**: Создать VPS на Timeweb Cloud (Ubuntu 22.04/24.04, 2 CPU, 4 GB RAM, 50 GB NVMe)
- [ ] **Критический**: Настроить DNS A-записи: daibilet.ru, www.daibilet.ru, admin.daibilet.ru → IP VPS
- [ ] **Критический**: SSH на сервер, запустить `deploy.sh` (первый раз — создаст .env с паролями)
- [ ] **Критический**: Заполнить TC_API_TOKEN, TC_WIDGET_TOKEN в .env на сервере
- [ ] **Критический**: Deploy: Docker + CI/CD pipeline (первый ручной запуск `deploy.sh` до CI/CD)
- [ ] **Высокий**: Проверить https://daibilet.ru, https://admin.daibilet.ru, https://daibilet.ru/api/v1/health
- [ ] **Средний**: Проверить SSL-сертификат (SAN: 3 домена, auto-renewal cron)
- [ ] **Средний**: Первый бэкап БД (pg_dump + фиксация шага в `Diary.md`)

### Gate 1 — принимаем платежи end-to-end

- [ ] **Критический**: .env production: YooKassa ключи, PAYMENT_PROVIDER=YOOKASSA
- [ ] **Критический**: Зарегистрировать магазин в YooKassa, получить shopId + secretKey
- [ ] **Критический**: Подключить YooKassa SDK → заменить STUB в payment.service
- [ ] **Критический**: POST /webhooks/yookassa — верификация подписи, идемпотентность по event.id
- [ ] **Критический**: PaymentService.applyWebhookEvent + BullMQ fulfilment queue (retry, backoff)
- [ ] **Критический**: Тестовый платёж в sandbox — 3 сценария (PLATFORM, EXTERNAL, mixed)
- [ ] **Высокий**: Fulfilment идемпотентен, PaymentEvent/audit storage, e2e-тесты
- [ ] **Высокий**: Страница «Оплата прошла» / «Ошибка оплаты» на фронте
- [ ] **Высокий**: Sentry alerts на 5xx и payment failures
- [ ] **Средний**: GiftCertificate в checkout — поле «Ввести код» + валидация
- [ ] **Средний**: Лендинг `salyut` — unit-test getPrice + проверка edge-cases
- [ ] **Средний**: SQL-отчёт по категоризации (аудит качества каталога)

### Gate 2 — ежедневные ops в текущей админке

- [x] **Высокий**: Admin UI — поиск заказа (id/code/email/paymentId) + resend, retry fulfilment (OrderDetail) ✅
- [x] **Высокий**: Cache invalidate в Settings (scope + ids → /admin/cache/invalidate) ✅
- [x] **Средний**: Support escalation checklist — `docs/SupportEscalation.md` ✅

### Gate 2.5 — админка событий (готовность, расписание, поставщики)

> Спецификация: `docs/AdminScheduleSpec.md`, pipeline: `docs/AdminSchedulePipeline.md`. Поставщики: см. раздел ниже.

- [ ] **Высокий**: PR1 — GET /admin/events/:id/quality (on-demand), UI «Причины неактивности» + подсветка вкладок, field→tabKey
- [ ] **Высокий**: PR1 — Статус: isHidden ≠ активность, одна строка «В каталоге / Скрыто вручную / Причины» (без forceActive на MVP)
- [ ] **Высокий**: PR2 — Миграции (порядок: 1) pre-unique-safety, 2) admin_schedule_capacity)
- [ ] **Высокий**: PR2 — Вкладка «Расписание» — таблица date×00–23, draft-create, модалка минут, POST sessions/batch-create
- [ ] **Высокий**: PR2 — Контекстное меню слота, Модель A при sold>0, PATCH capacity/delete/cancel
- [ ] **Высокий**: PR2 checklist перед merge: индексы package_items(sessionId[,status]) в БД; tcSessionId не пустой; нет дублей (eventId,startsAt)
- [ ] **Высокий**: PR3 — Events — колонка groupingKey + фильтр; раздел «Группы событий»
- [ ] **Высокий**: PR4 — /admin/seo-audit, GET /admin/seo/audit, seo_issues
- [ ] **Высокий**: PR‑S1 — Admin SuppliersList v1 (реестр поставщиков: имя, тип, статус, события, площадки, комиссия, последняя активность; фильтры; быстрые действия)
- [ ] **Высокий**: PR‑S2 — Admin SupplierDetail v1 (Профиль/События/Площадки/Финансы/Доступ; смена статуса ACTIVE/FROZEN; изменение комиссии)
- [ ] **Средний**: PR‑S3 — Supplier EventsList/EventEdit v1.5 (упрощённый UX: базовые поля, подсказки качества, без перегруза override/SEO)

### Gate 3 — контент/SEO минимум для индексации (3+ мес)

- [ ] **Критический**: SEO-описания для всех городов (уникальные, не шаблонные)
- [ ] **Критический**: SEO-описания для ТОП-10 площадок (venues)
- [ ] **Высокий**: Тематические лендинги («Ночные экскурсии СПб», «Музеи Казани с детьми» и др.)
- [x] **Высокий**: Базовый JSON-LD и meta-теги на городах, venues, событиях, комбо ✅ (buildPageMetadata, og+twitter)
- [x] **Высокий**: Аудит PageTemplateSpecs — соответствие реализаций фронта/админки описанным шаблонам ✅ (docs/PageTemplateSpecsAudit.md)
- [ ] **Средний**: Контентный план — 30 статей (ArticlePlanner)
- [ ] **Средний** (3+ мес): Отображение «Музеи» (детальная страница venue) — режим работы, галерея, выставки (см. `docs/Reference.md` §1)
- [ ] **Средний**: Аудит категоризации — SQL-отчёт уже из Gate 1 можно переиспользовать как инструмент SEO
- [x] **Высокий**: Event Quality Gate — `EventQualityService.validateForPublish` + `/admin/events/:id/publish` ✅ (+ NO_VALID_PRICE для офферов без цены)
- [x] **Высокий**: EventOverride.subcategories — явная семантика INHERIT/OVERRIDE/CLEAR + subcategoriesOverride (SubcategoriesMode enum + Prisma migration)
- [ ] **Средний**: Нормализация категорий/аудиторий после импорта (детерминированный маппинг TC/TEP → EventCategory/EventSubcategory)
- [ ] **Средний**: Нормализация location/venue (venueId ИЛИ meetingPoint/address; MISSING_LOCATION блокирует publish)
- [ ] **Средний**: Нормализация offers (ACTIVE только для продаваемых, наличие хотя бы одного ACTIVE offer как publish-gate)

## После запуска / 6+ мес

> Задачи, явно помеченные в трекере как (⏸ 6+ мес) или требующие объёмной доработки после стабилизации ядра.

- [ ] **Средний** (⏸ 6+ мес): CI/CD: GitHub Actions для автодеплоя на VPS
- [ ] **Средний** (⏸ 6+ мес): GitHub Actions: lint → test → build (без деплоя)
- [ ] **Средний** (⏸ 6+ мес): gRPC: фильтровать Cities/Venues по нужным ID
- [ ] **Низкий** (⏸ 6+ мес): gRPC Seats — наличие конкретных мест
- [ ] **Высокий** (⏸ 6+ мес): Web Vitals: LCP < 2.5s, CLS < 0.1 — lazy images, font preload, critical CSS
- [ ] **Низкий** (⏸ 6+ мес): Персонализация / ML рекомендации («На основе интересов»)
- [ ] **Средний** (⏸ 6+ мес): GitHub Action workflow_dispatch для restore smoke

---

## Тематические группы (историческая разбивка)

> Ниже — исходные разделы Part II (по темам). Для планирования по шагам используем в первую очередь Gate 0–3.

### 1. Деплой / DevOps

- [ ] **Критический**: Создать VPS на Timeweb Cloud (Ubuntu 22.04/24.04, 2 CPU, 4 GB RAM, 50 GB NVMe)
- [ ] **Критический**: Настроить DNS A-записи: daibilet.ru, www.daibilet.ru, admin.daibilet.ru → IP VPS
- [ ] **Критический**: SSH на сервер, запустить `deploy.sh` (первый раз — создаст .env с паролями)
- [ ] **Критический**: Заполнить TC_API_TOKEN, TC_WIDGET_TOKEN в .env на сервере
- [ ] **Критический**: Deploy: Docker + CI/CD pipeline
- [ ] **Высокий**: Проверить https://daibilet.ru, https://admin.daibilet.ru, https://daibilet.ru/api/v1/health
- [ ] **Средний** (⏸ 6+ мес): CI/CD: GitHub Actions для автодеплоя на VPS
- [ ] **Средний**: Проверить SSL-сертификат (SAN: 3 домена, auto-renewal cron)
- [ ] **Средний**: Первый бэкап БД
- [ ] **Высокий**: ESLint + Prettier для всего monorepo
- [ ] **Средний** (⏸ 6+ мес): GitHub Actions: lint → test → build (без деплоя)

---

## 2. YooKassa / Платежи

- [ ] **Критический**: .env production: YooKassa ключи, PAYMENT_PROVIDER=YOOKASSA
- [ ] **Критический**: Зарегистрировать магазин в YooKassa, получить shopId + secretKey
- [ ] **Критический**: Подключить YooKassa SDK → заменить STUB в payment.service
- [ ] **Критический**: Тестовый платёж в sandbox — 3 сценария (PLATFORM, EXTERNAL, mixed)
- [ ] **Высокий**: Тестирование на sandbox YooKassa перед продакшеном
- [ ] **Высокий**: Страница «Оплата прошла» / «Ошибка оплаты» на фронте
- [ ] **Высокий**: Sentry alerts на 5xx и payment failures
- [ ] **Средний**: Подключение YooKassa Split API (после получения ключей)
- [~] **Низкий**: Подключение YooKassa для online-оплаты → PaymentIntent stub готов

---

## 3. Ops Foundation (Batches 1–6)

> Спецификация: план A1–G3, Prisma/FSM/OrderDetails/IdempotencyKey.

### Batch 1 — Audit + idempotency
- [x] **Критический**: IdempotencyKey, IdempotencyService.run ✅
- [x] **Высокий**: Unit-тесты IdempotencyService ✅

### Batch 2 — Webhooks + Queue
- [ ] **Критический**: POST /webhooks/yookassa — верификация, идемпотентность по event.id
- [ ] **Критический**: PaymentService.applyWebhookEvent, BullMQ fulfill queue (retry, backoff)
- [ ] **Высокий**: Fulfilment идемпотентен, PaymentEvent/audit storage, тесты

### Batch 3 — Admin Operator Panel v1
- [x] **Критический**: GET /admin/orders (list + search), GET /admin/orders/:id ✅
- [ ] **Высокий**: Admin UI: Orders search, OrderDetails

### Batch 4 — Admin Operator Panel v2
- [x] **Критический**: POST resend-email, retry-fulfilment, set-status (с reason, audit) ✅
- [x] **Высокий**: UI кнопки в админке для resend/retry (OrderDetail) ✅

### Batch 5 — Runbooks
- [x] **Высокий**: ops/runbooks/*.md ✅
- [x] **Средний**: Support escalation checklist — docs/SupportEscalation.md ✅

### Batch 6 — Backups + DR
- [x] **Критический**: scripts/backup.sh, restore-to-staging.sh ✅
- [ ] **Высокий**: Timeweb snapshot docs, Monthly restore drill
- [ ] **Средний** (⏸ 6+ мес): GitHub Action workflow_dispatch для restore smoke

---

## 4. Каталог / Venues / Teplohod

- [ ] **Высокий**: Шаблон «Музеи» (детальная страница venue) — режим работы, галерея, выставки (см. `docs/Reference.md` §1)
- [ ] **Высокий**: Продумать вывод виджетов для teplohod.info — справочник виджетов
- [ ] **Средний**: Отображение каталога: карточками или широкими блоками
- [ ] **Средний**: Контентный план — 30 статей (ArticlePlanner)
- [ ] **Средний**: Агрегация выставок: isPermanent + endDate сортировка
- [ ] **Средний**: Импорт внешних рейтингов (Яндекс/2ГИС) для топ-venue
- [x] **Низкий**: EventEdit — «Оригинал»/«Для Daibilet» рядом с названием ✅
- [ ] **Низкий**: Геолокация «Ближайший причал» (Phase 2)
- [ ] **Высокий**: Redis-кэш: списки событий (TTL 10 мин), детали (5 мин), сессии (3 мин)
- [x] **Средний**: Диетический режим листингов `/events` — `fields=card`/`full`, Prisma `select` для card, тайминги `fetchEvents` (dbMs/overrideMs/badgesMs/totalMs)
- [~] **Средний**: Глобальные мульти-события (одно шоу в разных городах) — `normalizedTitle`/`groupingKey`, `GET /api/v1/multi-events` (backend готов, подключение фронта и `/events/m/{slug}` — отдельный PR)
- [ ] **Средний** (⏸ 6+ мес): gRPC: фильтровать Cities/Venues по нужным ID
- [ ] **Низкий** (⏸ 6+ мес): gRPC Seats — наличие конкретных мест

---

## 5. Frontend / UX

### Hero и визуал
- [ ] **Критический**: Hero с фотографией — полноэкранное фото города (карусель 3–4 города)
- [ ] **Критический**: Качество фото каталога — галереи ТОП-20 с настоящими фото

### Приоритетные
- [ ] **Высокий**: Карусель отзывов на главной (5–6 лучших отзывов)
- [ ] **Высокий**: Лицо за экскурсией — фото/имя гида на карточке (Operator.avatar/bio)
- [x] **Высокий**: Autocomplete — город из URL для фильтрации ✅
- [x] **Высокий**: Скелетон loading.tsx для /events ✅
- [ ] **Высокий** (⏸ 6+ мес): Web Vitals: LCP < 2.5s, CLS < 0.1 — lazy images, font preload, critical CSS
- [ ] **Высокий**: Мобильная корзина: UX на 375px, fixed bottom bar для «Оформить»
- [ ] **Высокий**: Checkout UX: прогресс-бар (корзина → данные → оплата → готово)
- [ ] **Высокий**: Страница /orders/[id] — трекинг заказа
- [ ] **Высокий**: Push/email уведомления о смене статуса заказа

### Средний приоритет
- [ ] **Средний**: Страница события: профиль оператора, маршрут на карте, фото
- [ ] **Средний**: Живое социальное доказательство («Забронировано N раз сегодня»)
- [ ] **Средний**: Мобильный UX: fixed bottom bar, bottom sheet для фильтров
- [ ] **Средний**: Scroll-progress indicator на мобиле
- [ ] **Средний**: «Похожие места» блок на venue page (если ещё не везде)
- [ ] **Средний**: «Недавно просмотренные» на главной
- [ ] **Средний**: Breadcrumbs (если ещё не везде), фильтры /events расширение

### Низкий (polish)
- [ ] **Низкий**: Анимации и микроинтеракции
- [ ] **Низкий**: Блог/вдохновение на главной
- [ ] **Низкий** (⏸ 6+ мес): Персонализация / ML рекомендации («На основе интересов»)
- [ ] **Низкий**: A/B тестирование CTA-текстов
- [ ] **Низкий**: Micro-animations для offer cards

---

## 6. SEO / Контент

### Посадочные и контент
- [ ] **Критический**: SEO-описания для всех городов (уникальные)
- [ ] **Критический**: SEO-описания для ТОП-10 площадок
- [ ] **Высокий**: Тематические лендинги («Ночные экскурсии СПб», «Музеи Казани с детьми»)
- [ ] **Высокий**: JSON-LD и meta-теги на всех посадочных
- [ ] **Высокий**: 5 SEO-статей для блога
- [ ] **Высокий**: Описания ТОП-20 событий
- [ ] **Высокий**: 5 SEO-подборок на город
- [ ] **Высокий**: Наполнение: описания для всех городов
- [ ] **Высокий**: Галереи ТОП-20 событий (качественные фото)
- [ ] **Высокий**: SEO-тексты на /cities/[slug]
- [ ] **Высокий**: Блог: 3–5 статей под SEO
- [ ] **Высокий**: Подборки (Топ-10 экскурсий, Детям, Романтические)
- [ ] **Средний**: Внутренняя перелинковка
- [ ] **Средний**: Email-цепочка review request после покупки
- [ ] **Средний**: FAQ-секции на площадках
- [ ] **Средний**: Реализация ArticlePlanner + DataCollector + Renderer + Linker
- [ ] **Средний**: OpenAI API для генерации контента
- [ ] **Средний**: OpenGraph и Twitter Cards
- [ ] **Низкий**: Сезонные гиды (Белые ночи, Новый год, Майские)
- [ ] **Низкий**: Admin UI для управления статьями (перегенерация, превью)

### Технический SEO
- [ ] **Высокий** (⏸ 6+ мес): Core Web Vitals — микрооптимизация (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] **Высокий**: Яндекс.Вебмастер и Google Search Console
- [ ] **Средний**: JSON-LD Article schema для статей
- [ ] **Средний**: Микроразметка FAQPage
- [ ] **Низкий**: Alt-тексты для изображений

---

## 7. Backend / Типизация

- [ ] **Низкий**: Типизация `any` (backend ~31, frontend 100+), см. `docs/TechnicalDebt.md`
- [ ] **Средний**: ESLint правило: запретить `any` в новых файлах (warning)
- [ ] **Низкий**: Типизация `as any` в бэкенде (31 место) — type guards
- [ ] **Высокий**: Типизация tc-sync.service.ts (TcEvent вместо any[])
- [ ] **Высокий** (⏸ 6+ мес): Proto-generated types для gRPC
- [x] **Высокий**: JwtPayload, auth.types (AdminJwtUser, PartnerApiUser) ✅
- [x] **Средний**: admin-orders where → Prisma.PackageWhereInput ✅

---

## 8. Planner

- [ ] **Критический** (⏸ 6+ мес): Планировщик MVP: город + даты + состав → 3 варианта → покупка
- [x] **Высокий**: Кнопка «Заменить» на слоте → модалка + POST /planner/customize ✅
- [ ] **Высокий** (⏸ 6+ мес): Кнопка «Оплатить программу» → checkout
- [ ] **Высокий** (⏸ 6+ мес): Планировщик v2: drag-and-drop расписание, карта маршрута
- [ ] **Средний** (⏸ 6+ мес): Учёт геолокации (минимизация переездов)
- [ ] **Средний** (⏸ 6+ мес): Анимации переходов между шагами wizard
- [ ] **Средний**: Админ-панель: настройка pricing через UI
- [ ] **Низкий** (⏸ 6+ мес): Учёт погоды (indoor при дожде)
- [ ] **Низкий** (⏸ 6+ мес): Сохранение программы в localStorage
- [ ] **Низкий** (⏸ 6+ мес): Динамические upsell из БД
- [ ] **Средний**: Combo для Казани, Владимира, Ярославля, Нижнего Новгорода

---

## 9. Checkout / Orders / Voucher

### YooKassa + Checkout (Фаза 4)
- [ ] **Критический**: Модуль PaymentModule — YooKassa API v3, создание платежа, webhook handler
- [ ] **Критический**: POST /api/v1/checkout — Package + платёж, BullMQ fulfill-package
- [ ] **Критический**: Voucher: модель, QR, GET /vouchers/:shortCode
- [ ] **Критический**: Страница /checkout/:packageId, /checkout/:packageId/status
- [ ] **Высокий**: Prisma Package, PackageItem; ошибки TC → partial refund
- [ ] **Высокий**: PDF ваучера, мобильная страница /v/:shortCode, Email
- [ ] **Высокий** (⏸ 6+ мес): Unified Checkout — TC/TEP заказы при оплате через YooKassa
- [ ] **Средний**: Таймаут PENDING_PAYMENT > 30 мин
- [ ] **Средний**: Email при подтверждении/отклонении заявки (CheckoutSession)
- [ ] **Средний**: Отслеживание кликов для аналитики конверсии

### Unified Checkout (планировщик) — ⏸ 6+ мес
- [ ] **Высокий** (⏸ 6+ мес): Создание заказов в TC/TEP API при оплате
- [ ] **Высокий** (⏸ 6+ мес): Двойной резерв (15 мин TC vs наша оплата)
- [ ] **Высокий** (⏸ 6+ мес): Partial failure → partial refund
- [ ] **Средний** (⏸ 6+ мес): Объединение TC + TEP + MANUAL в одной корзине
- [ ] **Средний** (⏸ 6+ мес): Rollback при ошибке оплаты

---

## 10. Oфферы / Дедупликация

- [ ] **Средний**: Admin: UI для ручного merge дублей (поиск + выбор canonical)
- [ ] **Средний** (⏸ 6+ мес): Автодедуп: fuzzy matching по названию + площадка + дата
- [ ] **Низкий**: Автовыбор primary по правилам (комиссия/цена/наличие)

---

## 11. Afisha / Подборки / Контент

- [ ] **Высокий**: Страницы причалов (/cities/:slug/piers/:pier)
- [ ] **Высокий**: Страницы маршрутов (/routes/:slug)
- [ ] **Средний**: Перелинковка: событие — причал — маршрут — подборка
- [ ] **Средний**: Улучшить карточку: блок «как проходит», фото палуб, условия возврата
- [ ] **Высокий**: Геолокация: ближайший причал + время доезда
- [ ] **Высокий**: Погодный бейдж
- [ ] **Средний**: «Следить за ценой», постпокупочный слой, TripCombo upsell

---

## 12. Контент / Production

- [ ] **Высокий**: Structured JSON logs → log aggregator (pino)
- [ ] **Высокий**: Email шаблоны order-confirmed, order-completed — вёрстка
- [ ] **Высокий**: Мониторинг первых платежей через reconciliation
- [ ] **Высокий**: Feature flags: отключение EXTERNAL по городам
- [x] **Высокий**: Supplier self-service: ЛК поставщика — создание событий как черновик, отправка на модерацию (редактор/админ) ✅
- [ ] **Высокий**: Расширение географии: новые города по KPI
- [ ] **Средний**: Проверка категоризации (стендапы, мастер-классы)
- [ ] **Средний**: Сезонные лендинги, партнёрский контент
- [ ] **Средний**: Нагрузочное тестирование checkout
- [ ] **Средний**: ISR для страниц с высоким трафиком
- [ ] **Средний**: Оптимизация изображений, мониторинг (Sentry, UptimeRobot)
- [ ] **Низкий** (⏸ 6+ мес): PWA

---

## 13. Системные теги / Геолокация

- [ ] **Низкий**: Алгоритм динамических тегов (best-value, last-minute, today-available) — cron
- [ ] **Низкий**: Интеграция геолокации (nearest) на фронтенде

---

## 14. Бэклог (после основных фаз)

- [ ] Мобильное приложение (React Native или PWA) (⏸ 6+ мес)
- [ ] Личный кабинет (история заказов, избранное)
- [ ] **Рекомендательная система (ML)** (⏸ 6+ мес)
- [ ] Программа лояльности, партнёрская программа
- [ ] Мультиязычность (EN)
- [ ] Интеграция с другими билетными системами
- [ ] Telegram-бот: алерты при ошибках
- [ ] Telegram-канал: автопостинг событий и статей

---

## Страницы городов: обязательные условия

- **Мини-описание обязательно** — при добавлении города или отсутствии описания нужно **сгенерировать** его. Без `City.description` город не показывается на /cities.
- **Столица региона** — если город хаб (Region.hubCityId), областные события выводятся под карточкой в «Также в регионе». Реализовано.

---

> **Порядок приоритетов:** платежи (Неделя 1) → контент (1–2) → планировщик MVP (3–4). Подробнее — `docs/Diary.md`.
