# Project — Дайбилет (daibilet.ru)

> Последнее обновление: 2026-02-13

## Миссия

Агрегатор билетов на экскурсии, музеи и мероприятия с умным подбором программы поездки. Стартовые города: Москва, Санкт-Петербург, Казань, Владимир, Ярославль.

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
- **YooKassa** — оплата бандлов/программ (запланировано)
- **SMTP** — транзакционные email (@nestjs-modules/mailer + Handlebars)

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
- **Location** — причал, площадка, точка встречи (каркас, Фаза 2)
- **Operator** — организатор/оператор (каркас, Фаза 2)
- **Route** — маршрут с POI (каркас, Фаза 2)

### Классификация при синхронизации

При синхронизации (TC gRPC, Teplohod) используется улучшенный ключевой классификатор: по заголовку и описанию автоматически назначаются **category** и **subcategory**. Порядок проверки важен: маркеры EVENT проверяются **до** EXCURSION, чтобы избежать ложных срабатываний (например, «tribute tour», «мастер-класс» в названии концерта не должны уходить в экскурсии). Категория KIDS проверяется первой (например, «детский спектакль» → KIDS, а не EVENT).

## Соглашения

- REST API: `/api/v1`
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

### Преимущества Daibilet перед Афишей (killer features)

- Ближайший причал + время доезда
- Погодный бейдж с рекомендацией
- Правда о маршруте (какие мосты гарантированы)
- Честная длительность (время на воде + посадка/выход)
- Прозрачные условия возвратов/переносов
