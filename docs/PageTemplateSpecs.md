# Спецификации шаблонов страниц событий

> На основании модели Event, Venue, EventSession. Каждая категория имеет свой набор блоков и правил показа.

---

## Посадочная «Музеи» по городу (20.02.2026)

**URL:** `/cities/[slug]/museums` (напр. `/cities/saint-petersburg/museums`)

**Файлы:** `packages/frontend/src/app/cities/[slug]/museums/`

| Файл | Назначение |
|------|------------|
| `page.tsx` | Server Component: данные (api.getCatalog), SEO, generateMetadata, JSON-LD |
| `_components/MuseumsFilters.tsx` | Client: поиск, сортировка, быстрые фильтры (qf) — URL как источник истины |
| `_components/MuseumsSections.tsx` | Блоки «Главные», «Частные», «С детьми» (для СПб; другие города — пусто) |
| `_components/MuseumRouteBuilder.tsx` | «Маршрут на 1 день» — апселл комбо (3 точки + CTA) |

**Блоки страницы:** HERO → Лучший выбор (CTA) → Секции → Каталог (карточки) → Маршрут дня → FAQ → SEO-текст.

**Контент:** `getMuseumsLandingContent(citySlug)` — heroTitle, heroSubtitle, anchors, bestChoice, faq, seoText, mainMuseums, modernMuseums, kidsMuseums. Для нового города — добавить ветку.

**Ссылки со страницы города:** категория «Музеи и Арт» и «Все музеи» в секции venues → `/cities/{slug}/museums`.

**API:** GET /catalog?category=MUSEUM&city={slug}&q=&sort=&page=&limit=24. Быстрые фильтры (qf) в UI — бэкенд пока не поддерживает.

---

## Единый каталог (Вариант B)

> Добавлено: 2026-02-16

- **GET /api/v1/catalog** — единый API для листинга
- **category=MUSEUM** → Venue (музеи, галереи)
- **category=EXCURSION | EVENT** → Event
- **CatalogItem** — общий формат карточки: type, id, slug, title, citySlug, imageUrl, priceFrom, rating, dateLabel, …
- Страница `/events` при category=MUSEUM вызывает getCatalog и рендерит CatalogCard → VenueCard
- Детали: venue → /venues/[slug], event → /events/[slug]

---

## Общие принципы

- **Таблица тарифов не нужна** — достаточно «от X ₽»
- **Блоки выводить только при заполнении** — не показывать пустые секции
- **Источники данных**: Event, связанный Venue, EventSession, tcData

---

## 1. Музеи (EventCategory.MUSEUM)

### Особенности

- **dateMode**: чаще `OPEN_DATE` (билет с открытой датой), реже `SCHEDULED` (экскурсии по расписанию)
- **isPermanent**: постоянная экспозиция vs временная выставка (endDate — до какой даты)
- **venueId**: музей как площадка — основная сущность; Event может быть «Входной билет», «Выставка X»
- **Subcategory**: MUSEUM_CLASSIC, EXHIBITION, GALLERY, PALACE, PARK, ART_SPACE, SCULPTURE, CONTEMPORARY

### Блоки и поля

| Блок | Источник | Условие показа |
|------|----------|----------------|
| **Hero** | Event | всегда |
| Режим работы | Venue.openingHours | при заполнении |
| Цена «от X ₽» | Event.priceFrom / Venue.priceFrom | при priceFrom > 0 |
| Галерея залов/экспозиции | Venue.galleryUrls / Event.galleryUrls | при наличии хотя бы одного URL |
| Текущие выставки | Event (venueId, isPermanent=false), Venue.events | список привязанных выставок |
| Как добраться | Venue.address, metro, district / Event.address | при address ИЛИ metro |
| Правила посещения | Venue.features, highlights; EventOverride (будущее) | при наличии (фото, сумки, коляски, аудиогид) |
| Описание | Event.description / Venue.description | при заполнении |
| Отзывы | Review, ExternalReview | стандартно |
| Похожие события | relatedEvents | стандартно |

### Дополнительные поля (существующие в модели)

- **Venue**: openingHours (JSON), metro, district, phone, website, highlights, faq, features (no_queue, audio_guide, kids_friendly, wheelchair)
- **Event**: durationMinutes (рекомендуемое время визита), minAge, endDate (для временных выставок)

### Правила

- Hero: вместо «Ближайший сеанс» — «Режим работы» (если OPEN_DATE) или даты сеансов (если SCHEDULED)
- Quick info: Адрес, Место (Venue), Режим работы, Рекомендуемая длительность
- Для временной выставки: бейдж «до DD.MM.YYYY» в hero

---

## 2. Мероприятия (EventCategory.EVENT)

### Особенности

- **dateMode**: всегда `SCHEDULED` — конкретные сеансы
- **Subcategory**: CONCERT, SHOW, STANDUP, THEATER, SPORT, FESTIVAL, MASTERCLASS, PARTY
- Ключевые данные: дата/время, площадка, состав, программа, возраст

### Блоки и поля

| Блок | Источник | Условие показа |
|------|----------|----------------|
| **Hero** | Event | всегда |
| Ближайший сеанс | EventSession | стандартно |
| Цена «от X ₽» | Event.priceFrom | при priceFrom > 0 |
| Программа / сет-лист | tcData / EventOverride (будущее JSON) | при заполнении |
| Состав (артисты, ведущие) | tcData / EventOverride (будущее JSON) | при заполнении |
| Зал / площадка | Venue / tcData.venue | при venueId или tcData.venue; вместимость — если есть |
| Расписание сеансов | EventSession | при sessions.length > 0 |
| Правила | EventOverride (будущее) / Venue.faq | опоздания, возвраты, возраст |
| Как добраться | Venue / Event.address, metro | при заполнении |
| Галерея | Event.galleryUrls | при наличии |
| Описание | Event.description | при заполнении |
| Отзывы | стандартно | |
| Похожие события | relatedEvents | стандартно |

### Дополнительные поля (нужны в модели или tcData)

- **Программа** (program / setlist): массив строк или JSON — для концертов, спектаклей
- **Состав** (cast / performers): массив {name, role?} — артисты, ведущие, лекторы
- **Зал** (hall): название зала, вместимость — часто в tcData.venue

### Правила

- Hero: дата/время ближайшего сеанса — обязательно для EVENT
- Возрастное ограничение (minAge): бейдж «18+», «12+» и т.д.
- Подтип (CONCERT, THEATER, STANDUP и т.д.): влиять на иконки, акцентные цвета в UI
- Quick info: Адрес/площадка, Длительность, Возраст, Ближайший сеанс

---

## 3. Экскурсии (EventCategory.EXCURSION)

> Краткая выжимка — полная спецификация в Tasktracker.

- Таблица тарифов не нужна — «от X ₽»
- Блоки при заполнении: галерея, маршрут, меню, как добраться, правила, преимущества, правила бронирования
- Название теплохода — только для RIVER (речные прогулки)

---

## Сводная матрица полей по категориям

| Поле | Экскурсии | Музеи | Мероприятия |
|------|-----------|-------|-------------|
| Режим работы | — | ✓ (Venue) | — |
| Ближайший сеанс | ✓ | опционально | ✓ |
| Программа/сет-лист | — | — | ✓ |
| Состав | — | — | ✓ |
| Зал/вместимость | — | — | ✓ |
| Маршрут | ✓ | — | — |
| Меню | ✓ (RIVER) | — | — |
| Теплоход | ✓ (RIVER) | — | — |
| Текущие выставки | — | ✓ | — |
| OPEN_DATE | редко | часто | никогда |
