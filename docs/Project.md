# Project — Дайбилет (daibilet.ru)

> Последнее обновление: 2026-02-21

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
- **EventOverride** — правки админа поверх sync-данных (title, description, imageUrl, isHidden, manualRating, tagsAdd/Remove, **category**, **subcategory**).  
  **Заголовок**: `Event.title` — оригинал из источника (TC, Teplohod), обновляется при каждом sync. `EventOverride.title` — кастомный заголовок для Daibilet. Для отображения используется override ?? event.title. Оригинал сохраняется в `Event.title` для импорта/экспорта и виджетов.
- **EventOffer** — оффер из конкретного источника (TC/TEPLOHOD/RADARIO/TIMEPAD/MANUAL). Содержит: source, purchaseType (TC_WIDGET/REDIRECT/API_CHECKOUT), externalEventId, deeplink, priceFrom, commission, status (ACTIVE/HIDDEN/DISABLED), isPrimary.
- **EventSession** — конкретный сеанс (дата, свободные места, цены). Привязан к Event и к EventOffer (offerId). Для teplohod.info — реальное расписание из `eventTimes` API (дата, время отправления, кол-во свободных мест).
- **Tag** — теги для фильтрации и группировки (тема, аудитория, сезон)
- **LandingPage** — SEO-подборка по тегу/фильтрам
- **ComboPage** — готовая программа с курированными событиями
- **Article** — SEO-статья с перелинковкой
- **SeoTemplate** — шаблоны для SEO-автогенерации (titleTpl, h1Tpl, descriptionTpl, bodyTpl). См. `docs/sitemap-seo-spec.md`.
- **SeoContent** — кеш сгенерированных SEO-текстов (cityId, type, filtersKey, title, h1, description, body, noindex, canonicalUrl, relatedLinksJson).
- **SeoMeta** — универсальный SEO-блок для City, Event, Venue, Landing, Article, Combo. См. `docs/seo/SeoMetaSpec.md`.
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
- **Operator** — юридическое лицо/правообладатель. Поля маркетплейса: isSupplier, trustLevel, commissionRate, status (ACTIVE/ARCHIVED/SUSPENDED). Подробно: `docs/SupplierArchitecture.md`.
- **SupplierUser** — аккаунт поставщика (Operator 1—N SupplierUser). Роли: OWNER, MANAGER, CONTENT, ACCOUNTANT.
- **User** — пользователь сайта (регистрация/вход). Избранное в UserFavorite (eventSlug).
- **ApiKey** — API-ключ для Partner B2B API: SHA-256 хеш (не храним оригинал), prefix (8 символов для UI), rateLimit, ipWhitelist, expiresAt.
- **Venue** — место (музей, галерея, арт-пространство). VenueType enum (MUSEUM/GALLERY/ART_SPACE/EXHIBITION_HALL/THEATER/PALACE/PARK). Содержит: openingHours (JSON), priceFrom, rating, galleryUrls, address/metro/lat/lng, operatorId (партнёр). Soft delete, optimistic lock.
- **Event расширен**: venueId (FK к Venue), dateMode (SCHEDULED/OPEN_DATE), isPermanent, endDate. Шаблоны страниц по категориям — `docs/PageTemplateSpecs.md`.
- **EventOffer расширен**: venueId для прямых офферов к месту (без привязки к Event).
- **Location** — причал, площадка, точка встречи (каркас, Фаза 2)
- **Route** — маршрут с POI (каркас, Фаза 2)

### Классификация при синхронизации

При синхронизации (TC gRPC, Teplohod) используется улучшенный ключевой классификатор: по заголовку и описанию автоматически назначаются **category** и **subcategory**. Порядок проверки важен: маркеры EVENT проверяются **до** EXCURSION, чтобы избежать ложных срабатываний (например, «tribute tour», «мастер-класс» в названии концерта не должны уходить в экскурсии). Категория KIDS проверяется первой (например, «детский спектакль» → KIDS, а не EVENT).

## Соглашения

- REST API: `/api/v1`
- Observability: `docs/Observability.md` — requestId, PII masking, логирование
- Цены в копейках (целое число)
- Даты — ISO 8601, UTC в БД, локальные при отображении
- Slug — транслитерация кириллицы
- UUID v4 для всех первичных ключей
- Коммиты: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

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
