# Project — Дайбилет (daibilet.ru)

> Последнее обновление: 2026-03-05

## Миссия

Агрегатор билетов на экскурсии, музеи и мероприятия с умным подбором программы поездки. Стартовые города: Москва, Санкт-Петербург, Казань, Калининград, Владимир, Ярославль.

## Конкурентная стратегия

Главный конкурент: [Tripster](https://experience.tripster.ru/) — лидер рынка экскурсий в России.

Прямое соревнование по UX/дизайну нецелесообразно. Побеждаем на трёх полях, где Tripster структурно слаб:

1. **Посадочные страницы** — многоуровневая таксономия (города, регионы, площадки, категории, подкатегории, теги, комбо) даёт десятки уникальных SEO-страниц. У Tripster — плоский каталог (город → экскурсии от гидов).

2. **AI-контент** — масштабируемое создание SEO-статей и описаний с привязкой к реальным данным (цены, наличие, расписание). Формула: AI-каркас + ручная редактура + уникальные фото + перелинковка.

3. **Планировщик туров** — killer feature, отсутствующая у всех конкурентов (Tripster, GetYourGuide, Viator, Sputnik8). Пользователь выбирает город + даты + состав группы → получает готовую программу с билетами.

## Архитектура

| Слой | Технология | Каталог |
|------|-----------|---------|
| Публичный сайт | Next.js 14+ (App Router), SSR/SSG, TailwindCSS | `packages/frontend` |
| Админ-панель | Vite + React + React Router + Tailwind | `packages/frontend-admin` |
| Backend API | NestJS + TypeScript + Prisma + PostgreSQL + Redis | `packages/backend` |
| Общие типы | TypeScript barrel-файлы | `packages/shared` |
| БД | PostgreSQL 16 (Docker) | — |
| Кэш/очереди | Redis 7 + BullMQ | — |
| Инфраструктура | Docker Compose, Nginx, Certbot, pnpm workspaces | корень |

## Интеграции

- **Ticketscloud gRPC (tc-simple)** — каталог событий (MetaEvent-based синхронизация)
- **Ticketscloud REST v2** — создание заказов, управление бронированиями
- **Ticketscloud Widget (JS)** — покупка билетов на фронтенде (JWT-токен)
- **teplohod.info API v1** — каталог речных прогулок (55 событий, ~2000 сессий с реальным расписанием)
- **YooKassa** — оплата бандлов/программ + Split Payment для маркетплейса (запланировано)
- **SMTP** — транзакционные email (@nestjs-modules/mailer + Handlebars)
- **Partner B2B API** — machine-to-machine API для внешних поставщиков (API-ключи, webhook-уведомления)

## Статические изображения и витрины городов

- **Статичные картинки городов**: единый конфиг `CITY_IMAGES` (`packages/frontend/src/lib/cityImages.ts`) описывает hero- и card-картинки для каждого города (slug → пути в `public/assets/images/...` + источник, автор, лицензия, blur placeholder).
- **Хранение файлов**: все оптимизированные изображения лежат в `packages/frontend/public/assets/images`, структура:
  - `/assets/images/hero/hero-main.webp` — главный hero для `/` (3200×1800, ≤400 KB).
  - `/assets/images/cities/{slug}/hero.webp` — фон hero-блока страницы города (3000×1700, ≤350 KB).
  - `/assets/images/cities/{slug}/card.webp` — картинка карточки города на `/cities` и в блоке «Города» на главной (1600×900, ≤200 KB).
- **Метаданные и отчёт**:
  - `/assets/images/images.json` — технический JSON для пайплайна (пути, источник, автор, лицензия, URL страницы/скачивания, локальные пути исходников, blurDataUrl).
  - `docs/image-assets-report.md` — авто‑отчёт по фактическим размерам и весу файлов (генерируется скриптом).
- **Пайплайн кандидатов и оптимизации**:
  - Скрипт `scripts/image-candidates.mjs` (Node 20+ fetch, без npm-зависимостей) собирает стоковые кандидаты по городам из Pexels/Unsplash/Pixabay, сохраняет их в `packages/frontend/assets-src/**/candidates` и пишет `candidates.json` с метаданными (source, author, license, pageUrl, downloadUrl, width, height, query).
  - Хелпер `scripts/select-image.mjs` копирует выбранные кандидаты в `.../selected/hero-original.jpg` / `card-original.jpg` и автоматически обновляет `images.json` (localHeroSourcePath/localCardSourcePath + метаданные).
  - Скрипт `scripts/image-assets.mjs` (Node + ImageMagick `magick`) читает `images.json`, ресайзит исходники из `assets-src` в WEBP под целевые размеры слотов (homepage hero, city hero, city card, og), генерирует blur placeholders и валидирует веса, после чего обновляет JSON и отчёт.
  - Фронтенд использует только статичные пути (`CITY_IMAGES`), контракты API не меняются (backend продолжает отдавать `city.heroImage`, но фронт приоритетно берёт оптимизированные локальные файлы).
- **Процесс для контент-редакторов**:
  1. `pnpm images:candidates` — собрать кандидатов по всем городам (исходники не попадают в прод, лежат в `packages/frontend/assets-src` и не коммитятся).
  2. Вручную просмотреть `.../candidates` и выбрать лучшие файлы (по hero/card) либо вызвать `node scripts/select-image.mjs --city=slug --hero=01__...jpg --card=02__...jpg` (для главной: `--homepageHero=...`).
  3. Убедиться, что `public/assets/images/images.json` содержит корректные пути/метаданные.
  4. Запустить `pnpm images:build` (ImageMagick `magick` должен быть в PATH) — будут сгенерированы/обновлены WEBP-файлы, blur placeholders и `docs/image-assets-report.md`.

## Модель данных (ключевые сущности)

- **City** — город с SEO-полями, featured-флагом
- **Event** — каноническое мероприятие (title, slug, category, subcategory, rating, город). Поле `canonicalOfId` для дедупликации (self-relation).
  - **EventCategory** — enum: `EXCURSION` (экскурсии), `MUSEUM` (музеи), `EVENT` (мероприятия), `KIDS` (детям).
  - **EventSubcategory** — enum подкатегорий, сгруппированных по категории:
    - EXCURSION: `RIVER`, `WALKING`, `BUS`, `COMBINED`, `QUEST`, `GASTRO`, `ROOFTOP`
    - MUSEUM: `MUSEUM_CLASSIC`, `EXHIBITION`, `GALLERY`, `PALACE`, `PARK`
    - EVENT: `CONCERT`, `SHOW`, `STANDUP`, `THEATER`, `SPORT`, `FESTIVAL`, `MASTERCLASS`, `PARTY`
    - KIDS: `KIDS_SHOW`, `KIDS_EXCURSION`, `KIDS_MASTER`, `KIDS_MUSEUM`, `KIDS_QUEST`, `KIDS_AMUSEMENT`
  - `Event.subcategory` — `EventSubcategory?` (опционально).
- **EventOverride** — правки админа поверх sync-данных (title, description, imageUrl, isHidden, manualRating, tagsAdd/Remove, **category**, **subcategories**).  
  **Заголовок**: `Event.title` — оригинал из источника (TC, Teplohod), обновляется при каждом sync. `EventOverride.title` — кастомный заголовок для Daibilet. Для отображения используется override ?? event.title. Оригинал сохраняется в `Event.title` для импорта/экспорта и виджетов.  
  **Подкатегории**:  
  - `subcategoriesMode: SubcategoriesMode` — enum `INHERIT | OVERRIDE | CLEAR` с default = `INHERIT`;  
  - `subcategoriesOverride: EventSubcategory[]` — явный список подкатегорий для режима `OVERRIDE`;  
  - итоговый список подкатегорий вычисляется в backend через `resolveSubcategories(event.subcategories, subcategoriesMode, subcategoriesOverride)` и всегда является **жёстким override без merge**:  
    - INHERIT → берем подкатегории события (`Event.subcategories`),  
    - OVERRIDE → используем только `subcategoriesOverride`,  
    - CLEAR → пустой массив.
- **EventOffer** — оффер из конкретного источника (TC/TEPLOHOD/RADARIO/TIMEPAD/MANUAL). Содержит: source, purchaseType (TC_WIDGET/REDIRECT/API_CHECKOUT), externalEventId, deeplink, priceFrom, commission, status (ACTIVE/HIDDEN/DISABLED), isPrimary.
- **EventSession** — конкретный сеанс (дата, свободные места, цены). Привязан к Event и к EventOffer (offerId). Для teplohod.info — реальное расписание из `eventTimes` API (дата, время отправления, кол-во свободных мест).
- **Tag** — теги для фильтрации и группировки (тема, аудитория, сезон)
- **LandingPage** — SEO-подборка по тегу/фильтрам
- **ComboPage** — готовая программа с курированными событиями
- **Article** — SEO-статья с перелинковкой
- **Package** — заказ (Trip Planner)
- **Review** — отзыв на событие/оператора. Поля: rating (1-5), text, authorName, authorEmail (скрыт), isVerified (подтверждённая покупка), voucherCode, verifyToken (email-верификация, 48h TTL), helpfulCount (кэш голосов), status (PENDING_EMAIL/PENDING/APPROVED/REJECTED), adminComment. Unique: authorEmail + eventId.
  - **ReviewPhoto** — до 5 фото на отзыв (url, thumbUrl, filename). WebP, ресайз 1200px + thumb 300px.
  - **ReviewVote** — голоса "Полезный отзыв" (ipHash SHA-256, isHelpful). Unique: reviewId + ipHash.
- **ExternalReview** — импортированные отзывы с внешних площадок (Яндекс.Карты, 2ГИС, Tripadvisor, Google). Поля: source, sourceUrl, authorName, rating, text, publishedAt. Участвует в recalculateEventRating.
- **ReviewRequest** — пост-покупочный запрос на отзыв (email, eventId, token, sentAt, reminderSentAt, openedAt, clickedAt, reviewId). Unique: email + eventId.
- **Event.externalRating/externalReviewCount/externalSource** — ручной импорт рейтинга из внешних платформ. Участвует в расчёте итогового rating через взвешенное среднее (вместе с Review и ExternalReview).
- **CheckoutSession** — сессия оформления заказа (snapshot корзины, контакт, UTM, статусы через State Machine). Immutable `offersSnapshot` с write-once guard. Опционально `giftCertificateSnapshot` — для подарочных сертификатов.
- **GiftCertificate** — подарочный сертификат (номинал, код GC-XXXX-XXXX, email получателя, сообщение). Создаётся при успешной оплате, статусы ISSUED/ACTIVATED/EXPIRED.
- **OrderRequest** — заявка на подтверждение (SLA/TTL, expireReason, confirmedAt). Привязана к CheckoutSession.
- **PaymentIntent** — платёжное намерение (PENDING/PROCESSING/PAID/FAILED/CANCELLED/REFUNDED). Привязка к CheckoutSession, idempotencyKey, provider (STUB/YOOKASSA). Split-поля для маркетплейса: supplierId, grossAmount, platformFee, supplierAmount, commissionRate.
- **Operator** — юридическое лицо/правообладатель. Поля маркетплейса: isSupplier, trustLevel, commissionRate, status (ACTIVE/ARCHIVED/SUSPENDED). Подробно: § Архитектура Supplier ниже.
- **SupplierUser** — аккаунт поставщика (Operator 1—N SupplierUser). Роли: OWNER, MANAGER, CONTENT, ACCOUNTANT.
- **User** — пользователь сайта (регистрация/вход). Избранное в UserFavorite (eventSlug).
- **ApiKey** — API-ключ для Partner B2B API: SHA-256 хеш (не храним оригинал), prefix (8 символов для UI), rateLimit, ipWhitelist, expiresAt.
- **Venue** — место (музей, галерея, арт-пространство). VenueType enum (MUSEUM/GALLERY/ART_SPACE/EXHIBITION_HALL/THEATER/PALACE/PARK). Содержит: openingHours (JSON), priceFrom, rating, galleryUrls, address/metro/lat/lng, operatorId (партнёр). Soft delete, optimistic lock.
- **Event расширен**: venueId (FK к Venue), dateMode (SCHEDULED/OPEN_DATE), isPermanent, endDate. Шаблоны страниц — `docs/Reference.md` § PageTemplateSpecs.
- **EventOffer расширен**: venueId для прямых офферов к месту (без привязки к Event).
- **Location** — причал, площадка, точка встречи (каркас, Фаза 2)
- **Route** — маршрут с POI (каркас, Фаза 2)

### Классификация при синхронизации

При синхронизации (TC gRPC, Teplohod) используется улучшенный ключевой классификатор: по заголовку и описанию автоматически назначаются **category** и **subcategory**. Порядок проверки важен: маркеры EVENT проверяются **до** EXCURSION, чтобы избежать ложных срабатываний (например, «tribute tour», «мастер-класс» в названии концерта не должны уходить в экскурсии). Категория KIDS проверяется первой (например, «детский спектакль» → KIDS, а не EVENT).

## Соглашения

- REST API: `/api/v1`
- Observability: `docs/Reference.md` §2 — requestId, PII masking
- Цены в копейках (целое число)
- Даты — ISO 8601, UTC в БД, локальные при отображении
- Slug — транслитерация кириллицы
- UUID v4 для всех первичных ключей
- Коммиты: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

## FULL SYNC (dev) — полный ресинк каталога

- **Назначение**: принудительно пересинхронизировать все внешние источники каталога (Ticketscloud + teplohod.info), пересчитать теги и сбросить кэш, чтобы витрина и админка видели актуальные данные.
- **Entry point**: CLI в backend.
  - Скрипт: `packages/backend/scripts/full-sync.ts`
  - Команда из корня монорепо:
    - `FULL_SYNC=1 pnpm full:sync`
- **Требования и защита**:
  - Backend dev-сервер должен быть запущен (`pnpm dev:backend`, по умолчанию слушает `http://127.0.0.1:4000`).
  - Обязателен флаг окружения `FULL_SYNC=1` — без него скрипт немедленно завершится с ошибкой (защита от случайного запуска).
- **Что делает FULL SYNC**:
  - Делает HTTP‑запрос `POST /api/v1/catalog/sync/all` к backend API.
  - Внутри backend запускается комбинированная синхронизация:
    - Полный sync Ticketscloud (`TcSyncService.syncAll`): города, площадки, события, офферы, сеансы, retag.
    - Полный sync teplohod.info (`TepSyncService.syncAll`): города, события, офферы, реальное расписание сеансов или виртуальные fallback‑сессии.
    - Дополнительный `retagAll` для унификации тегов по обоим источникам.
    - Инвалидация кэша каталога (`CacheService.invalidateAfterSync`).
  - В stdout выводится JSON‑summary по источникам (кол-во событий/сеансов, новые города, ошибки).
- **Идемпотентность**:
  - Все sync‑слои используют upsert по стабильным ключам (`source + tcEventId / externalEventId`, `tcSessionId` и др.), поэтому повторный FULL SYNC не плодит дубли и только актуализирует данные.
  - Soft‑delete и publish‑gate‑состояния (`isActive`/`isDeleted`, `EventOverride`, `offers.status`) при этом не ломаются — синк следует существующей бизнес‑логике.

### Каталог событий — режимы ответа и производительность

- `/api/v1/events` — основной endpoint каталога событий.
- Поддерживает параметр `fields`:
  - `fields=card` — лёгкая карточка события для листингов (главная, `/events`, «похожие»):
    - Prisma `select` только по необходимым полям (`id`, `slug`, `title`, `category`, `subcategories`, `audience`, `imageUrl`, `priceFrom`, `rating`, `reviewCount`, `city.slug/name`, `venue.title/shortTitle`, ближайшие `sessions`, теги).
    - Не возвращает тяжёлые JSON-поля (`tcData`, embed-конфиги, полные офферы/сессии).
    - После выборки всё равно проходят `EventOverride.applyOverrides` и `enrichWithBadges`, чтобы соблюдать publish-gate и скрытие событий.
  - `fields=full` (или отсутствие параметра) — полный объект события для деталок и сложных сценариев (включая офферы, все сессии, сырые данные интеграций).
- Кэш каталога:
  - Ключи строятся из стабильного hash параметров (включая `fields`), namespace `catalog:list:<city>:<hash>`.
  - Для `card`-листангов TTL может быть увеличен (по сравнению с full), так как payload компактнее и не содержит чувствительных к микроскопическим изменениям деталей.
- Наблюдаемость:
  - `CatalogService.fetchEvents` логирует тайминги по этапам (`dbMs`, `overrideMs`, `badgesMs`, `totalMs`, `fields`, `sort`, `total`) для диагностики производительности в dev/prod.

### Сборка frontend (Windows / CI)

- **Windows**: `next build` с `output: 'standalone'` падает на EPERM (создание symlink). В `next.config.ts` standalone отключён на Windows: `output: isWindows ? undefined : 'standalone'`. Сборка проходит успешно без standalone. Альтернатива — включить Developer Mode в Windows (Settings → Privacy → For developers).
- **CI / Linux**: standalone включён; Docker-образ frontend остаётся ~100 MB.
- **Скрипты**:
  - `pnpm -C packages/frontend build` — обычный build (standalone только на Linux/macOS)
  - `pnpm -C packages/frontend build:standalone` — принудительный standalone (`NEXT_OUTPUT=standalone`, может упасть на Windows без Developer Mode)
  - `pnpm -C packages/frontend start:standalone` — запуск standalone-сервера после `build:standalone` (или обычного build на Linux)

### ESLint (flat config + Next.js)

- Корень: `eslint.config.mjs` (TypeScript-ESLint, Prettier, общие правила).
- Frontend: `packages/frontend/eslint.config.mjs` — spread корня + `@next/eslint-plugin-next` (recommended). `next lint` — правила применяются; предупреждение «plugin was not detected» в Next 15 — косметическое (vercel/next.js#73655). В v16 — переход на `npx eslint .`.

---

### Структура монорепозитория (папки packages/*)

- **`packages/backend`** — NestJS backend:
  - REST API (`/api/v1/*`, `/admin/*`, `/supplier/*`), очереди BullMQ, интеграции (Ticketscloud, YooKassa).
  - Prisma схема + миграции (`packages/backend/prisma`), скрипты синхронизации (`prisma/*.ts`, `src/catalog/*`).
- **`packages/frontend`** — публичный сайт (Next.js App Router):
  - `/` (главная, города, подборки, события, билеты, блог, checkout).
  - Виджет выбора сеанса и checkout: `docs/PR-C.md` (PR-C1…C5, архитектура CheckoutSession → PaymentIntent → Package).
  - SSR/SSG для SEO, TailwindCSS, React Query.
- **`packages/frontend-admin`** — админка Daibilet (React + Vite):
  - Страницы: `src/pages/events/*` (EventsList, EventEdit, EventCreate, EventsMerge), `cities/*`, `venues/*`, `landings/*`, `collections/*`, `combos/*`, `upsells/*`, `widgets/*`, `articles/*`, `reviews/*`, `support/*`, `orders/*`, `audit/*`, `moderation/*`, `reconciliation/*`, `settings/*`, `Dashboard`, `Login`.
  - Общий layout (`components/layout/*`), UI‑компоненты (`components/ui/*`), SeoMetaEditor.
  - Использует `@tanstack/react-query`, `@tanstack/react-table`, Radix UI.
- **`packages/frontend-supplier`** — портал поставщика (упрощённый кабинет):
  - Страницы: `src/pages/events/*` (EventsList, EventEdit), `Dashboard`, `Reports`, `Settings`, `Login`, `Register`.
  - Tailwind + Radix UI, React Router.
- **`packages/shared`** — общий пакет `@daibilet/shared`:
  - Утилиты: `normalize-title`, `price-normalizer`, `seo-utils`, `widget-payload`, `address-utils`, `city-declension`.
  - Используется backend’ом и всеми фронтами.

---

### Админка: готовность, расписание, мультисобытия, SEO-аудит

- **Спецификация:** `docs/AdminScheduleSpec.md` — готовность события (blocking/warnings), ручной publish + admin override, мультисобытия как отдельный уровень, SEO-аудит как список задач, Teplohod-style расписание (вкладка «Расписание»: сетка дата×час, drag/ctrl-brush, минуты, вместимость, Модель A при продажах). Scope: только события из админки/ЛК (импортируемые передаются как есть). **Pipeline:** `docs/AdminSchedulePipeline.md` — PR1→PR4 с подзадачами, AC и UX для Cursor.

### Глобальные мульти-события (одно шоу в разных городах)

- Для гастролей/серийных шоу (одинаковое событие в разных городах/датах) используется grouping на уровне `Event`:
  - `normalizedTitle: String?` — нормализованный заголовок (для grouping, а не для UX).
  - `groupingKey: String?` — ключ вида `"{category}::{normalizedTitle}::{durationMinutes|na}::{minAge}"`.
  - Индекс `@@index([groupingKey])` для быстрых выборок.
- Sync-слой (TC gRPC + teplohod.info) при upsert Event заполняет:
  - `normalizedTitle` через `normalizeEventTitle` (из shared) → `.toLowerCase()`.
  - `groupingKey` на основе `category`, `normalizedTitle`, `durationMinutes`, `minAge`.
- API:
  - `GET /api/v1/multi-events?sort=popular|new&limit=N` — агрегированные группы (по `groupingKey`) для глобального каталога.
  - Детальный просмотр мульти-события `/events/m/{slug}` и таблица `EventGroup` — отдельный этап (см. Tasktracker, раздел «Каталог / Venues / Teplohod»).

---

## Фаза 1 UX: Afisha-inspired улучшения

> Добавлено: 2026-02-12. Источник: сравнительный анализ с Яндекс.Афишей.

### Цель

Увеличить конверсию выдачи на 20-30% за счёт:
- Лучшей сравнимости событий
- Снижения когнитивной нагрузки
- Ускорения выбора даты

### Принцип

**Afisha = простота. Daibilet = простота + интеллект.**

Не усложнять фронт раньше, чем сделана идеальная выдача. Afisha выигрывает не стеком, а UX-минимализмом и скоростью принятия решения.

### Этап 1 (текущий) — Quick Wins

1. **Лента дат** — горизонтальная навигация по датам (сегодня/завтра/выходные) на странице каталога. Mobile-first, без тяжёлого календаря. Бэкенд уже поддерживает `dateFrom`/`dateTo`.

2. **Смарт-бейджи на карточках** — "Оптимальный выбор" (по scoring-алгоритму), "Осталось N мест", ближайший сеанс. Управление вниманием пользователя.

3. **Каркас новых сущностей** — Location (PIER/VENUE/MEETING_POINT), Operator, Route в Prisma. Без привязки к UI.

### Посадочная «Музеи» (20.02.2026)

Шаблон посадочной страницы `/cities/[slug]/museums` — единый для всех городов, меняется только контент (`getMuseumsLandingContent(citySlug)`).

**Блоки:** HERO (H1, поиск, фильтры), «Лучший выбор» (CTA), секции «Главные / Частные / С детьми», полный каталог (GET /catalog, category=MUSEUM), «Маршрут на 1 день», FAQ, SEO-текст.

**Компоненты:** `page.tsx` (SSR), `MuseumsFilters` (Client), `MuseumsSections`, `MuseumRouteBuilder`. Ссылки со страницы города: категория «Музеи и Арт» и «Все музеи» → `/cities/{slug}/museums`.

**Масштабирование:** добавить ветку в `getMuseumsLandingContent` для нового города (heroTitle, anchors, faq, seoText). Быстрые фильтры (qf) в UI — бэкенд пока не поддерживает.

### Этап 2 (планируется)

- SEO-подборки (5+ автогенерируемых страниц на город)
- Страницы причалов и маршрутов
- Перелинковка: событие — причал — маршрут — подборка
- Улучшение карточки события (фото, условия, блок "как проходит")

---

## Blog Service — Архитектура SEO-блога

### Обзор

Blog Service генерирует SEO-оптимизированные статьи на основе данных каталога (события, теги, города, лендинги) с автоматической перелинковкой. Цель — органический трафик через информационные запросы (что посмотреть, куда сходить, лучшие экскурсии).

### Модель данных

```
Article
├── id          UUID PK
├── slug        String UNIQUE          // URL: /blog/{slug}
├── title       String
├── content     Text (Markdown)
├── excerpt     String?
├── cityId      UUID? → City
├── coverImage  String?
├── metaTitle   String?
├── metaDescription Text?
├── isPublished Boolean (default false)
├── publishedAt DateTime?
├── isDeleted   Boolean (default false)
├── version     Int (default 0)
├── createdAt   DateTime
├── updatedAt   DateTime
│
├── articleEvents  ArticleEvent[]      // M2M: привязка к событиям
└── articleTags    ArticleTag[]        // M2M: привязка к тегам
```

### Типы статей для автогенерации

| Тип | Шаблон заголовка | Источники данных | Пример slug |
|-----|------------------|------------------|-------------|
| **Гид по городу** | «Что посмотреть в {город} в 2026» | Cities, Events (top по рейтингу), Tags | `chto-posmotret-v-peterburge-2026` |
| **По категории** | «Лучшие {категория} в {город}» | Events по category, фильтр по городу | `luchshie-ekskursii-v-peterburge` |
| **По тегу** | «{Тег} в {город}: ТОП-{N}» | Events с тегом X в городе Y | `nochnye-ekskursii-v-peterburge` |
| **Сезонный гид** | «Куда сходить в {город} {сезон}» | Events + сезонные теги | `kuda-skhodit-v-kazani-zimoj` |

### Архитектура генерации

```
                    ┌──────────────┐
                    │   Триггер    │
                    │ cron / admin │
                    │   / sync     │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ ArticlePlanner│  — определяет какие статьи нужны
                    │              │    (город × тип × сезон)
                    └──────┬───────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │ DataCollector │          │  Templates   │
    │              │          │              │
    │ Events       │          │ city-guide   │
    │ Tags         │          │ category-top │
    │ Cities       │          │ tag-guide    │
    │ Landings     │          │ season-guide │
    └──────┬───────┘          └──────┬───────┘
           └────────────┬────────────┘
                        ▼
                 ┌──────────────┐
                 │  Renderer    │  — собирает Markdown из шаблона + данных
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │   Linker     │  — вставляет внутренние ссылки
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │  Article DB  │  — upsert в таблицу articles
                 └──────────────┘
```

### Алгоритм DataCollector

Для каждого типа статьи собираются:
- **Events**: топ-N по рейтингу/популярности с описаниями, ценами, длительностью
- **Tags**: активные теги с `_count.events > 0`
- **Cities**: название, описание, количество событий
- **Landings**: title, heroText, FAQ для перелинковки

### Перелинковка (Linker)

Каждая статья автоматически содержит:
- **3-5 ссылок на события**: `/events/{slug}` — из привязанных `ArticleEvent`
- **Ссылки на тег-страницы**: `/events?tag={slug}` — на основании `ArticleTag`
- **Ссылки на другие статьи**: `/blog/{slug}` — статьи того же города / смежных тем
- **Ссылки на лендинги**: `/cities/{city}/{landing}` — соответствующие лендинги

### Расписание генерации

| Триггер | Действие |
|---------|----------|
| После sync (events) | Пересчёт ТОП-N, обновление статей с изменёнными событиями |
| Cron (1 раз/неделю) | Генерация новых статей при появлении новых городов/тегов |
| Смена сезона (по дате) | Генерация/обновление сезонных статей |
| Админ (ручной) | Кнопка «Перегенерировать» на отдельной статье |

### Требования к контенту

- Минимальная длина статьи: 1500 символов
- Каждая статья содержит H1, вводный абзац, H2-секции, заключение
- Meta title ≤ 70 символов, meta description ≤ 160 символов
- Slug — транслитерация кириллицы (совпадает с общими соглашениями)
- `version` инкрементируется при каждом обновлении для отслеживания изменений
- `isPublished = false` по умолчанию — публикация через админку

### Будущее: OpenAI API

На следующем этапе `Renderer` будет заменён на вызов OpenAI API:
- Контекст = собранные данные (события, теги, описания)
- Промпт = шаблон статьи + стайл-гайд бренда Дайбилет
- Результат = уникальный Markdown, проходящий проверку антиплагиата
- Human-in-the-loop: статья создаётся как draft, публикация после ревью в админке

### Этап 3 (планируется)

- Персонализация: ближайший причал по геолокации
- Погодный бейдж: комфортно/ветрено + рекомендация
- Upsell через TripCombo
- "Следить за ценой" / "Лучшие предложения недели"

---

## Partner B2B API — Машинная интеграция

> Добавлено: 2026-02-14. Для поставщиков со своей системой бронирования.

### Архитектура

```
Система поставщика  ──[API Key + REST]──►  Partner API  ──►  PostgreSQL
                    ◄──[POST webhookUrl]──  Webhook Service
```

### Аутентификация

- Формат ключа: `dbl_` + 32 случайных символа
- Хранение: SHA-256 хеш в `api_keys`, оригинал не хранится
- Проверки: isActive, expiresAt, ipWhitelist, operator.isActive
- `lastUsedAt` обновляется fire-and-forget

### Endpoints (`/api/v1/partner/`)

| Группа | Метод | Назначение |
|--------|-------|------------|
| Каталог | `POST /events` | Upsert события по externalId |
| Каталог | `PUT /events/:externalId` | Обновление события |
| Каталог | `DELETE /events/:externalId` | Деактивация |
| Каталог | `POST /events/:externalId/offers` | Upsert оффера |
| Каталог | `PATCH /offers/:externalId/availability` | Быстрое обновление наличия/цены |
| Заказы | `GET /orders` | Список заказов (фильтры) |
| Заказы | `POST /orders/:id/confirm` | Подтверждение (state machine) |
| Заказы | `POST /orders/:id/reject` | Отклонение (state machine) |
| Отчёты | `GET /reports/sales` | Продажи за период (JSON + CSV) |
| Служ. | `GET /whoami` | Информация о ключе |

### Webhook

- Типы: `order.created`, `order.cancelled`, `payment.paid`, `payment.refunded`
- Подпись: `HMAC-SHA256(JSON.stringify(body), webhookSecret)` → заголовок `X-Webhook-Signature`
- Доставка: BullMQ, 3 ретрая (5s → 10s → 20s)

---

## Unified Checkout — Roadmap (для планировщика)

> Добавлено: 2026-02-14. Нужен для работы планировщика программ. Приоритет — после подключения YooKassa.

### Контекст

Планировщик программ объединяет несколько событий из разных источников (TC, teplohod.info, MANUAL, Partner) в один пакет. Для единого ваучера необходима оплата на нашей стороне через YooKassa, даже для событий билетных систем.

### Текущие ограничения

1. **TC Widget / REDIRECT** — оплата происходит на стороне провайдера, мы не контролируем
2. **Несколько провайдеров в одной корзине** — невозможно оплатить одним платежом
3. **Планировщик программ** — без unified checkout пользователь должен оплачивать каждое событие отдельно

### Целевая архитектура

```
Пользователь → [Корзина: TC + TEP + MANUAL] → YooKassa → PaymentIntent.PAID
                                                                ↓
                                              ┌─────────────────┼──────────────┐
                                              ▼                 ▼              ▼
                                         TC API v2         TEP API         MANUAL
                                        POST /orders       (резерв)     OrderRequest
                                         PATCH done      (confirm)       (pending)
```

### Фазы внедрения

1. **YooKassa для REQUEST** — оплата собственных событий (MVP, минимальный риск)
2. **YooKassa для TC events** — создаём заказ в TC после оплаты (резерв 15 мин → confirm)
3. **Unified cart** — смешанная корзина (TC + TEP + MANUAL) с единым платежом
4. **Ваучер** — единый QR/PDF для пакета событий

### Ключевые риски

- **Двойной резерв**: TC резерв 15 мин vs время оплаты YooKassa → sequence: pay → reserve → confirm
- **Partial failure**: если 1 из N событий не забронировано → partial refund
- **Чарджбеки**: при отмене бронирования, деньги уже у нас → нужна чёткая политика возвратов

### Зависимости

- [x] PaymentIntent layer (stub) — готов
- [x] State Machine (CheckoutSession/OrderRequest/PaymentIntent) — готов
- [x] offersSnapshot immutable — готов
- [ ] YooKassa SDK подключение
- [ ] Sandbox-тесты
- [ ] Webhook верификация (IP whitelist + HMAC)

### Преимущества Daibilet перед Афишей (killer features)

- Ближайший причал + время доезда
- Погодный бейдж с рекомендацией
- Правда о маршруте (какие мосты гарантированы)
- Честная длительность (время на воде + посадка/выход)
- Прозрачные условия возвратов/переносов

---

## План 26 PR: Инфра + типизация + UX + Checkout

26 задач (каждая = 1 PR): Nginx static, Feature Flags, Pino/Sentry, Redis cache, типизация (tc-sync, Proto, where builders), email order-confirmed/completed, каталог (view toggle, venue detail), Teplohod widgets, Supplier RBAC + drafts, Checkout (package flow, YooKassa, orders tracking, webhook idempotency). Миграции M1–M8.

---

## Partitioning Plan (EventSession)

**Цель:** Партиционировать `event_sessions` по `startsAt` (месяц).

### Шаги (без простоя)

1. **Подготовка:** Создать `event_sessions_new` (PARTITION BY RANGE (startsAt)), партиции на N месяцев вперёд. Скрипт: `infra/migrations/create_event_sessions_partitions.sql`.
2. **Миграция:** `INSERT INTO event_sessions_new SELECT * FROM event_sessions` (batch 10k).
3. **Переключение:** RENAME event_sessions → event_sessions_old, event_sessions_new → event_sessions.
4. **Cron:** Раз в месяц создавать партиции на следующие 3 месяца.

**Rollback:** RENAME обратно, перезапуск приложения.

---

## Архитектура Supplier (Operator vs SupplierUser)

| Сущность | Что это | Роль |
|----------|---------|------|
| **Operator** | Юрлицо / правообладатель | ООО/ИП, договор, комиссия |
| **SupplierUser** | Аккаунт в ЛК | Логин, доступ, создаёт Event/Venue |
| **Provider** | Источник инвентаря | TC, TEPLOHOD, MANUAL |
| **Offer** | Предложение | EventOffer — цена, deeplink |

**Operator (1) ← SupplierUser (N).** Контент привязан к Operator через `operatorId`. Operator с `isSupplier = true` → доступ в Supplier Portal.

**Режимы:** A) Operator-модель — вы ведёте контент, Supplier не обязателен. B) Supplier-модель — Supplier создаёт DRAFT, модерация. C) Ручной — MANUAL, self-serve.

**Модерация:** DRAFT → PENDING_REVIEW → APPROVED/REJECTED. AUTO_APPROVED при trustLevel 1–2.

**Роли:** OWNER (всё), MANAGER (события/офферы), CONTENT (контент), ACCOUNTANT (отчёты).

**Operator.status:** ACTIVE | ARCHIVED | SUSPENDED.

**createdByType:** ADMIN | SUPPLIER | IMPORT — для Event/Venue.

---

## Teplohod Widget / PartnerEventId инвариант

- **Источник данных**: `https://api.teplohod.info/v1/events` (или `/v1/events?compact`) — поле `id` Teplohod является **внешним идентификатором события**.
- **Хранение в БД**:
  - Для событий из Teplohod: `Event.source = 'TEPLOHOD'`, `Event.tcEventId = String(id)` (строка числа без префиксов).
  - Глобальный ключ: `@@unique([source, tcEventId])` + `@@index([source, tcEventId])` в Prisma-модели `Event`.
- **Инвариант партнёрского идентификатора**:
  - `PartnerEventId = (source === 'TEPLOHOD' ? tcEventId : id)`.
  - Реализация на фронтенде: `getPartnerEventId(event)` в `packages/frontend/src/lib/partnerIds.ts`:
    - для Teplohod-событий всегда возвращает `tcEventId` (голое число из Teplohod API),
    - для всех остальных — внутренний `Event.id` (UUID).
- **Виджет и embed**:
  - Партнёрский скрипт `public/teplohod.js` ищет `.db-teplohod-widget` и создаёт iframe на `/widgets/teplohod?eventId=...`, где:
    - для Teplohod: `data-event-id="<id из /v1/events>"`,
    - для ручных/внутренних событий допустим UUID (локальное тестирование).
  - Бэкенд-виджет (`TeplohodWidgetsService`) при `GET /api/widgets/teplohod/event?eventId=...`:
    - если параметр похож на UUID → ищет по `Event.id` (наш внутренний ключ),
    - иначе нормализует Teplohod id (`normalizeTeplohodExternalId`) и ищет по
      `source = 'TEPLOHOD'` + `tcEventId = "<id>"` (с fallback на устаревшие значения вида `tep-<id>`).
- **Миграция старых данных**:
  - Одноразовая SQL-миграция в `packages/backend/prisma/migrations/*_teplohod_tcEventId_normalize` нормализует все старые `tcEventId` Teplohod к чистым числам (`tep-123` → `"123"`), чтобы исключить расхождения между БД и внешним API.
- **Тесты**:
  - Vitest-тесты в `packages/backend/test/teplohod-contract.spec.ts` фиксируют:
    - нормализацию внешнего Teplohod id (`normalizeTeplohodExternalId`),
    - стратегию поиска события в `TeplohodWidgetsService.findEvent`,
    - инвариант `getPartnerEventId` (Teplohod → `tcEventId`, остальные → `id`).

---

## Политика фильтров (QF)

**Query Filters:** type (excursion|venue|event), group, slug, title, isSeo, priority. 17 фильтров в seed.

**Маппинг:** slug → EventSubcategory, VenueType, EventAudience, tag. См. `query-filter-map.ts`.

**SEO URL:** `/{city}/{type}/`, `/{city}/{type}/{filter}/`. Индексируем 1–2 фильтра в path, остальное — query.

**Модель:** QueryFilter (id, type, group, slug, title, isSeo, priority), @@unique([slug, type]).
