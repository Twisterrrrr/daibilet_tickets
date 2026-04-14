# Вопросы по архитектуре Landings (QA)

> Цель: закрыть вопросы перед изменениями модели/CRUD/API/Admin UI/Public routing, чтобы не сломать текущие SEO‑маршруты и selection‑принцип.

## 1) Роутинг и каноникализация

- Должен ли **global hub** жить строго в корне (например, `/river-cruises`) или допускается неймспейс (например, `/landings/river-cruises`)?
- Для тем, у которых уже есть отдельные хабы (`/river-cruises`, `/bus-tours`, `/salute-9-may`), хотим ли мы:
  - мигрировать их на единый landing‑рендер (данные из БД) или оставить как кастомные страницы/хабы?
- Должен ли существовать редирект из `/<topicSlug>` → `/cities/:citySlug/<topicSlug>` при наличии выбранного города (cookie/param), или hub всегда остаётся самостоятельной страницей?

## 2) Семейства (multi-city family) и модель данных

- Нужна ли явная доменная сущность “family” в БД (parent-child), или достаточно хранить “topicKey” и собирать варианты по ключу?
- Может ли один city landing принадлежать **нескольким** семействам/топикам (M:N), или строго 0..1 parent?
- Хотим ли мы поддерживать кейс “HUB → city variants” через ту же parent-child связь, или HUB остаётся только публичной страницей-навигатором вне `LandingPage`?

## 3) Источник каталога на лендинге

- Какой режим считаем **MVP‑обязательным**:
  - PRIMARY_COLLECTION (самый безопасный),
  - AUTO_QUERY (масштабирование),
  - или оба?
- Если появится `queryConfig`, где должна жить валидация (backend DTO + runtime checks) и какой контракт считаем “разрешённым минимумом” (чтобы не превратить JSON в “что угодно”)?
- Что считается “storefront-safe” событием для выдачи лендинга в текущем домене (isActive + publish-gate + sellable offers/sessions)? Нужно ли дополнительно фиксировать правило в одном месте?

## 4) Публикация и качество (anti thin pages)

- Порог “пустоты”: публиковать CITY landing только если `resolvedEventsCount > 0` — ок; нужен ли минимальный порог (например, ≥3/≥5) для индексации?
- Должны ли мы автоматически ставить `isIndexable=false` при слабой выдаче/контенте, или это строго ручное поле?

## 5) Связи с Collections / Articles

- Нужна ли двусторонняя связь Article ↔ Landing (article хранит landingId/topicKey), или достаточно one-way (landing хранит relatedArticleIds)?
- Для related collections/articles требуется ли сортировка/приоритизация (например, “primary + secondary”), или достаточно массива id?

## 6) Admin UX и preview

- Нужен ли отдельный endpoint preview “resolved events”, или можно использовать существующий публичный read‑path в preview‑режиме (как сделано для preview событий/площадок)?
- Нужен ли flow “create child from parent” как MVP (prefill), или это polish‑фаза?

