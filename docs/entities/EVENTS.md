# Entity: Events

Один файл на сущность: роль в домене, модель, админка, публичное использование, SEO, связи.

## Domain role

Основная коммерческая единица витрины: событие, офферы, сеансы, классификация, качество публикации.

## Schema / model (канон описания)

- [`../core/events.md`](../core/events.md) — продуктовый контракт, сеансы, вкладки, editability по источнику.
- [`../core/classification.md`](../core/classification.md) — подкатегории, publish-gate.

## Admin V3

- Список/деталь: `packages/frontend-admin-v3` — модули `events/`.
- Readiness / quality: через backend DTO (не дублировать правила на фронте).

## Public usage

- Каталог и карточки событий: `packages/frontend`.

## SEO

- Зависит от шаблонов страниц и данных события; общие правила: [`../product/seo.md`](../product/seo.md).

## Relations

- Venue, city, supplier/operator, offers, sessions, landings/collections — см. Prisma и [`../ARCHITECTURE.md`](../ARCHITECTURE.md).
