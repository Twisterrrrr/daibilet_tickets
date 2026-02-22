# Tasktracker — Агрегатор билетов + Trip Planner

> Последнее обновление: 2026-02-22. Решения по 13 вопросам — `docs/OpenQuestions.md`.

---

## Выполнено 20.02 (главная, каталог, TEPLOHOD)

- [x] **Главная — фильтр по городу**: HeroCitySearch остаётся на /?city=slug; «Популярные» и «Ближайшие» фильтруются; чипы городов как пресеты; ссылки под блоками.
- [x] **Fallback популярных**: при < 8 событий в городе — добивка из общероссийского топа.
- [x] **TEPLOHOD classifyTep**: речные (теплоход, развод мостов, палубн) — EXCURSION+RIVER; EXTREME только для наземных.
- [x] **Скрипт fix-teplohod-river**: перенос EVENT→EXCURSION+RIVER, сброс override. `pnpm run fix:teplohod-river`.
- [x] **Каталог — «Показывать по»**: селектор 20/50/100, limit в URL и API.

---

## To-do (каталог, корзина, экскурсии, teplohod)

- [x] **Высокий**: Единый каталог (Вариант B): GET /catalog, CatalogItem, CatalogCard. category=MUSEUM → Venue, EXCURSION/EVENT → Event. «Музеи и Арт» → /events?category=MUSEUM
- [x] **Высокий**: Скрыть единую корзину (19.02 — CartIcon → null, AddToCartButton → прямой checkout)
- [x] **Высокий**: Страница-шаблон для типа «Экскурсии» (20.02)
  - Таблица тарифов не нужна — «от X ₽» (есть)
  - TemplateDataBlocks: маршрут, меню, теплоход (RIVER), правила, «Прогулка вам понравится», правила бронирования — вывод при заполнении templateData
  - Админка EventTemplateFields: route, menu, shipName, rules, advantages, bookingRules
- [x] **Высокий**: Шаблоны типов событий в админке — EventTemplateFields (16.02)
  - EventOverride.templateData (JSON), миграция `20260216_template_data` — применена (16.02, deploy выполнен)
  - EventCreate + EventEdit: при выборе категории показывается разный набор полей
  - EXCURSION: маршрут, меню, теплоход (RIVER), правила, преимущества, правила бронирования
  - MUSEUM: правила посещения
  - EVENT: программа/сет-лист, состав (артисты), зал, правила
- [x] **Высокий**: Посадочная «Музеи» по городу — `/cities/[slug]/museums` (20.02)
  - Единый шаблон: HERO, Лучший выбор, секции (Главные/Частные/С детьми), каталог, Маршрут дня, FAQ, SEO
  - Ссылки со страницы города: категория «Музеи и Арт», «Все музеи»
  - Контент через getMuseumsLandingContent(citySlug) — СПб заполнен, остальные города — дефолт
- [ ] **Высокий**: Шаблон «Музеи» (детальная страница venue) — см. `docs/PageTemplateSpecs.md` §1
  - Режим работы (Venue.openingHours), галерея, текущие выставки, как добраться, правила (features)
  - Hero: «Режим работы» при OPEN_DATE, «до DD.MM» для временных выставок
- [x] **Высокий**: Шаблон «Мероприятия» (фронт) — TemplateDataBlocks: program, cast, hall, rules (19.02)
- [ ] **Средний**: Реализовать отображение каталога на выбор: карточками или широкими блоками с описанием
- [ ] **Высокий**: Продумать вывод виджетов для teplohod.info — вариант: создать в системе справочник виджетов, в daibilet хранить пары «номер виджета + id прогулки»

---

## Решения 13 вопросов (19.02) — см. OpenQuestions.md

### Критично ✅ (19.02)
- [x] Email для GiftCertificate (шаблон, fulfillment, retry)
- [x] Унификация session.prices (NormalizedPrice, нормализатор shared/price-normalizer)
- [x] Cache invalidation service (CacheInvalidationService, инвалидация при override/event/offer)
- [x] Скрипт reclassify-events.ts (dry-run, apply, diff-лог, pnpm reclassify:dry/apply)

### Высокий
- [x] Скрыть корзину (CartIcon → null, AddToCartButton → «Купить» с редиректом на checkout)
- [x] Аудит PageTemplateSpecs (документ PageTemplateAudit.md, вывод program/cast/hall/route/menu на фронте) — 19.02
- [x] SQL-отчёт подозрительной категоризации (check-categorization.ts, pnpm check:categorization) — 19.02
- [x] GiftCertificate в checkout (поле кода, validate, apply discount) — 19.02
- [x] EventOverride: category + subcategory (в т.ч. clear)

### Позже
- [ ] Планировщик MVP — отложить до 2000+ событий

### Выполнено (19.02)
- [x] Аккаунты: User + UserFavorite, API /user/auth/*, /user/favorites, useFavorites с sync при логине
- [x] Типизация: ESLint `@typescript-eslint/no-explicit-any: warn`
- [x] Supplier: docs/SupplierArchitecture.md, Operator.status, SupplierRole CONTENT/ACCOUNTANT

### Выполнено (21.02)
- [x] **SupplierArchitecture.md** — расширена документация: два режима (Operator/Supplier), архивация, создание контента через ЛК, миграция «закрыли юрлицо»
- [x] **Предложение createdByType** — enum ADMIN | SUPPLIER | IMPORT для Event/Venue (секция 9 в SupplierArchitecture.md)
- [x] **RBAC-чеклист** — матрица прав по ролям, проверки доступа, эндпоинты Supplier (секция 10 в SupplierArchitecture.md)

### To-do (Supplier)
- [x] **Средний**: Добавить Event.createdByType, Venue.createdByType, createdById (миграция 20260221110000)
- [ ] **Средний**: Реализовать RBAC для Supplier (guards, decorators, проверка operatorId)

---

## Далее (приоритетная очередь)

- [x] **Средний**: Admin UI для ручной merge дублей событий (поиск + выбор canonical event)
- [x] **Средний**: Автодедуп (fuzzy-matching по названию, площадка, дата)
- [x] **Средний**: Отзывы на уровне Venue (Review.venueId)
- [x] **Средний**: Sitemap /venues/* — проверить высокий приоритет (сейчас priority 0.9)
- [x] **Средний**: Sitemap index + подсайтмапы (21.02): static, cities-catalog, cities-filters, offers, articles. Спецификация `docs/sitemap-seo-spec.md`
- [x] **Средний**: Prisma SeoTemplate + SeoContent, миграция 20260221000001_add_seo_templates
- [x] **Средний**: Утилиты renderTemplate, getSeason в `@daibilet/shared`
- [x] **Средний**: SeoMeta — универсальный SEO-блок, SeoMetaService, админка (EventEdit, VenueEdit, CityEdit), generateMetadata на /events/[slug] (21.02)
- [x] **Средний**: SeoGeneratorService (anti-thin-content), seed-seo-templates, seo-landing-strategy.md (21.02)

---

## Технические долги

- [x] **Средний** (высокий ROI): sitemap-cities-filters — проверка count ≥ 6 перед добавлением URL (21.02)
- [x] **Средний** (высокий ROI): SeoMeta на venues, cities, blog, combo (21.02)
- [x] **Средний** (частично): createdByType + createdById в Event/Venue (миграция 20260221110000), admin/supplier create. RBAC guards — [ ] в плане
- [x] **Низкий**: Frontend typecheck — ошибки TS исправлены (21.02): VenueCard, CheckoutClient, sitemaps, CatalogCard, page.tsx, events, cities/museums
- [ ] **Низкий**: Типизация `any` (backend ~31, frontend 100+)
- Полный список и обоснование — `docs/TechnicalDebt.md`

---

## Страницы городов: обязательные условия

- **Мини-описание обязательно** — при добавлении нового города или при отсутствии описания нужно **сгенерировать** его для страницы города прежде чем выводить в каталог. Без `City.description` город не показывается на /cities.
- **Столица региона** — если город является хабом региона (Region.hubCityId), все областные события выводятся под его карточкой в блоке «Также в регионе» (как Московская область под Москвой). Реализовано: non-hub города скрыты из основного списка, хаб получает region.slug/name/eventCount.

---

## Стратегия конкуренции: 3 козыря (подробно — Diary.md от 15.02.2026)

### Козырь 1 — Посадочные страницы (SEO-структура)
- [ ] **Критический**: SEO-описания для всех городов (уникальные, не шаблонные)
- [ ] **Критический**: SEO-описания для ТОП-10 площадок (venues)
- [ ] **Высокий**: Тематические лендинги: «Ночные экскурсии СПб», «Музеи Казани с детьми», «Калининград за выходные»
- [ ] **Высокий**: JSON-LD и meta-теги на всех посадочных (города, venues, события, комбо)
- [ ] **Средний**: Внутренняя перелинковка: карточки событий ↔ venue ↔ статьи блога ↔ города

### Козырь 2 — AI-контент (масштабируемый SEO)
- [ ] **Высокий**: 5 SEO-статей для блога (AI-каркас + ручная редактура + привязка к событиям)
- [ ] **Высокий**: Описания ТОП-20 событий (конкретика: цены, как добраться, что рядом)
- [ ] **Средний**: Email-цепочка review request после покупки (наращивание UGC)
- [ ] **Средний**: FAQ-секции на страницах площадок (AI-генерация + проверка)
- [ ] **Низкий**: Сезонные гиды (Белые ночи, Новый год, Майские) — заблаговременно

### Козырь 3 — Планировщик туров (дифференциатор)
- [ ] **Критический**: Планировщик MVP: город + даты + состав → 3 варианта → покупка (без drag-and-drop)
- [ ] **Высокий**: Планировщик v2: drag-and-drop расписание, замена событий
- [ ] **Средний**: Карта маршрута на день (leaflet/mapbox)
- [ ] **Низкий**: Учёт времени переездов между событиями

> **Порядок:** платежи (Неделя 1) → контент (Неделя 1-2) → планировщик MVP (Неделя 3-4)

---

## Production Hardening (15 февраля 2026)

### Выполнено
- [x] **Критический**: FK-индексы: 16 недостающих + 1 композитный (offerId, startsAt) — один db push
- [x] **Высокий**: console.log → NestJS Logger (main.ts, partner-auth.guard.ts, audit.interceptor.ts)
- [x] **Высокий**: Hardcoded teplohod URL → env (TEP_API_URL, TEP_SITE_URL)
- [x] **Средний**: /podborki/* в sitemap (индекс + все подборки)
- [x] **Средний**: Admin-контроллеры: take: 500 → пагинация limit/skip (max 200)

### Выполнено (ночь 15 февраля)
- [x] **Высокий**: CSV cursor-based streaming (csv-stream.util.ts) — 3 экспорта переведены
- [x] **Высокий**: Единый pagination contract (pagination.ts) — 15 контроллеров
- [x] **Средний**: ESLint `no-console: error` + исключения для тестов/seed

### Выполнено (22.02.2026)
- [x] **Frontend build fixes**: JsonLd server-component (без 'use client'), useSearchParams в Suspense (Header, orders/track, planner, events), gift-certificate dynamic
- [x] **C3 — Rate limiting TC/TEP**: api-rate-limit.util (p-limit, withRetry 429/5xx), TcApiService/TepApiService
- [x] **D1 — CacheService контракт**: cacheKeys, delByPrefix, все сервисы переведены
- [x] **D2 — Инвалидация кэша**: CacheInvalidationMatrix.md
- [x] **D3 — TTL policy**: CACHE_TTL_* env
- [x] **E1 — Retention jobs**: RetentionService (EventSession, ProcessedWebhookEvent, AuditLog), cron 04:00
- [x] **E2 — Индексы**: миграция 20260222_e2_performance_indexes
- [x] **E3 — PgBouncer**: docs/PgBouncer.md, infra/pgbouncer/
- [x] **F1 — План партиционирования**: docs/PartitioningPlan.md
- [x] **F2 — Партиционирование EventSession**: create_event_sessions_partition()

### Выполнено (21.02.2026)
- [x] **A1 — requestId + PII masking**: RequestIdMiddleware (лог входа), LoggingInterceptor (лог завершения), AllExceptionsFilter (requestId, maskPiiInString), pii-mask.util + unit test, docs/Observability.md

### Выполнено (16.02.2026)
- [x] **Высокий**: Prisma migrate deploy — идемпотентные миграции (20260215_pre_yookassa_gates, 20260215_review_venue_id, 20260215_soft_delete_and_cascade_safety) для совместимости с базами после db push / migrate dev

### Отложено (backlog)
- [x] **Средний**: ESLint правило: запретить `any` в новых файлах — tools/check-no-any-new-files.ts, pnpm check:no-any-new (22.02)
- [ ] **Низкий**: Типизация `as any` в бэкенде (31 место) — заменить на type guards постепенно
- [ ] **Низкий**: Frontend `any` (100+) — начать с api.ts и DTO types

---

## UX-бэклог: отставание от Tripster (experience.tripster.ru)

> Задачи отсортированы по ROI (визуальный эффект / сложность). Подробный анализ — в `Diary.md` от 15.02.2026.

### Критический приоритет
- [ ] **Hero с фотографией**: полноэкранное фото реального города (карусель 3-4 города) + затемнение + поиск поверх. Текущий тёмный градиент не вызывает эмоцию
- [ ] **Качество фото каталога**: галереи ТОП-20 событий с настоящими фото (не стоковые TC/Teplohod). Ручная замена через админку

### Высокий приоритет
- [ ] **Карусель отзывов на главной**: 5-6 лучших отзывов (имя, город, текст, рейтинг). Сейчас только статичные цифры
- [ ] **Лицо за экскурсией**: на карточке события — фото/имя гида или оператора. Требует `avatar`/`bio` в модели `Operator`
- [ ] **Autocomplete в поиске**: город + начало названия события (вместо простого dropdown)

### Frontend UX — приоритетная очередь
- [x] **Скелетоны загрузки** на `/events` и `/events/[slug]` — уже были
- [x] **Scroll-progress** на мобиле для длинных страниц (% прочитанного)
- [x] **Блок «Похожие места»** на странице площадки (`/venues/[slug]`)
- [x] **Расширенные фильтры** на `/events` — добавлен фильтр по цене (до 500/1000/2000/5000 ₽)
- [x] **Breadcrumbs** на страницах события и площадки — уже были
- [x] **Блок «Ближайшие события»** на главной с фильтром по городу

### Средний приоритет
- [ ] **Страница события**: профиль оператора/гида, маршрут на карте, фото от путешественников
- [ ] **Живое социальное доказательство**: «Забронировано N раз сегодня», «N человек смотрят сейчас»
- [ ] **Мобильный UX**: fixed bottom bar с CTA «Купить», bottom sheet для фильтров

### Низкий приоритет (polish)
- [ ] **Анимации и микроинтеракции**: сердечко избранного, плавные переходы между состояниями
- [ ] **Блог/вдохновение на главной**: 3-4 статьи с фото «Что посмотреть в…»
- [ ] **Персонализация**: «Недавно просмотренные», «На основе ваших интересов»

---

## Понедельный план (февраль-март 2026)

### Неделя 1 — Запуск платежей + контент-база

#### Backend/DevOps
- [ ] **Критический**: .env production: YooKassa ключи, PAYMENT_PROVIDER=YOOKASSA
- [ ] **Критический**: Тестовый платёж в sandbox — 3 сценария (PLATFORM, EXTERNAL, mixed)
- [ ] **Критический**: Deploy: Docker + CI/CD pipeline
- [ ] **Высокий**: Sentry alerts на 5xx и payment failures

#### Контент
- [ ] **Высокий**: Наполнение: описания для всех городов (сейчас у части пусто)
- [ ] **Высокий**: Галереи ТОП-20 событий (качественные фото, не стоковые)
- [ ] **Высокий**: SEO-тексты на /cities/[slug] — уникальные описания под каждый город
- [ ] **Средний**: Проверка категоризации: стендапы не в «Музеи», мастер-классы корректно

#### Фронтенд
- [x] **Высокий**: Error Boundary (root + checkout flow) — «что-то пошло не так» вместо белого экрана
- [ ] **Высокий**: Скелетоны загрузки на каталоге и странице события (вместо пустоты)

### Неделя 2 — Первые продажи + UX polish

#### Backend
- [ ] **Высокий**: Мониторинг первых реальных платежей через reconciliation page
- [ ] **Высокий**: Structured JSON logs → log aggregator (NestJS Logger уже заменён, следующий шаг — pino)
- [ ] **Высокий**: Email шаблоны: order-confirmed, order-completed с красивой вёрсткой

#### Контент
- [ ] **Высокий**: Блог: 3-5 статей под SEO (Что посмотреть в Петербурге за 3 дня, Музеи Казани, Калининград за выходные)
- [ ] **Средний**: FAQ-секции на страницах ТОП-10 площадок (venues)
- [ ] **Средний**: Мета-теги и OG-картинки для шаринга в соцсетях

#### Фронтенд
- [ ] **Высокий**: Web Vitals: LCP < 2.5s, CLS < 0.1 — lazy images, font preload, critical CSS
- [x] **Высокий**: /venues/* в sitemap (priority 0.9)
- [ ] **Высокий**: Мобильная корзина: проверить UX на 375px, fixed bottom bar для «Оформить»
- [x] **Средний**: Breadcrumbs на страницах события и площадки (SEO + навигация) — уже были
- [ ] **Средний**: Фильтры на /events: по дате, по цене, по категории — расширение текущих

### Неделя 3 — Техдолг + конверсия

#### Backend
- [ ] **Высокий**: Типизация tc-sync.service.ts (TcEvent вместо any[])
- [ ] **Высокий**: Proto-generated types для gRPC
- [ ] **Высокий**: JwtPayload вместо req: any
- [ ] **Средний**: where: any → типизированные Prisma where

#### Контент
- [ ] **Высокий**: Подборки: Топ-10 экскурсий Петербурга, Детям, Романтические — как combo/landing pages
- [ ] **Высокий**: Отзывы: запуск email-цепочки review request после покупки
- [ ] **Средний**: Партнёрские описания: quality check текстов от поставщиков

#### Фронтенд
- [ ] **Высокий**: Checkout UX: прогресс-бар (корзина → данные → оплата → готово)
- [ ] **Высокий**: Страница /orders/[id] — трекинг заказа (статус, билеты, контакты)
- [ ] **Высокий**: Push/email уведомления о смене статуса заказа
- [x] **Средний**: Избранное (localStorage) — кнопка на карточке, страница /favorites, Header (19.02)
- [ ] **Средний**: «Недавно просмотренные» на главной

### Неделя 4 — Масштабирование + retention

#### Backend
- [ ] **Высокий**: Feature flags: отключение EXTERNAL по городам с достаточным INTERNAL покрытием
- [ ] **Высокий**: Supplier self-service: портал для добавления событий
- [x] **Высокий**: Review.venueId — отзывы на площадки (выполнено ранее)
- [ ] **Средний**: Нагрузочное тестирование checkout

#### Контент
- [ ] **Высокий**: Расширение географии: новые города по KPI (трафик → контент → офферы)
- [ ] **Средний**: Сезонные лендинги: Белые ночи, Новый год, Майские — заранее
- [ ] **Средний**: Партнёрский контент: гиды, маршруты от локальных экспертов

#### Фронтенд
- [ ] **Высокий**: Планировщик v2: drag-and-drop расписание, карта маршрута на день
- [ ] **Высокий**: Промокоды: поле в checkout, отображение скидки
- [ ] **Средний**: A/B тесты: CTA на карточках, порядок блоков на главной
- [ ] **Средний**: PWA: offline fallback, add to home screen, push notifications
- [ ] **Низкий**: Мультиязычность: подготовка i18n (en как первый иностранный)

---

## Конверсионная оптимизация страницы музея

### Интерактивные компоненты
- [x] **Высокий**: TicketsBlock — мини-календарь OPEN_DATE + количество + дифференцированные offer-карточки
- [x] **Высокий**: MobileStickyBar — IntersectionObserver, показ только при скролле
- [x] **Высокий**: FAQ JSON-LD (FAQPage schema) для SEO

### Backend & Admin
- [x] **Высокий**: Venue publish validation (минимальные поля: title, address, imageUrl, priceFrom, description)
- [x] **Высокий**: Конфигурация комиссий по типу venue (VENUE_COMMISSION_DEFAULTS + getEffectiveCommission)
- [x] **Высокий**: Admin «Конверсия» tab (highlights, features, FAQ, индивидуальная комиссия)
- [x] **Средний**: Backend: highlights/faq/features/commissionRate в admin create/update endpoints

### Следующие шаги (конверсия)
- [x] **Средний**: Scroll-progress indicator на мобиле (% прочитанного) — уже в UX
- [x] **Средний**: «Похожие места» блок на venue page — уже в UX
- [ ] **Низкий**: A/B тестирование CTA-текстов («Купить билет» vs «Выбрать дату»)
- [ ] **Низкий**: Micro-animations для offer cards (hover, selection feedback)

---

## Музеи и Арт — MVP (4-недельный таймлайн)

### Неделя 1 — Данные и контракты (фундамент)
- [x] **Критический**: Enum VenueType, DateMode, модель Venue, расширение Event/EventOffer
- [x] **Критический**: SQL миграция `20260214_venues` (идемпотентная, с verify)
- [x] **Критический**: Public API: GET /venues, GET /venues/:slug
- [x] **Критический**: OPEN_DATE фильтр — events с dateMode=OPEN_DATE не отсеиваются фильтром sessions >= now
- [x] **Критический**: CatalogService.getEvents — 3-ветвичная логика (OPEN_DATE / SCHEDULED / both)
- [x] **Критический**: getCities, fetchCityBySlug, LandingService — OPEN_DATE поддержка

### Неделя 2 — Админка и контент-операции
- [x] **Критический**: AdminVenuesController CRUD (list, get, create, update с optimistic lock, soft delete)
- [x] **Критический**: VenuesList + VenueEdit (табы: основное, расположение, часы, галерея, SEO, выставки, офферы)
- [x] **Высокий**: EventEdit — venueId select, dateMode toggle, isPermanent/endDate поля
- [x] **Высокий**: PATCH :id/venue-settings endpoint (прямое обновление Event → venueId/dateMode/isPermanent/endDate)
- [x] **Высокий**: Seed 25 venue (12 СПб + 13 МСК) — seed-venues.ts (idempotent)

### Неделя 3 — Публичный фронт
- [x] **Критический**: /venues/[slug] — hero, описание, галерея, часы работы, билеты, выставки, JSON-LD
- [x] **Критический**: /venues — каталог с VenueCard, фильтры город/тип/сортировка, пагинация
- [x] **Критический**: VenueCard, VenueFilters компоненты
- [x] **Высокий**: Header "Музеи и Арт" → /venues (обновлено 16.02: теперь → /events?category=MUSEUM через единый каталог)
- [x] **Высокий**: EventCard — dateMode=OPEN_DATE badge + пробросить prop
- [x] **Высокий**: Event page — ссылка на venue
- [x] **Высокий**: Quick filter «Открытая дата» в QUICK_FILTERS.MUSEUM

### Неделя 3.1 — Метрики и навигация (города, Hero, футер)

- [x] **Высокий**: Счётчик «Музеи и арт» на странице города и в списках городов = активные площадки (venues) + активные события с `venueId` (SCHEDULED с будущими сеансами + OPEN_DATE не истёк).
- [x] **Средний**: Список городов `/cities` и блок «Города» на главной используют `museumCount` вместо чистого `_count.venues`, сохраняя совместимость при отсутствии поля. (закрыто 16.02)
- [x] **Средний**: Hero на главной — текст «N+ событий и мест в M городах России», счётчики считаются только по городам, которые реально отображаются после фильтров `getCities`.
- [x] **Средний**: Header — скрыта иконка корзины, добавлен селектор города (featured-города) с синхронизацией `?city=` в каталоге `/events`.
- [x] **Средний**: Футер — динамическая колонка «Города»: top-города по `events + museumCount`, без числовых подписей, порядок секций «Каталог → Города → Компания».
- [x] **Средний**: Фильтры каталога `/events` — URL как единый источник истины (city, category, sort, tag, date, page и др.). Смена города в Header сохраняет «Начнутся скоро» и остальные фильтры. Подробнее: `docs/Diary.md` (16.02.2026).

### Неделя 4 — SEO-упаковка и перелинковка
- [x] **Высокий**: JSON-LD: Museum/Gallery/Park + makesOffer (open-date без startDate) + openingHoursSpecification (нормализация RU→EN)
- [x] **Высокий**: Venue page → «Читайте также» (связанные статьи по городу)
- [x] **Высокий**: Blog article page → секция «Музеи и арт-пространства» с VenueCard по городу
- [x] **Высокий**: VenueService.getRelatedArticles + VenueController возвращает relatedArticles
- [ ] **Средний**: Контентный план — 30 статей по городам (генерация через ArticlePlanner)

### Синхронизация и заголовки
- [x] **Средний**: EventOverride.title — кастомный заголовок для Daibilet; Event.title сохраняет оригинал из источника для импорта/экспорта. Подробнее: `docs/Diary.md` (16.02.2026).
- [ ] **Низкий**: EventEdit — показывать «Оригинал (из источника)» и «Для Daibilet» рядом с полем названия для ясности.

### Исправления багов
- [x] **Средний**: TS: adminNotes → adminNote в partner-orders.controller.ts
- [x] **Средний**: TS: subcategories cast в admin-events.controller.ts
- [x] **Средний**: openingHours: нормализация русских ключей (Пн/Вт) → EN (mon/tue) на venue page

### Отложено (после MVP)
- [x] **Средний**: Отзывы на уровне Venue (Review.venueId)
- [x] **Низкий**: Sitemap: /venues/* с priority 0.9
- [ ] **Средний**: Агрегация выставок: isPermanent + endDate сортировка "сейчас идёт / скоро закончится"
- [ ] **Средний**: Импорт внешних рейтингов (Яндекс/2ГИС) для топ-venue

---

## Partner B2B API — Интеграция с внешними поставщиками

### Модели и миграция
- [x] **Критический**: Модель ApiKey (keyHash SHA-256, prefix, rateLimit, ipWhitelist, expiresAt)
- [x] **Критический**: Расширение Operator — webhookUrl + webhookSecret
- [x] **Критический**: SQL миграция `20260214_partner_api` (идемпотентная)

### Аутентификация
- [x] **Критический**: ApiKeyGuard — Bearer dbl_xxx..., проверка isActive/expiresAt/IP, fire-and-forget lastUsedAt

### Partner CRUD (каталог)
- [x] **Высокий**: POST /partner/events — upsert по externalId (создание + обновление)
- [x] **Высокий**: PUT /partner/events/:externalId — обновление события
- [x] **Высокий**: DELETE /partner/events/:externalId — деактивация
- [x] **Высокий**: POST /partner/events/:externalId/offers — upsert оффера
- [x] **Высокий**: PUT /partner/offers/:externalId — обновление оффера
- [x] **Высокий**: PATCH /partner/offers/:externalId/availability — быстрое обновление наличия/цены
- [x] **Средний**: GET /partner/whoami — информация о ключе и операторе

### Partner Orders (заказы)
- [x] **Высокий**: GET /partner/orders — список заказов (фильтры: status, from, to, пагинация)
- [x] **Высокий**: GET /partner/orders/:id — детали заказа
- [x] **Высокий**: POST /partner/orders/:id/confirm — подтверждение (через state machine)
- [x] **Высокий**: POST /partner/orders/:id/reject — отклонение (через state machine)

### Partner Reports
- [x] **Средний**: GET /partner/reports/sales — продажи за период (JSON + CSV)

### Webhook
- [x] **Высокий**: PartnerWebhookService — BullMQ очередь partner-webhooks
- [x] **Высокий**: PartnerWebhookProcessor — POST на webhookUrl, HMAC-SHA256 подпись
- [x] **Высокий**: 3 ретрая с exponential backoff (5s → 10s → 20s)
- [x] **Средний**: Типы: order.created, order.cancelled, payment.paid, payment.refunded

### Admin: управление ключами + webhook
- [x] **Высокий**: POST /admin/suppliers/:id/api-keys — генерация (plain-text один раз)
- [x] **Высокий**: GET /admin/suppliers/:id/api-keys — список ключей
- [x] **Высокий**: DELETE /admin/suppliers/:id/api-keys/:keyId — отзыв
- [x] **Высокий**: PATCH /admin/suppliers/:id/webhook — настройка URL + автогенерация секрета
- [x] **Высокий**: Admin UI — секция «API Интеграция» в SupplierDetail (ключи, генерация, копирование, webhook)

---

## Supplier Portal — Маркетплейс

### Модели и миграция
- [x] **Критический**: Расширение Operator → Supplier (isSupplier, trustLevel, commission, promo, YooKassa, ИНН)
- [x] **Критический**: SupplierUser модель + SupplierRole enum
- [x] **Критический**: ModerationStatus enum + поля moderation на Event
- [x] **Критический**: PaymentIntent split-поля (supplierId, grossAmount, platformFee, supplierAmount)
- [x] **Критический**: SQL миграция (идемпотентная)

### Supplier Auth
- [x] **Критический**: JWT стратегия jwt-supplier (отдельная от admin)
- [x] **Критический**: Регистрация поставщика (Operator + SupplierUser транзакция)
- [x] **Критический**: Логин + refresh token (HttpOnly cookie)
- [x] **Критический**: SupplierJwtGuard + SupplierRolesGuard

### Supplier CRUD
- [x] **Высокий**: CRUD событий (supplier/events) — только свои
- [x] **Высокий**: CRUD офферов (supplier/events/:id/offers)
- [x] **Высокий**: Модерация по Trust Level (PENDING_REVIEW / AUTO_APPROVED)
- [x] **Высокий**: Dashboard поставщика (статистика, финансы)
- [x] **Высокий**: Отчёты о продажах + CSV экспорт
- [x] **Высокий**: Настройки профиля поставщика

### Admin: управление маркетплейсом
- [x] **Высокий**: Список поставщиков + детали + финансовая сводка
- [x] **Высокий**: Управление Trust Level / комиссией / промо
- [x] **Высокий**: Очередь модерации (approve / reject с причиной)
- [x] **Высокий**: Аналитика по поставщикам (топ по доходу)

### Frontend
- [x] **Высокий**: Supplier Portal (Vite + React) — Login, Register, Dashboard, Events CRUD, Reports, Settings
- [x] **Высокий**: Admin: страницы Поставщики и Модерация + sidebar

### Split Payment
- [x] **Высокий**: Commission calculation в PaymentService (effectiveRate + promo)
- [x] **Высокий**: Split-ready данные в PaymentIntent (snapshot ставки)
- [x] **Средний**: successfulSales increment при оплате
- [ ] **Средний**: Подключение YooKassa Split API (после получения ключей)

---

## Легенда

- **Приоритет**: Критический / Высокий / Средний / Низкий
- **Статус**: `[ ]` не начато, `[~]` в работе, `[x]` выполнено, `[-]` отменено

---

## Фаза 1 UX: Afisha-inspired улучшения

> Источник: сравнительный анализ с Яндекс.Афишей (2026-02-12)

### Этап 1: Quick Wins (лента дат + бейджи)

- [x] **Критический**: `DateRibbon` — горизонтальная лента дат (сегодня/завтра/выходные + 12 дней) на /events
- [x] **Критический**: Интеграция ленты дат с `dateFrom`/`dateTo` в API (бэкенд уже поддерживает)
- [x] **Высокий**: Расширить API `/events` — включить sessions summary (ближайший сеанс, свободные места)
- [x] **Высокий**: `optimalScore` — алгоритм выбора (рейтинг 40% + цена/длительность 30% + загрузка 30%)
- [x] **Высокий**: Смарт-бейджи на `EventCard`: "Оптимальный выбор", "Осталось N мест", ближайший сеанс
- [x] **Средний**: Каркас Prisma: Location (PIER/VENUE/MEETING_POINT), Operator, Route + миграция

### Мульти-офферная архитектура (EventOffer)

- [x] **Критический**: Починить админку EventEdit.tsx: PATCH /override вместо PUT, isHidden toggle, фильтр скрытых
- [x] **Критический**: Prisma: модель `EventOffer` (OfferSource, OfferStatus, PurchaseType) + `Event.canonicalOfId` + `EventSession.offerId`
- [x] **Критический**: Data migration: 269 offers из существующих Event + 2247 sessions → offerId
- [x] **Критический**: TC Sync + Teplohod Sync: upsert EventOffer параллельно с Event, offerId в sessions
- [x] **Критический**: API `getEvents` / `getEventBySlug`: include offers, primaryOffer в ответе, фильтр дублей (canonicalOfId)
- [x] **Высокий**: Admin: секция офферов (таблица, status toggle, set primary) + endpoints (GET/PATCH/POST merge)
- [x] **Высокий**: Frontend BuyCard: CTA по primaryOffer.purchaseType (TC_WIDGET / REDIRECT / BuyModal)
- [x] **Средний**: Admin: UI для ручного merge дублей (поиск + выбор canonical event)
- [x] **Средний**: Автодедуп: fuzzy matching по названию + площадка + дата (Фаза будущая)
- [ ] **Низкий**: Автовыбор primary по правилам (комиссия/цена/наличие)

### Этап 2: SEO-машина + новые страницы (планируется)

- [ ] **Высокий**: 5 SEO-подборок на город (развод мостов, лучшие по отзывам, дешёвые, поздние рейсы, с детьми)

### Подборки (Collections) и сезонные промо

- [x] **Средний**: Public API: GET /collections, GET /collections/:slug + AdminCollectionsController, UI-редактор подборок.
- [x] **Средний**: PromoBlock — сезонные промо на главной (зима/навигция) переведены на Collection-модель:
  - `den-vlyublennyh` (tag=romantic, promo.months=[2])
  - `maslenitsa` (subcategory=GASTRO, promo.months=[2,3])
  - `zimniy-gorod` (tag=bad-weather-ok, promo.months=[11,12,1,2,3])
  - `kanikuly-s-detmi` (audience=KIDS, promo.months=[1,3,6,7,8])
- [x] **Средний**: PromoBlock на главной ведёт на `/podborki/{slug}` вместо прямых фильтров `/events?...`, логика отбора событий задаётся в админке через фильтры/пинning/исключения.
- [ ] **Высокий**: Страницы причалов (/cities/:slug/piers/:pier)
- [ ] **Высокий**: Страницы маршрутов (/routes/:slug)
- [ ] **Средний**: Перелинковка: событие — причал — маршрут — подборка
- [ ] **Средний**: Улучшить карточку события: блок "как проходит", фото палуб, условия возврата

### Этап 3: Персонализация + удержание (планируется)

- [ ] **Высокий**: Геолокация: ближайший причал + время доезда
- [ ] **Высокий**: Погодный бейдж: комфортно/ветрено + рекомендация
- [ ] **Средний**: "Следить за ценой" — push/email при снижении
- [ ] **Средний**: Постпокупочный слой: напоминание + чек-лист + "как найти причал"
- [ ] **Средний**: TripCombo upsell: мосты + напиток/плед/фото

---

## Фаза 1: Фундамент (неделя 1-2)

### 1.1 Инфраструктура

- [x] **Критический**: Инициализировать monorepo (pnpm workspaces): `packages/backend`, `packages/frontend`, `packages/shared`
- [x] **Критический**: Docker Compose: postgres:16, redis:7 (порт 5433 из-за конфликта)
- [x] **Критический**: Настроить `.env.example` со всеми переменными (без секретов)
- [x] **Высокий**: Настроить ESLint + Prettier для всего monorepo (22.02: eslint.config.mjs, simple-import-sort, react-hooks, format:check/write, pnpm lint)
- [x] **Средний**: GitHub Actions: lint → test → build — check-no-any-new, lint, typecheck, test, build (22.02)

### 1.3 Подготовка к продакшен-деплою

- [x] **Критический**: `.dockerignore` — исключение node_modules, .next, .env, dist, .git
- [x] **Критический**: Health check endpoint `GET /api/v1/health` (PostgreSQL + Redis)
- [x] **Критический**: `next.config.ts` — `output: 'standalone'`, условные rewrites (только dev)
- [x] **Критический**: `Dockerfile.backend` — multi-stage, monorepo-aware, prisma generate
- [x] **Критический**: `Dockerfile.frontend` — multi-stage, standalone output, non-root user
- [x] **Критический**: `Dockerfile.admin` — multi-stage Vite SPA build, Nginx static, SPA fallback, healthcheck
- [x] **Критический**: `nginx/default.conf` — reverse proxy, SSL, gzip, rate limiting, security headers + admin.daibilet.ru
- [x] **Критический**: `docker-compose.prod.yml` — 7 сервисов (pg, redis, backend, frontend, admin, nginx, certbot)
- [x] **Высокий**: `.env.example` — обновлён с production checklist и командами генерации
- [x] **Высокий**: `deploy.sh` — полный скрипт: Docker, Git, UFW, SAN-SSL, авто-пароли, миграции, seed, cron
- [x] **Высокий**: `REPO_URL` заполнен в deploy.sh (github.com/Twisterrrrr/daibilet_tickets.git)
- [ ] **Средний**: CI/CD: GitHub Actions для автодеплоя на VPS

### 1.5 Деплой на Timeweb Cloud

> **Перед deploy:** пройти `docs/PreDeployChecklist.md` (env, security, smoke-план).

- [ ] **Критический**: Создать VPS на Timeweb Cloud (Ubuntu 22.04/24.04, 2 CPU, 4 GB RAM, 50 GB NVMe)
- [ ] **Критический**: Настроить DNS A-записи: daibilet.ru, www.daibilet.ru, admin.daibilet.ru → IP VPS
- [ ] **Критический**: SSH на сервер, запустить `deploy.sh` (первый раз — создаст .env с паролями)
- [ ] **Критический**: Заполнить TC_API_TOKEN и TC_WIDGET_TOKEN в .env на сервере
- [ ] **Критический**: Перезапустить deploy.sh — сборка контейнеров, миграции, seed
- [ ] **Высокий**: Проверить https://daibilet.ru (публичный сайт)
- [ ] **Высокий**: Проверить https://admin.daibilet.ru (админ-панель, логин с credentials из deploy output)
- [ ] **Высокий**: Проверить https://daibilet.ru/api/v1/health (API health check)
- [ ] **Средний**: Проверить SSL-сертификат (SAN: 3 домена, auto-renewal cron)
- [ ] **Средний**: Первый бэкап БД: `docker exec daibilet-postgres pg_dump -U daibilet daibilet > backup.sql`

### 1.4 Посадочные страницы (лендинги)

- [x] **Критический**: Prisma — модель `LandingPage` (slug, cityId, filterTag, JSON-контент)
- [x] **Критический**: Prisma — поле `isFeatured` в City
- [x] **Критический**: Backend — `LandingModule` (GET /landings, GET /landings/:slug с вариантами и фильтрами)
- [x] **Высокий**: 6 новых тегов для лендингов + обновление KEYWORD_TAG_MAP
- [x] **Высокий**: `getCities(?featured=true)` — фильтрация городов на главной
- [x] **Критический**: Frontend — шаблон `/cities/[slug]/[landingSlug]` (Hero, FilterBar, ComparisonTable, VariantCards, FAQ, Reviews)
- [x] **Высокий**: Seed — 5 featured-городов + 6 лендингов с полным контентом
- [x] **Критический**: Автоматизировать retag — встроен в `tcSync.syncAll()` + финальный retag в `/sync/all`
- [x] **Высокий**: Добавить лендинги для Нижнего Новгорода — 3 лендинга (Волга, Кремль, Канатная дорога)
- [x] **Высокий**: ISR/SSG для лендингов — `revalidate` 6ч + `generateStaticParams`
- [x] **Высокий**: Добавить `additionalFilters Json?` в `LandingPage` для масштабирования
- [x] **Высокий**: Создать `sitemap.xml` (динамический) + `robots.txt`
- [ ] **Низкий**: Геолокация «Ближайший причал» — Phase 2

### 1.2 База данных

- [x] **Критический**: Prisma schema: модель `City` (slug, name, description, lat/lng, timezone, seo-поля)
- [x] **Критический**: Prisma schema: модель `Event` (tcEventId, cityId, title, slug, category, subcategory, minAge, duration, lat/lng, indoor, rating, priceFrom, tcData JSONB)
- [x] **Критический**: Prisma schema: модель `EventSession` (eventId, tcSessionId, startsAt, endsAt, availableTickets, prices JSONB)
- [x] **Критический**: Prisma schema: модель `Tag` (slug, name, category enum) + `EventTag` (связь M2M)
- [x] **Критический**: Enum'ы: EventCategory, TagCategory, Intensity, DaySlot, PackageStatus, PackageItemStatus
- [x] **Высокий**: Seed-данные: 4 города + 16 автоматически из TC + 15 тегов
- [x] **Средний**: Индексы: составной (city_id, category), по slug, по starts_at

### 1.3 Catalog Service (Backend)

- [x] **Критический**: Модуль `CatalogModule` (NestJS) — подключение к TC REST API v1
- [x] **Критический**: Сервис `TcSyncService` — полная синхронизация (2194 событий TC → 2194 в БД)
- [x] **Критический**: Интеграция teplohod.info — `TepApiService` + `TepSyncService` (784 события)
- [x] **Критический**: Enum `EventSource` (TC / TEPLOHOD) + поле `source` в Event
- [x] **Высокий**: Эндпоинты: `GET /tep/discover`, `POST /tep/sync`, `POST /sync/all`
- [x] **Критический**: BullMQ job: `sync-full` (cron `0 0 0,6,12,18 * * *` — каждые 6ч; TC + TEP + retag + combo + cache invalidation)
- [x] **Критический**: BullMQ job: `sync-incremental` (cron `0 30 * * * *` — каждые 30 мин; TC sync + cache invalidation)
- [x] **Высокий**: Маппинг категорий TC → наши (EXCURSION / MUSEUM / EVENT / KIDS) по ключевым словам
- [x] **Высокий**: Маппинг категорий teplohod.info → наши + фичи → теги
- [ ] **Высокий**: Redis-кэш: списки событий (TTL 10 мин), детали (TTL 5 мин), сессии (TTL 3 мин)
- [ ] **Средний**: Автоматическое определение координат по адресу (Яндекс Геокодер или ручное)
- [x] **Средний**: Полный API teplohod.info (с расписанием) — IP в белом списке, реальные сессии из eventTimes (55 событий, ~2000 сессий)

### 1.3.1 gRPC tc-simple (миграция каталога TC)

- [x] **Критический**: Установить `@grpc/grpc-js` + `@grpc/proto-loader` в backend
- [x] **Критический**: Скопировать proto-файлы из ticketscloud/docs в `packages/backend/proto/tc-simple/`
- [x] **Критический**: `TcGrpcService` — gRPC-клиент к `simple.ticketscloud.com:443` (SSL, авторизация через metadata)
- [x] **Критический**: Методы: fetchEvents, fetchMetaEvents, fetchVenues, fetchCities, fetchTags, fetchCategories
- [x] **Критический**: Переписать `TcSyncService.syncAll()` — MetaEvent-based группировка вместо title-based дедупликации
- [x] **Критический**: Prisma: добавить поле `tcMetaEventId` в модель Event + индекс + миграция
- [x] **Высокий**: Переменные: `TC_GRPC_ENDPOINT`, `TC_SYNC_MODE` (grpc/rest)
- [x] **Высокий**: Fallback: при ошибке gRPC автоматически переключается на REST v1
- [x] **Высокий**: Зарегистрировать `TcGrpcService` в `CatalogModule`
- [x] **Высокий**: Тест: 2127 events → 87 MetaEvent-групп + 194 одиночных = 281 уникальных (0 ошибок)
- [ ] **Средний**: Оптимизация: фильтровать Cities/Venues по нужным ID вместо загрузки всех
- [ ] **Низкий**: gRPC Seats — наличие конкретных мест (для мероприятий с рассадкой)

### 1.4 Frontend (Next.js)

- [x] **Критический**: Инициализировать Next.js 14+ (App Router) + TypeScript + TailwindCSS
- [x] **Критический**: Layout: header (лого, навигация, выбор города), footer
- [x] **Высокий**: Компонент `EventCard` (изображение, название, категория, цена, рейтинг)
- [x] **Высокий**: Компонент `CityCard` (изображение, название, кол-во событий)
- [x] **Средний**: Подключение React Query для API-запросов

---

## Фаза 2: MVP Агрегатор (неделя 2-4)

### 2.1 API каталога

- [x] **Критический**: `GET /api/v1/events` — список с фильтрами (city, category, tag, date, price, sort, page)
- [x] **Критический**: `GET /api/v1/events/:slug` — карточка события (+ сессии, связанные, теги)
- [x] **Критический**: `GET /api/v1/cities` — список городов (отсортирован по убыванию событий)
- [x] **Критический**: `GET /api/v1/cities/:slug` — страница города (+ топ-события, статистика по категориям, must-see места, популярные теги)
- [x] **Высокий**: `GET /api/v1/tags` — список тегов (с фильтром по категории)
- [x] **Высокий**: `GET /api/v1/tags/:slug` — лендинг тега (+ события с пагинацией)
- [x] **Средний**: `GET /api/v1/search?q=` — полнотекстовый поиск по событиям, городам, тегам
- [x] **Критический**: `GET /api/v1/tc/discover` — проверка доступности TC API
- [x] **Критический**: `POST /api/v1/tc/sync` — ручной запуск синхронизации

### 2.2 Страницы фронтенда

- [x] **Критический**: Главная страница: герой-баннер, города из API (отсортированы по событиям), категории
- [x] **Критический**: Страница города (`/cities/:slug`): must-see достопримечательности, статистика, категории с кол-вом, рекомендуемые + ещё события
- [x] **Критический**: Каталог (`/events`): фильтры (город, категория, даты, цена), сортировка, пагинация
- [x] **Критический**: Карточка события (`/events/:slug`): hero-секция, описание с HTML, сессии, цены, кнопка «Купить» → TC, похожие
- [x] **Высокий**: Лендинг тега (`/tags/:slug`): описание, события по тегу
- [x] **Высокий**: SSR fix — серверные запросы идут напрямую на бэкенд (абсолютный URL)
- [x] **Высокий**: Mobile-first адаптивная вёрстка (2-col grid на мобайле, горизонтальный скролл табов, touch targets 44px, safe area, scrollbar-hide)
- [x] **Средний**: Поиск: SearchAutocomplete в header (debounced, города+события, fullscreen на мобайле, популярные запросы)

### 2.3 SEO (MVP)

- [x] **Критический**: SSG для страниц городов и тегов (revalidate 6 ч) — generateStaticParams + ISR
- [x] **Критический**: SSG для карточек событий (revalidate 1ч + generateStaticParams, топ-200 событий)
- [x] **Критический**: Meta-теги (title, description) для городов, событий, тегов, статей
- [x] **Высокий**: JSON-LD: Event (offers, location, startDate), Place (geo), BreadcrumbList
- [x] **Высокий**: sitemap.xml (динамический) + robots.txt

### 2.4 Надёжность каталога

- [x] **Критический**: Cron sync TC (полная + инкрементальная через @nestjs/schedule)
- [x] **Критический**: Cron sync Teplohod (в рамках полной синхронизации каждые 6ч)
- [x] **Критический**: Redis-кэш (города 1ч, события 5-10мин, лендинги 30мин, поиск 2мин)
- [x] **Критический**: Инвалидация кэша после sync (SCAN + DEL по паттерну)
- [x] **Высокий**: Дедупликация: cron 1/сутки в 03:00
- [x] **Высокий**: Health check с Redis статусом

### 2.5 Аналитика

- [x] **Критический**: Яндекс Метрика (скрипт + webvisor + ecommerce dataLayer)
- [x] **Критический**: Цели: event_view, widget_open, buy_click, purchase_success
- [x] **Высокий**: Цели: planner_start, planner_result, combo_view, landing_view
- [x] **Высокий**: Типизированные хелперы analytics.ts
- [x] **Средний**: NEXT_PUBLIC_YM_ID добавлен в .env и .env.example — счётчик создан и подключён
- [x] **Высокий**: sitemap.xml — автогенерация из БД (реализовано ранее)
- [x] **Высокий**: robots.txt (реализовано ранее)
- [ ] **Средний**: OpenGraph и Twitter Cards для шеринга

### 2.4 Покупка (MVP — через TC API v2)

- [x] **Высокий**: Кнопка «Купить билет» на карточке события → модалка выбора билетов
- [x] **Критический**: `POST /api/v1/checkout/tc` — создание заказа в TC API v2 (резерв билетов на 15 мин)
- [x] **Критический**: `POST /api/v1/checkout/tc/:id/confirm` — подтверждение заказа (status: done)
- [x] **Критический**: `POST /api/v1/checkout/tc/:id/cancel` — отмена заказа
- [x] **Высокий**: BuyModal: выбор сеанса + типов билетов → API → экран подтверждения/ошибки
- [x] **Высокий**: Исправлены битые URL (TC виджет и teplohod.info — оба 404)
- [x] **Критический**: TC inline-виджет (`tcwidget.js`) — полный цикл покупки через виджет TC
- [-] ~~Интеграция YooKassa — не нужна, оплата через виджет TC (реквизиты партнёра)~~
- [ ] **Средний**: Отслеживание кликов для аналитики конверсии

---

## Фаза 3: Trip Planner (неделя 4-6)

### 3.1 Backend Planner Service

- [x] **Критический**: Модуль `PlannerModule` (NestJS)
- [x] **Критический**: `POST /api/v1/planner/calculate` — основной эндпоинт подбора программы
- [x] **Критический**: Алгоритм: разбивка дней на слоты (утро/день/вечер)
- [x] **Критический**: Алгоритм: scoring событий (5 факторов: рейтинг, категория×слот, цена, популярность, длительность)
- [x] **Критический**: Формирование 3 вариантов (эконом / оптимальный / премиум) с дедупликацией
- [x] **Высокий**: Учёт насыщенности (relaxed=2 / normal=3 / active=4 слота) — кол-во слотов
- [x] **Высокий**: Фильтрация по возрасту детей (minAge)
- [x] **Высокий**: `POST /api/v1/planner/customize` — замена события в слоте с пересчётом цен
- [ ] **Средний**: Учёт геолокации (минимизация переездов между событиями)
- [x] **Средний**: Конфигурируемые веса scoring-алгоритма (через VARIANT_CONFIG)
- [ ] **Низкий**: Учёт погоды (indoor при дожде) — через внешний API

### 3.2 Frontend Trip Planner

- [x] **Критический**: Страница `/planner` — пошаговый wizard (5 шагов: город→даты→группа→интенсивность→результаты)
- [x] **Критический**: Страница результатов: полный UI с 3 тирами (Эконом/Оптимальный/Премиум), визуальным различием, breakdown, upsell-выбором
- [x] **Высокий**: Детальный просмотр варианта: таймлайн по дням со слотами, изображениями, ценами, остатками мест
- [ ] **Высокий**: Кнопка «Заменить» на каждом слоте → модалка выбора альтернативного события
- [ ] **Высокий**: Кнопка «Оплатить программу» → переход в checkout
- [ ] **Средний**: Анимации переходов между шагами wizard
- [ ] **Низкий**: Сохранение программы в localStorage

### 3.3 Монетизация и Pricing

- [x] **Критический**: `PricingService` — Global модуль для расчёта цен
- [x] **Критический**: Service fee (% из env, 0% для MVP)
- [x] **Критический**: Динамическая наценка (пиковые даты + last-minute)
- [x] **Критический**: `calculateBreakdown()` — полная разбивка (base, fee, markup, upsell, grand, perPerson, commission)
- [x] **Высокий**: Upsell-каталог: 10 предложений по городам (ужин, трансфер, VIP, фото, гастро)
- [x] **Высокий**: API: `GET /pricing/config`, `GET /pricing/upsells?city=xxx`
- [x] **Высокий**: Агентская комиссия TC (10% по умолчанию) — estimatedCommission для аналитики
- [ ] **Средний**: Админ-панель: настройка pricing параметров через UI
- [ ] **Низкий**: Динамические upsell из БД (сейчас hardcoded)

### 3.4 Combo-страницы (SEO-индексируемые программы)

- [x] **Критический**: Prisma модель `ComboPage` (slug, curatedEvents, features, faq, suggestedPrice)
- [x] **Критический**: Backend: `ComboModule` с `GET /combos` и `GET /combos/:slug`
- [x] **Критический**: Frontend: `/combo` (каталог) + `/combo/[slug]` (детальная с ISR)
- [x] **Высокий**: Schema.org Product JSON-LD на каждой combo-странице
- [x] **Высокий**: 5 seed combo-страниц (3 СПб + 2 Москва)
- [x] **Высокий**: Sitemap обновлён с combo (priority 0.85)
- [x] **Средний**: Auto-fill curatedEvents — ComboService автоматически подбирает события из города, раскладывает по дням/слотам, сохраняет в БД
- [x] **Средний**: API: POST /combos/:slug/populate, POST /combos/populate-all для ручного пересбора
- [x] **Средний**: Scheduler: auto-populate всех combo после полной синхронизации (каждые 6ч)
- [x] **Высокий**: SEO-стабильность: populateAll не перезаписывает валидные curatedEvents (порог >30% невалидных)
- [x] **Средний**: Фактор новизны в scoring: combo (+15 баллов / 30 дней) и planner (+8 баллов / 30 дней)
- [x] **Средний**: Умный scheduler: O(1 count) проверка валидности, лог checked/changed
- [ ] **Средний**: Combo для Казани, Владимира, Ярославля, Нижнего Новгорода

---

## Фаза 4: Checkout + Voucher (неделя 6-8)

### 4.1 YooKassa интеграция

- [ ] **Критический**: Зарегистрировать магазин в YooKassa, получить shopId + secretKey
- [ ] **Критический**: Модуль `PaymentModule` (NestJS) — работа с YooKassa API v3
- [ ] **Критический**: Создание платежа (POST /v3/payments) с redirect confirmation
- [ ] **Критический**: Webhook handler: `payment.succeeded`, `payment.canceled`
- [ ] **Критический**: Верификация webhook (IP whitelist + подпись)
- [ ] **Высокий**: Тестирование на sandbox YooKassa перед продакшеном

### 4.2 Checkout Service

- [ ] **Критический**: `POST /api/v1/checkout` — создание Package + платёж в YooKassa
- [ ] **Критический**: BullMQ job `fulfill-package`: после оплаты — создание заказов в TC API
- [ ] **Критический**: Для каждого PackageItem: POST /orders → PATCH (билеты) → POST /done в TC
- [ ] **Критический**: `GET /api/v1/checkout/:packageId/status` — статус пакета
- [ ] **Высокий**: Prisma schema: модели `Package`, `PackageItem`
- [ ] **Высокий**: Обработка ошибок: если TC order failed → partial refund через YooKassa
- [ ] **Высокий**: Идемпотентность: повторная обработка webhook не дублирует заказы
- [ ] **Средний**: Таймаут: Package в PENDING_PAYMENT > 30 мин → отмена

### 4.3 Voucher Service

- [ ] **Критический**: Prisma schema: модель `Voucher` (shortCode, qrCodeUrl, pdfUrl, publicUrl)
- [ ] **Критический**: Генерация QR-кода (библиотека qrcode)
- [ ] **Критический**: `GET /api/v1/vouchers/:shortCode` — данные ваучера для мобильной страницы
- [ ] **Высокий**: PDF-генерация (puppeteer или @react-pdf/renderer) с программой по дням
- [ ] **Высокий**: Мобильная страница `/v/:shortCode` — таймлайн, статус билетов, карта
- [ ] **Высокий**: Email: отправка ваучера клиенту + дубль на admin email
- [ ] **Средний**: `GET /api/v1/vouchers/:shortCode/pdf` — скачивание PDF
- [ ] **Низкий**: PWA-кэширование мобильной страницы ваучера для оффлайн-доступа

### 4.4 Frontend Checkout

- [ ] **Критический**: Страница `/checkout/:packageId` — сводка заказа + редирект на YooKassa
- [ ] **Критический**: Страница `/checkout/:packageId/status` — polling статуса + ссылка на ваучер
- [ ] **Высокий**: Форма данных клиента (имя, email, телефон) с валидацией (Zod)
- [ ] **Средний**: Анимация ожидания (пока идёт создание TC-заказов)

---

## Фаза 5: Контент + SEO (неделя 8-10)

### 5.1 Blog Service

- [x] **Высокий**: Prisma schema: модели `Article`, `ArticleEvent`, `ArticleTag`
- [x] **Высокий**: API: `GET /api/v1/blog`, `GET /api/v1/blog/:slug`, `POST /api/v1/blog/generate`
- [x] **Высокий**: Рендеринг Markdown → HTML с подстановкой карточек событий
- [x] **Средний**: Автоматическая перелинковка: статья → события, города
- [ ] **Средний**: JSON-LD: Article schema для каждой статьи
- [x] **Высокий**: Фронтенд: `/blog` (сетка карточек), `/blog/[slug]` (статья + связанные события)

### 5.2 Контент

- [x] **Высокий**: Must-see описания для 7 стартовых городов (SPb, Moscow, Kazan, Kaliningrad, Ekaterinburg, N.Novgorod, Novosibirsk)
- [ ] **Высокий**: Создать 10-15 тегов (с описаниями и SEO-полями)
- [x] **Средний**: Автогенерация 53 SEO-статей для городов (обзор + экскурсии)
- [x] **Средний**: Перелинковка статей с событиями и городами через `articleEvents`
- [ ] **Средний**: Ручные авторские статьи для улучшения качества контента

### 5.3 SEO-оптимизация

- [ ] **Высокий**: Проверить Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] **Высокий**: Добавить в Яндекс.Вебмастер и Google Search Console
- [ ] **Средний**: Внутренняя перелинковка: города ↔ теги ↔ статьи ↔ события
- [ ] **Средний**: Микроразметка FAQPage для страниц городов
- [ ] **Низкий**: Генерация alt-текстов для изображений

---

## Фаза 6: Оптимизация и масштабирование (неделя 10-12)

### 6.1 Аналитика

- [x] **Высокий**: Яндекс.Метрика: установка, настройка целей (покупка, planner, checkout)
- [ ] **Высокий**: Воронка конверсии: каталог → карточка → покупка / planner → checkout → оплата
- [ ] **Средний**: UTM-разметка для рекламных кампаний
- [ ] **Низкий**: A/B тесты: варианты карточек событий, CTA-кнопок

### 6.2 Производительность

- [ ] **Средний**: ISR (Incremental Static Regeneration) для страниц с высоким трафиком
- [ ] **Средний**: Оптимизация изображений (next/image, WebP, lazy loading)
- [ ] **Средний**: Мониторинг: Sentry для ошибок, UptimeRobot для доступности
- [x] **Низкий**: Кэширование на уровне Nginx (статика `_next/static/`, immutable заголовки)

### 6.3 Масштабирование

- [ ] **Средний**: Добавить города: Екатеринбург, Сочи, Владивосток, Калининград
- [ ] **Средний**: Расширить подкатегории и теги
- [ ] **Низкий**: Telegram-бот: алерты при ошибках оплаты, падении сервисов
- [ ] **Низкий**: Telegram-канал: автопостинг популярных событий и статей

---

## Бэклог (после Фазы 6)

- [ ] Мобильное приложение (React Native или PWA)
- [ ] Личный кабинет пользователя (история заказов, избранное)
- [ ] Рекомендательная система на основе истории покупок
- [ ] Программа лояльности (бонусные баллы)
- [ ] Партнёрская программа (реферальные ссылки)
- [ ] Мультиязычность (EN) для иностранных туристов
- [ ] Интеграция с другими билетными системами (не только TC)
- [x] Админ-панель для управления контентом, событиями, статьями (реализована — см. ниже)

---

## Админ-панель (packages/frontend-admin + backend/admin)

### Auth
- [x] **Критический**: Prisma модель `AdminUser` + миграция
- [x] **Критический**: `AuthModule` (JWT + bcrypt): login, refresh, me
- [x] **Критический**: `JwtAuthGuard` на все `/admin/*` маршруты
- [x] **Критический**: Seed admin user (email/пароль из `.env`)

### Auth Hardening (v2)
- [x] **Критический**: RBAC — `AdminRole` enum (ADMIN | EDITOR | VIEWER), `RolesGuard`, `@Roles()` decorator
- [x] **Критический**: Access token 15min, refresh token 30d в HttpOnly cookie
- [x] **Критический**: `refreshTokenHash` в БД, ротация при refresh
- [x] **Критический**: `POST /auth/logout` — инвалидация refresh token
- [x] **Критический**: `isActive` проверка в JwtStrategy
- [x] **Высокий**: `cookie-parser` middleware в main.ts

### Backend CRUD (NestJS `/admin/*`)
- [x] **Критический**: `AdminDashboardController` — stats (события, заказы, выручка)
- [x] **Высокий**: `AdminCitiesController` — list, get, PATCH с optimistic lock
- [x] **Высокий**: `AdminEventsController` — list (фильтры), get, override/hide (через EventOverride)
- [x] **Высокий**: `AdminTagsController` — full CRUD + soft delete + optimistic lock
- [x] **Высокий**: `AdminLandingsController` — full CRUD + JSON validation + transactions + optimistic lock
- [x] **Высокий**: `AdminCombosController` — full CRUD + JSON validation + transactions + optimistic lock
- [x] **Высокий**: `AdminArticlesController` — full CRUD + soft delete + optimistic lock + transactions
- [x] **Высокий**: `AdminOrdersController` — list, get, status transitions (безопасные)
- [x] **Средний**: `AdminSettingsController` — sync status, pricing config, ops controls, cache management

### Audit Log
- [x] **Высокий**: `AuditLog` Prisma model (userId, action, entity, entityId, before/after JSON)
- [x] **Высокий**: `AuditService` — log + findMany с фильтрацией и пагинацией
- [x] **Высокий**: `AuditInterceptor` — автологирование POST/PATCH/DELETE на /admin/*
- [x] **Высокий**: `AdminAuditController` GET /admin/audit (только ADMIN)

### EventOverride
- [x] **Высокий**: `EventOverride` Prisma model (eventId, title, description, imageUrl, isHidden, manualRating, tagsAdd/Remove)
- [x] **Высокий**: `EventOverrideService` — upsert, remove, toggleHidden, applyOverrides
- [x] **Высокий**: Admin endpoints: PATCH override, DELETE override, PATCH hide
- [x] **Высокий**: CatalogService интеграция — merge overrides, фильтрация isHidden

### PricingConfig + UpsellItem в БД
- [x] **Высокий**: `PricingConfig` Prisma model (singleton) — serviceFee, peakMarkup, lastMinute, tcCommission, peakRanges
- [x] **Высокий**: `UpsellItem` Prisma model — citySlug, title, price, category, icon, isActive, sortOrder
- [x] **Высокий**: `PricingService` refactor — читает из БД, кэширует в Redis (5min TTL)
- [x] **Высокий**: Admin: GET/PATCH /admin/settings/pricing
- [x] **Высокий**: `AdminUpsellsController` — full CRUD для UpsellItem
- [x] **Средний**: Seed: PricingConfig defaults + hardcoded upsells → БД

### JSON Validation (Zod)
- [x] **Высокий**: `json-schemas.ts` — Zod схемы для FAQ, Reviews, Stats, RelatedLinks, HowToChoose, InfoBlocks, Features, CuratedEvents, Includes, PeakRanges
- [x] **Высокий**: `validateJson()` helper с человекочитаемыми ошибками → BadRequestException
- [x] **Высокий**: Валидация в LandingsController и CombosController перед save
- [x] **Средний**: Frontend `<JsonEditor>` компонент с подсветкой ошибок и prettify

### Ops Controls
- [x] **Высокий**: `OpsStatus` Prisma model (singleton) — lastFullSyncAt, lastIncrSyncAt, lastRetagAt, lastPopulateAt, lastCacheFlush, lastError
- [x] **Высокий**: POST endpoints: sync/full, sync/incremental, retag, populate-combos, cache/flush
- [x] **Высокий**: GET /admin/ops/status — статусы последних операций

### Frontend Admin (Vite + React + Tailwind + React Router)
- [x] **Критический**: Login page + JWT auth + HttpOnly cookie refresh
- [x] **Критический**: Layout (sidebar + header + logout via POST)
- [x] **Высокий**: Dashboard (stats cards: события, города, заказы, выручка)
- [x] **Высокий**: Events — таблица с фильтрами + override через EventOverride
- [x] **Высокий**: Cities — таблица + форма (featured, active, meta) с optimistic lock
- [x] **Высокий**: Tags — таблица + CRUD-форма (create/edit/delete) с soft delete
- [x] **Высокий**: Landings — таблица + CRUD-форма с JSON-редакторами и валидацией
- [x] **Высокий**: Combos — таблица + CRUD-форма с JSON-редакторами и валидацией
- [x] **Высокий**: Articles — таблица + CRUD-форма (Markdown content, published toggle)
- [x] **Высокий**: Orders — таблица + детальная карточка + смена статуса
- [x] **Высокий**: Upsells — таблица + CRUD-форма (цена, категория, город, иконка)
- [x] **Высокий**: Аудит — таблица с фильтрами (entity, action) + раскрытие before/after JSON
- [x] **Высокий**: Settings — sync status, ops кнопки, pricing config форма

### Отзывы и рейтинги (MVP)
- [x] **Критический**: Prisma — модель Review (eventId, operatorId, rating 1-5, text, authorName, authorEmail, isVerified, voucherCode, status PENDING/APPROVED/REJECTED, adminComment)
- [x] **Критический**: Prisma — поля externalRating, externalReviewCount, externalSource в Event
- [x] **Критический**: Миграция `add_reviews`
- [x] **Высокий**: ReviewService — создание (с валидацией, дедупликацией по email+event, верификацией через voucher)
- [x] **Высокий**: ReviewService — получение одобренных отзывов (пагинация, сортировка verified first)
- [x] **Высокий**: ReviewService — рейтинг-сводка (среднее, распределение по звёздам, верифицированные)
- [x] **Высокий**: ReviewService — пересчёт Event.rating (взвешенное среднее own + external)
- [x] **Высокий**: ReviewService — admin CRUD (list, moderate approve/reject, delete)
- [x] **Высокий**: Public API — POST /reviews, GET /events/:slug/reviews
- [x] **Высокий**: Admin API — GET /admin/reviews, PATCH approve/reject, DELETE
- [x] **Высокий**: Admin API — PATCH /admin/events/:id/external-rating
- [x] **Высокий**: Frontend — ReviewSection (рейтинг-сводка + карточки отзывов + форма + пагинация)
- [x] **Высокий**: Frontend — интеграция на страницу события (/events/[slug])
- [x] **Средний**: Frontend — JSON-LD AggregateRating для SEO
- [x] **Высокий**: Admin frontend — страница модерации отзывов (tabs, approve/reject/delete dialog)
- [x] **Высокий**: Admin frontend — ExternalRatingSection в EventEdit (ручной ввод Яндекс/2GIS)
- [x] **Средний**: Admin frontend — пункт «Отзывы» в сайдбар с badge pending count
- [x] **Средний**: API client (frontend) — getEventReviews, submitReview

### Подкатегории и улучшение классификации

- [x] **Критический**: Prisma — новая категория KIDS в EventCategory, enum EventSubcategory (28 подтипов), миграция
- [x] **Критический**: Shared — обновлены типы EventListItem, CATEGORY_LABELS, SUBCATEGORY_LABELS, SUBCATEGORIES_BY_CATEGORY
- [x] **Высокий**: Backend — улучшенный классификатор classify() в tc-sync (EVENT проверяется раньше EXCURSION, новые маркеры: tribute, трибьют, jazz, rock)
- [x] **Высокий**: Backend — классификатор classifyTep() в tep-sync с subcategory
- [x] **Высокий**: Admin — override category + subcategory в EventEdit (select с зависимым списком подтипов)
- [x] **Высокий**: Frontend — подкатегории-чипы в каталоге (появляются при выборе категории), таб «Детям»
- [x] **Средний**: Frontend — EventCard показывает подкатегорию вместо категории если есть
- [x] **Средний**: EventOverride — поддержка subcategory для ручного переноса событий
- [x] **Средний**: Пересинхронизация всех событий с новым классификатором

### Редизайн админки (SaaS-стиль, shadcn/ui)

- [x] **Критический**: Установка shadcn/ui + tailwindcss-animate + CVA + clsx + tailwind-merge + Radix UI
- [x] **Критический**: Подключение recharts для графиков Dashboard + @tanstack/react-table для DataTable
- [x] **Критический**: Создание 17 базовых UI-компонентов (Button, Card, Badge, Input, Table, Dialog, Dropdown, Tabs, etc.)
- [x] **Критический**: Редизайн Sidebar (секции, tooltip при сворачивании, mobile sheet)
- [x] **Критический**: Редизайн Layout (sticky header, breadcrumbs, theme toggle, user dropdown, mobile menu)
- [x] **Критический**: Dashboard — AreaChart выручки, BarChart категорий, TopEvents, RecentOrders, StatCards
- [x] **Критический**: Backend /admin/dashboard/stats — полная аналитика (trends, revenueByDay, salesByCategory, topEvents)
- [x] **Критический**: DataTable на @tanstack/react-table (sort, filter, pagination, skeletons)
- [x] **Высокий**: Редизайн EventsList + EventEdit (фильтры, tabbed interface, offers/sessions/rating tabs)
- [x] **Высокий**: Редизайн OrdersList + OrderDetail (фильтры статуса/города, Card-layout)
- [x] **Высокий**: Редизайн всех вторичных страниц (Cities, Tags, Landings, Combos, Articles, Reviews, Upsells, Settings, Audit)
- [x] **Высокий**: ThemeProvider (dark/light mode) + localStorage persist
- [x] **Высокий**: Sonner toasts вместо inline success/error messages (все CRUD-страницы)
- [x] **Высокий**: Skeleton loading states вместо «Загрузка...» на всех страницах
- [x] **Средний**: Горизонтальная прокрутка таблиц на мобильных (ScrollArea в DataTable)
- [x] **Средний**: CSS анимации: page transitions (fadeSlideIn), smooth theme switching
- [x] **Средний**: Custom scrollbar стили, dark mode адаптация Sonner
- [x] **Средний**: Fix backend: page/limit string→number conversion (Orders, Events, Articles, Audit controllers)

### EventAudience — исправление раздела «Детям»

- [x] **Критический**: Prisma — enum EventAudience (ALL, KIDS, FAMILY), поле audience в Event и EventOverride
- [x] **Критический**: Удаление KIDS из EventCategory, удаление 6 KIDS_* из EventSubcategory
- [x] **Критический**: SQL-миграция: перевод KIDS-событий в реальные категории + audience=KIDS
- [x] **Критический**: Shared — обновление enum/labels/маппингов, audience в EventListItem
- [x] **Высокий**: Backend classifiers — tc-sync и tep-sync: kids-маркеры ставят audience, не category
- [x] **Высокий**: Backend API — audience параметр в EventsQueryDto, фильтр в catalog.service, override service
- [x] **Высокий**: Frontend — таб «Детям» = audience фильтр, бейдж на EventCard, карточка на главной
- [x] **Средний**: Admin — Select audience (ALL/KIDS/FAMILY) в EventEdit override

### Конверсионные механики

- [x] **Высокий**: Бейдж «Через N мин» в enrichWithBadges + EventCard (оранжевый пульсирующий)
- [x] **Высокий**: Сортировка departing_soon (ближайшие отправления за 2 часа)
- [x] **Высокий**: Блок «Отправляются скоро» на главной странице (SSR)
- [x] **Высокий**: Событийные теги (bridges, salute, scarlet-sails, white-nights, new-year, city-day)
- [x] **Высокий**: Авто-присвоение тегов в TC Sync по ключевым словам (развод мостов, салют, и т.д.)
- [x] **Высокий**: PromoBlock компонент — сезонные промо-карточки на главной и каталоге
- [x] **Средний**: Фильтр по времени суток (timeOfDay: morning/day/evening/night) — raw SQL + чипы в каталоге
- [x] **Средний**: Фильтр по причалу (pier) — API /locations + Select в каталоге
- [x] **Средний**: API /locations/nearest (Haversine) — подготовка для геолокации

### Контекстные быстрые фильтры + Системные теги

- [x] **Критический**: QUICK_FILTERS конфиг в shared — 4 витрины с emoji-чипами (EXCURSION: 10, MUSEUM: 7, EVENT: 8, KIDS: 5)
- [x] **Критический**: SYSTEM_TAG_BADGES в shared — 9 системных тег-бейджей с emoji, цветами
- [x] **Критический**: Frontend — контекстные быстрые фильтры по витрине (events page), замена старых subcategory-чипов
- [x] **Критический**: Frontend — tagSlugs prop в EventCard, рендер до 2 тег-бейджей (правый верхний угол)
- [x] **Высокий**: 12 системных тегов в БД (night, water, romantic, best-value, last-minute, today-available, bad-weather-ok, first-time-city, with-guide, no-queue, interactive, audioguide)
- [x] **Высокий**: Авто-присвоение тегов в tc-sync и tep-sync через расширенный KEYWORD_TAG_MAP
- [x] **Высокий**: tagSlugs в API-ответе каталога (enrichWithBadges)
- [x] **Средний**: Фильтр maxDuration в EventsQueryDto + catalog.service (чип «До 2 часов»)
- [x] **Средний**: Фильтр maxMinAge в EventsQueryDto + catalog.service (чипы возраста в «Детям»)
- [ ] **Низкий**: Алгоритм динамических тегов (best-value, last-minute, today-available) — cron-задача
- [ ] **Низкий**: Интеграция геолокации (nearest) на фронтенде с navigator.geolocation

### Главная страница + Лендинги + SEO-блог (февраль 2026)

- [x] **Высокий**: Hero кнопка «Спланировать» — контрастный стиль для тёмного фона (border-white, backdrop-blur)
- [x] **Высокий**: PromoBlock — всесезонные промо (Зимний город, День влюблённых, Масленица, Каникулы с детьми)
- [x] **Высокий**: «Что посмотреть» — блок «Популярные темы» (теги + счётчики событий из API, SSR)
- [x] **Критический**: Лендинг nochnye-mosty — применение additionalFilters в landing.service.ts (subcategories RIVER)
- [x] **Высокий**: KEYWORD_TAG_MAP — ужесточение ключевых слов: `мост` → `развод мостов`, `ночные мосты`; удалены `развод`, `разводн`
- [x] **Высокий**: Очистка БД — удалён тег nochnye-mosty у нерелевантных (не-RIVER) событий
- [x] **Средний**: Документация SEO-блога — архитектура автогенерации, типы статей, перелинковка (docs/Project.md)
- [ ] **Средний**: Реализация ArticlePlanner + DataCollector + Renderer + Linker
- [ ] **Средний**: Подключение OpenAI API для генерации уникального контента
- [ ] **Низкий**: Admin UI для управления статьями (перегенерация, публикация, превью)

### Комплексная UGC-система (февраль 2026)

#### Фаза 1: Инфраструктура
- [x] **Критический**: MailModule + MailService — @nestjs-modules/mailer + Handlebars шаблоны (review-verify, review-request, review-approved)
- [x] **Критический**: UploadModule + UploadService — multer + sharp, WebP конвертация, StorageProvider interface (LocalStorage)
- [x] **Критический**: QueueModule — BullMQ подключён к Redis, очереди emails + review-tasks, EmailProcessor + ReviewTaskProcessor
- [x] **Критический**: ThrottlerModule — глобальный rate limit 30 req/min

#### Фаза 2: Улучшенные отзывы
- [x] **Критический**: ReviewPhoto модель — до 5 фото на отзыв, ресайз 1200px + thumbnail 300px, WebP
- [x] **Критический**: Email-верификация — статус PENDING_EMAIL, verifyToken с 48h TTL, endpoint GET /reviews/verify
- [x] **Критический**: Спам-защита — honeypot-поле, минимальное время заполнения (5 сек), throttler
- [x] **Высокий**: ReviewVote модель — "Полезный отзыв", дедупликация по SHA-256(IP), POST /reviews/:id/vote
- [x] **Высокий**: Frontend ReviewSection — фото-галерея с lightbox, кнопка "Полезный", загрузка фото в форме
- [x] **Высокий**: Email-уведомления через BullMQ — верификация, одобрение, уведомление админу

#### Фаза 3: Внешние отзывы
- [x] **Высокий**: ExternalReview модель — source (yandex_maps, 2gis, tripadvisor, google), sourceUrl, publishedAt
- [x] **Высокий**: Admin CRUD + batch JSON import (AdminExternalReviewsController)
- [x] **Высокий**: Frontend — бейджи источников, секция "Отзывы с других площадок"
- [x] **Средний**: Участие ExternalReview в recalculateEventRating (взвешенное среднее)

#### Фаза 4: Пост-покупочный flow
- [x] **Высокий**: ReviewRequest модель — токен, tracking (sent/opened/clicked/reviewed), reminderSentAt
- [x] **Высокий**: ReviewSchedulerService — cron 10:00 ежедневно (review requests), воскресенье (reminders), 04:00 (cleanup)
- [x] **Высокий**: Pre-filled форма /reviews/write?token=xxx — автозаполнение email, автоматический isVerified
- [x] **Средний**: Frontend — /reviews/verified (страница подтверждения email)
- [ ] **Средний**: Настройка SMTP для production (daibilet.ru)
- [ ] **Низкий**: pnpm approve-builds для sharp на VPS
- [ ] **Низкий**: Nginx location /uploads/ для раздачи статических файлов

---

### Гибридные туры: ручные офферы + корзина + checkout

#### Этап 1: Ручные офферы к существующим Event
- [x] **Критический**: Prisma schema — REQUEST в PurchaseType, MANUAL в EventSource, availabilityMode/badge/operatorId в EventOffer
- [x] **Критический**: Backend CRUD офферов — POST/PUT/DELETE/clone в admin-events.controller
- [x] **Высокий**: Admin UI — форма создания/редактирования/клонирования оффера (Dialog в EventEdit, OffersSection)
- [x] **Высокий**: Frontend — обработка REQUEST (форма заявки), badge на оффере, multi-offer display

#### Этап 2: Создание новых Event через wizard
- [x] **Высокий**: Backend — POST /admin/events (ручной Event + первый offer в транзакции, auto-slug транслитерация)
- [x] **Высокий**: Admin UI — EventCreate wizard (2 шага: контент/SEO + первый оффер), кнопка "Создать событие" в списке

#### Этап 3: Корзина + Checkout
- [x] **Критический**: Prisma — CheckoutSession + OrderRequest модели, CheckoutStatus enum
- [x] **Критический**: Frontend — CartContext + localStorage, CartProvider в layout, CartDrawer (Sheet), CartIcon в Header
- [x] **Критический**: Frontend — AddToCartButton компонент для страницы события
- [x] **Критический**: Backend — POST /checkout/validate (проверка наличия/цен), POST /checkout/session (создание сессии + order requests), POST /checkout/request (быстрая заявка без корзины), GET /checkout/session/:id
- [x] **Высокий**: Frontend — Checkout page (3 шага: проверка → контакты → готово, разделение на redirect/request блоки)
- [x] **Высокий**: Admin — CheckoutSessionsList (вкладки Заявки/Sessions, поиск, фильтры, Подтвердить/Отклонить заявки)
- [x] **Высокий**: Admin — AdminCheckoutController (GET/PATCH sessions, GET requests, POST confirm/reject)
- [x] **Высокий**: Sidebar — пункт "Заявки" в секции "Основное"
- [ ] **Средний**: Email-уведомления клиенту при подтверждении/отклонении заявки (через MailService)
- [x] **Средний**: Cron для автоматического истечения заявок (TTL 30 мин / 24ч) → OrderExpiryService
- [~] **Низкий**: Подключение YooKassa для online-оплаты → PaymentIntent stub готов, осталось подключить SDK

#### Этап 4: Консолидация и аналитика
- [x] **Критический**: PurchaseType 4 → 3: TC_WIDGET → WIDGET, REQUEST_ONLY → REQUEST, убран API_CHECKOUT
- [x] **Критический**: SQL-миграция пересоздания enum с обновлением данных
- [x] **Высокий**: State Machine для CheckoutSession и OrderRequest (checkout-state-machine.ts)
- [x] **Высокий**: SLA/TTL для OrderRequest — поле slaMinutes, автоистечение через cron
- [x] **Высокий**: Аналитический отчёт — GET /admin/checkout/analytics + вкладка "Аналитика" в admin UI
- [x] **Средний**: Маппинг обратной совместимости PURCHASE_TYPE_COMPAT в shared

#### Этап 5: Foundation Hardening (2026-02-13)
- [x] **Высокий**: Zod-валидация widgetPayload по provider (TC, RADARIO, TIMEPAD, Generic)
- [x] **Высокий**: Payload versioning — `v: 1` в widgetPayload JSONB
- [x] **Высокий**: State Machine v3 — структурный return `{allowed, noOp, reason}`, запрещённые переходы в AuditLog
- [x] **Высокий**: COMPAT метрики: `legacyPurchaseTypeHits` + kill switch `DISABLE_PURCHASE_TYPE_COMPAT`
- [x] **Высокий**: Миграция идемпотентная: проверки существования + SQL-assert контрактов
- [x] **Высокий**: `completedAt` для CheckoutSession (аналитика p50/p90)
- [x] **Средний**: CSV Export — заявки и сессии + кнопки в Admin UI (BOM для Excel)
- [x] **Средний**: Snapshot enriched: offerId, source, purchaseTypeResolved, priceCurrency, snapshotAt
- [x] **Средний**: Write-once guard для offersSnapshot (assertSnapshotImmutable)
- [x] **Средний**: Инвариант-тесты — 22 теста (vitest): state machine, payload, expiry, compat
- [x] **Средний**: Endpoint compat-metrics для мониторинга legacy PurchaseType

#### Этап 6: Compat AuditLog + PaymentIntent (2026-02-13)
- [x] **Высокий**: Compat metrics → AuditLog (персистентный через setCompatLogger callback)
- [x] **Высокий**: PaymentIntent модель — PENDING/PROCESSING/PAID/FAILED/CANCELLED/REFUNDED + idempotencyKey
- [x] **Высокий**: Идемпотентная SQL-миграция payment_intents + PaymentStatus enum
- [x] **Высокий**: State machine для PaymentIntent (по акторам: system/user/admin)
- [x] **Высокий**: PaymentService — STUB provider (mock payment_url, simulate-paid)
- [x] **Средний**: Checkout endpoints: /pay, /payment/:id, /simulate-paid, /webhook/payment
- [x] **Средний**: Admin: paymentIntents в деталях сессии + payment stats в аналитике
- [x] **Средний**: 28 инвариант-тестов (6 новых на PaymentIntent)

---

## Фаза 4: Продуктовый рост (roadmap)

> Приоритеты определены 2026-02-13. Порядок — по бизнес-влиянию.

### 1. Посадочные страницы — UX/конверсия
- [ ] **Критический**: Аудит текущих лендингов — мобильная версия, скорость, CTA
- [ ] **Критический**: FilterBar v2 — sticky на мобильном, быстрые фильтры, сброс
- [ ] **Высокий**: ComparisonTable — улучшить читаемость, highlight лучшего оффера
- [ ] **Высокий**: VariantCard — социальное доказательство (рейтинг, кол-во отзывов)
- [ ] **Высокий**: CTA-блоки — A/B тестирование формулировок и позиционирования
- [ ] **Средний**: PromoBlock — сезонные акции, "популярное сегодня"

### 2. SEO-блог + перелинковка
- [ ] **Критический**: Стратегия ключевых слов — топ-10 запросов на город
- [ ] **Высокий**: Шаблон SEO-статьи: H1 + EventCard-блоки + internal links
- [ ] **Высокий**: Перелинковка статья ↔ событие (двусторонняя)
- [ ] **Высокий**: Schema.org разметка для статей (Article, BreadcrumbList)
- [ ] **Средний**: Автогенерация мета-описаний для каталога (по шаблону)
- [ ] **Низкий**: RSS-фид для статей

### 3. YooKassa — тестовые платежи
- [ ] **Критический**: Подключить YooKassa SDK → заменить STUB в payment.service
- [x] **Критический**: Sandbox E2E тесты: 7 сценариев (21 тест-кейс) — payment-e2e.spec.ts
- [x] **Высокий**: IP whitelist (PaymentService.YOOKASSA_IPS + isIpInCidr)
- [ ] **Высокий**: Страница "Оплата прошла" / "Ошибка оплаты" на фронте
- [x] **Средний**: Возвраты через админку (PAID → REFUNDED) — Reconciliation UI

### 3.1 Batch C — Доказательство корректности (DONE)
- [x] **Критический**: 7 E2E сценариев — happy path, duplicate webhook, out-of-order, retry, auto-compensate, cancel/expire, partial failure
- [x] **Критический**: Data invariants: offersSnapshot immutability guard, amount=snapshot sum, webhook→intent tracing
- [x] **Критический**: Reconciliation UI: 4 вкладки (Платежи, Расхождения, Webhooks, Мониторинг) + Retry/Refund/Resolve
- [x] **Высокий**: Metric alerts: fulfillment_fail_rate, auto_compensate_rate, webhook_dedup_rate + thresholds
- [x] **Высокий**: Health endpoint: pendingStale, failedUnresolved, escalatedOpen, activeIntents
- [x] **Высокий**: Log correlation: [intent=] [provider=] [providerPmtId=] в PaymentService, FulfillmentService, RefundService, FulfillmentProcessor
- [x] **Высокий**: paymentIntentId tracing в ProcessedWebhookEvent (schema + миграция)
- [x] **Средний**: Исправлены 8 pre-existing тестов в payment.service.spec.ts (snapshot-based flow)

### 4. Unified Checkout (для планировщика программ)
- [ ] **Высокий**: Создание заказов в TC/TEP API на нашей стороне при оплате через YooKassa
- [ ] **Высокий**: Обработка двойного резерва (15 мин TC vs наша оплата) — sequence: pay → reserve → confirm
- [ ] **Высокий**: Partial failure handling: если 1 из 3 событий не забронировано → partial refund
- [ ] **Средний**: Объединение нескольких источников (TC + TEP + MANUAL) в одной корзине с единой оплатой
- [ ] **Средний**: Rollback механизм для отмены заказов в TC при ошибке оплаты

### 5. Единые ваучеры (Trip Planner)
- [ ] **Высокий**: Дизайн ваучера — QR + данные всех событий пакета
- [ ] **Высокий**: Калькуляция: сумма офферов + сервисный сбор − скидка за пакет
- [ ] **Высокий**: Политика отмен: полный возврат (>7д), частичный (3-7д), без возврата (<3д)
- [ ] **Средний**: Переносы: замена события в пакете (если оператор позволяет)
- [ ] **Средний**: Генерация PDF-ваучера (email + личный кабинет)

### 6. Система поддержки (Phase 1)
- [x] **Высокий**: Публичная страница /help с 20+ FAQ, категориями, FAQPage JSON-LD
- [x] **Высокий**: Трекинг заказа /orders/track по shortCode (без авторизации)
- [x] **Высокий**: Email-уведомления по статусам заказа (created/confirmed/rejected/expired/completed)
- [x] **Высокий**: Модель SupportTicket + TicketResponse + Prisma-миграция
- [x] **Высокий**: Backend CRUD (публичный + admin) + авто-маршрутизация + SLA
- [x] **Высокий**: Admin UI: список тикетов, фильтры, детали, ответы, шаблоны, внутренние заметки
- [x] **Высокий**: Виджет обратной связи (floating button + modal) на всех страницах
- [x] **Высокий**: Клиентская форма ContactForm на /help
- [x] **Средний**: Scroll-progress indicator на мобиле (% прочитанного) — дубль
- [x] **Средний**: «Похожие места» блок на venue page — дубль
- [ ] **Низкий**: A/B тестирование CTA-текстов («Купить билет» vs «Выбрать дату»)
- [ ] **Низкий**: Micro-animations для offer cards (hover, selection feedback)

### 7. Post-seed: связь Venue ↔ Event
- [x] **Высокий**: seed-venue-links.ts — привязка Event → Venue по ключевым словам (15 правил)
- [x] **Высокий**: OPEN_DATE событие + MANUAL оффер для Эрмитажа (REDIRECT)
- [x] **Высокий**: Каскадная привязка EventOffer.venueId к venue
- [x] **Высокий**: imageUrl + galleryUrls для ТОП-10 venues (Unsplash placeholders)
- [x] **Средний**: next.config.ts — remotePatterns для Unsplash и Wikimedia
- [x] **Средний**: VenueDetail интерфейс — добавлены highlights, faq, features, recommendPercent, reviews, relatedArticles
- [ ] **Средний**: Заменить Unsplash placeholders на собственные фото (S3/CDN)

### 8. Усиление ресурса
- [ ] **Средний**: Партнёрская программа — операторы добавляют свои события
- [ ] **Низкий**: Тематические подборки (сезонные, праздники)
- [ ] **Низкий**: Геймификация — бейджи "Исследователь Петербурга"
