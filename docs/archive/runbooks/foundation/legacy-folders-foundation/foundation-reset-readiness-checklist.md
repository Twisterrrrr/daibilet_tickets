# Reset readiness checklist

Цель: убедиться, что reset-окружение “годится к жизни” (контент/SEO/админка) **до** того, как мы начнём заново строить каталог (events/venues/import).

## 0) Safety / guardrails

- [ ] `TARGET_DATABASE_URL` указывает на **новую** БД (не prod).
- [ ] `pnpm --filter @daibilet/backend db:generate` выполнен после переключения ветки.
- [ ] Prisma client и `tsc --noEmit` для backend проходят локально.

## 1) Данные: content layer

- [ ] `City`: города на месте, `isActive=true` где нужно.
- [ ] `LandingPage`: лендинги на месте, `cityId` валиден, `status/isActive` корректны.
- [ ] `Collection`: подборки на месте, `cityId` валиден (или null), фильтры не пустые.

## 2) SEO scaffolding

- [ ] `SeoTemplate`: шаблоны существуют и покрывают основные типы/уровни.
- [ ] `Tag`: теги, используемые лендингами/подборками, существуют и активны.
- [ ] `Region/RegionCity`: регионы (если используются в публичном UI/SEO) заполнены.

## 3) Promo (главная)

- [ ] `PromoBlock`: блоки отдаются в public API.
- [ ] `PromoCollection` и `PromoCollectionRule`: существуют и активны.
- [ ] Если promo-коллекции ссылаются на events/venues — они либо отключены, либо ожидаемо возвращают пусто до наполнения каталога.

## 4) Public routes smoke

- [ ] `/api/v1/cities` (или эквивалент) отдаёт города.
- [ ] `/api/v1/landings` и `/api/v1/collections` отдают списки.
- [ ] Страницы города/лендинга/подборки на фронте не падают (даже если события пока пустые).

## 5) Admin CRUD (минимум)

- [ ] Можно залогиниться initial admin (создан через reset seed).
- [ ] CRUD для `LandingPage` работает.
- [ ] CRUD для `Collection` работает.
- [ ] CRUD для `PromoBlock/PromoCollection` (если нужен) работает.

## 6) Условие “готово”

Reset считается готовым для следующего этапа, когда пункты **0–5** зелёные.
Дальше можно начинать новую модель каталога: events/venues/import уже **поверх reset БД**.

