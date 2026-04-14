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

---

# Вопросы по архитектуре Taxonomy (Subcategories) + SEO Audit (QA)

> Цель: закрыть вопросы перед внедрением SEO Audit как операционного read‑слоя, тесно связанного с таксономией подкатегорий.

## 1) Scope и “что считаем качеством”

- Где проходит граница между **publish‑gate** (жёсткая блокировка публикации) и **SEO Audit** (операционное качество)? Какие issue должны быть `ERROR` и блокировать активацию/индексацию?
- Нужна ли отдельная политика “можно публиковать, но нельзя индексировать” (thin pages / слабый контент), и где она хранится (Landing.isIndexable, derived rule, manual override)?

## 2) Snapshot vs on-the-fly

- Какой ожидаемый порядок количества сущностей (events/venues/articles/collections/landings/subcategories) и какие целевые SLO для `/admin/seo-audit/*`?
- Нужен ли **snapshot read‑model** уже на MVP: генерация по расписанию (cron/BullMQ) или инвалидация по событиям (upsert контента/публикация/изменение связей)?
- Какая стратегия кэширования: Redis TTL + `generatedAt`, или отдельная таблица snapshot’ов?

## 3) Унификация issue codes и severity

- Должен ли список `issueCode` быть “контрактом” (enum/union) с явной версионизацией, или допускаются динамические коды (опасно для UI/фильтров)?
- Как согласовывать `severity` vs `group` (CONTENT/SEO/STRUCTURE/CATALOG/LINKING/PUBLICATION): кто владелец таксономии кодов и как поддерживать обратную совместимость?

## 4) Taxonomy rules (completeness + misuse)

- Является ли subcategory обязательной для публикации `Event`/`Venue`? Если “обязательной” только для части типов — где хранится правило (policy by category/type)?
- Считаем ли ошибкой “inactive subcategory still in use”, и что тогда должен делать UI: запрещать сохранение или только подсвечивать?
- Ограничение “слишком много subcategories”: какое число является допустимым и зависит ли оно от типа (UNIVERSAL vs EVENT_ONLY)?

## 5) Admin UX: триаж и переходы

- Какие deep‑links обязательны:
  - из SEO Audit issue → в сущность (admin‑деталка),
  - из сущности → “посмотреть issues” (фильтрованный список)?
- Нужно ли показывать “health badge” в списках (Events/Venues/Landings) или только в деталке?

## 6) Public URL и targetUrl в audit

- Как строить `targetUrl` для разных сущностей (event/venue/article/collection/landing/promo/subcategory-landing) с учётом city‑routing и каноникализации?
- Нужен ли единый helper на backend для построения targetUrl (чтобы UI не дублировал routing rules)?

