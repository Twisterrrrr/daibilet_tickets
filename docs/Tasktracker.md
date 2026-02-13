# Tasktracker — Агрегатор билетов + Trip Planner

> Последнее обновление: 2026-02-12 (EventAudience + Conversion Mechanics)

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
- [ ] **Средний**: Admin: UI для ручного merge дублей (поиск + выбор canonical event)
- [ ] **Средний**: Автодедуп: fuzzy matching по названию + площадка + дата (Фаза будущая)
- [ ] **Низкий**: Автовыбор primary по правилам (комиссия/цена/наличие)

### Этап 2: SEO-машина + новые страницы (планируется)

- [ ] **Высокий**: 5 SEO-подборок на город (развод мостов, лучшие по отзывам, дешёвые, поздние рейсы, с детьми)
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
- [ ] **Высокий**: Настроить ESLint + Prettier для всего monorepo
- [ ] **Средний**: GitHub Actions: lint → test → build (без деплоя на первом этапе)

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
- [ ] **Критический**: BullMQ job: `sync-events-full` (cron каждые 6 часов)
- [ ] **Критический**: BullMQ job: `sync-events-incremental` (cron каждые 15 минут)
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
- [x] **Критический**: Prisma schema — REQUEST_ONLY в PurchaseType, MANUAL в EventSource, availabilityMode/badge/operatorId в EventOffer
- [x] **Критический**: Backend CRUD офферов — POST/PUT/DELETE/clone в admin-events.controller
- [x] **Высокий**: Admin UI — форма создания/редактирования/клонирования оффера (Dialog в EventEdit, OffersSection)
- [x] **Высокий**: Frontend — обработка REQUEST_ONLY (форма заявки), badge на оффере, multi-offer display

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
- [ ] **Средний**: Cron для автоматического истечения заявок (TTL 30 мин / 24ч)
- [ ] **Низкий**: Подключение YooKassa для online-оплаты
