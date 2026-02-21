# Sitemap и SEO-автогенерация

> Последнее обновление: 2026-02-21

## 1. Структура sitemap

Sitemap index + несколько подсайтмапов (проще обновлять, не упираться в лимиты).

### 1.1 /sitemap.xml (sitemap index)

```xml
<sitemapindex>
  <sitemap><loc>https://daibilet.ru/sitemaps/sitemap-static</loc></sitemap>
  <sitemap><loc>https://daibilet.ru/sitemaps/sitemap-cities-catalog</loc></sitemap>
  <sitemap><loc>https://daibilet.ru/sitemaps/sitemap-cities-filters</loc></sitemap>
  <sitemap><loc>https://daibilet.ru/sitemaps/sitemap-offers</loc></sitemap>
  <sitemap><loc>https://daibilet.ru/sitemaps/sitemap-articles</loc></sitemap>
</sitemapindex>
```

### 1.2 Подсайтмапы

| Файл | Содержимое |
|------|------------|
| sitemap-static | Главная, /cities, /providers, /requisites, /offer, /privacy, /terms, /gift-certificate |
| sitemap-cities-catalog | /events, /venues, /cities/[slug], /cities/[slug]/museums (10 городов) |
| sitemap-cities-filters | city × SEO-фильтры (QueryFilter isSeo=true, count ≥ 6) |
| sitemap-offers | /events/[slug], /venues/[slug] |
| sitemap-articles | /blog, /blog/[slug] |

### 1.3 Правила

- Только страницы 200 OK, без noindex
- SEO-фильтры — только если count ≥ 6
- Query params (?date=...) не индексируем
- lastmod — от реального updatedAt

## 2. Текущая URL-архитектура

- `/` — главная
- `/events` — каталог
- `/events?city=X&category=Y` — фильтры
- `/events/[slug]` — карточка события
- `/venues` — музеи
- `/venues/[slug]` — карточка места
- `/cities` — города
- `/cities/[slug]` — страница города
- `/cities/[slug]/museums` — музеи города
- `/blog` — блог
- `/blog/[slug]` — статья

Будущая цель: `/{city}/{type}/` (excursions|museums|events) — требует миграции маршрутов.

## 3. SEO-автогенерация

### 3.1 Модели

**SeoTemplate** — шаблоны с переменными:
- type: excursion | venue | event
- level: 0 (базовый), 1 (1 фильтр), 2 (2 фильтра)
- template: текст с `{{city}}`, `{{filter_title}}`, `{{count}}`, `{{season}}`

**SeoContent** — кеш сгенерированных текстов:
- cityId, type, filtersKey (walking-history)
- title, h1, description, body

### 3.2 Переменные шаблона

- `{{city}}` — Санкт-Петербург
- `{{city_genitive}}` — Санкт-Петербурге
- `{{type_title}}` — экскурсии / музеи / мероприятия
- `{{filter_title}}` — пешеходные
- `{{count}}` — 28
- `{{season}}` — лето | зима | сезон

### 3.3 Пороги

- Level 0 — всегда
- Level 1 — count ≥ 6
- Level 2 — count ≥ 10 + whitelist комбинаций

### 3.4 getSeason()

```ts
function getSeason(): 'лето' | 'зима' | 'сезон' {
  const m = new Date().getMonth();
  if ([5,6,7].includes(m)) return 'лето';
  if ([11,0,1].includes(m)) return 'зима';
  return 'сезон';
}
```

### 3.5 LLM

- Первичная генерация шаблонов
- Уникальные вступления для топ-городов (СПб, Москва)
- Не использовать при каждом рендере

---

## 4. Anti-thin-content (правила индексации)

Страница (city+type+filters) индексируется (index,follow) только если:

- **Есть листинг**: offersCount ≥ 6 (L0/L1), offersCount ≥ 10 (L2)
- **Уникальность**: body ≥ 600 символов, description 120–160, title ≠ h1
- **Контент**: в body обязательно count, «как выбрать», «что входит», цены, подтверждение
- **Level2**: только по whitelist комбинаций (walking+history, concert+rock и т.д.)

Для слабых страниц: noindex,follow + canonical на родительский кластер.

---

## 5. Production-шаблоны

Готовые шаблоны L0/L1/L2 для excursions, museums, events — в `prisma/seed-seo-templates.ts`.

Плейсхолдеры: `{{city}}`, `{{city_gen}}`, `{{type_title}}`, `{{type_title_plural}}`, `{{filter_title}}`, `{{filter_title2}}`, `{{count}}`, `{{price_from}}`, `{{price_to}}`, `{{season_hint}}`, `{{year}}`.

---

## 6. Связка и рантайм

- **SeoGeneratorService**: `upsertSeoForPage()`, `regenerateAllForCity()`
- **Страница**: берём SeoContent (cityId+type+filtersKey), при отсутствии — upsert или очередь
- **Related links**: `relatedLinksJson` — блок «Читайте также» (6–10 ссылок)

---

## 7. Стратегия авто-лендингов

Полная модель — `docs/seo-landing-strategy.md`: LandingDraft vs LandingPage, пороги публикации, Quality Score, запрет мусорных комбинаций, один URL — одна интент-модель.

## 8. SeoMeta — универсальный SEO-блок

Спека `docs/seo/SeoMetaSpec.md`. Модель для City, Event, Venue, Landing, Article, Combo. API: GET/PUT `/admin/seo/:entityType/:entityId`, POST generate, GET `/seo/:entityType/:entityId` (public).
