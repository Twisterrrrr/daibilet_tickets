# Architecture — системное устройство (активный контур)

**Назначение:** одна точка входа для **текущего целевого устройства** системы: границы, модули, потоки данных, принципы. Это **не** дневник решений (см. [`DECISIONS.md`](DECISIONS.md), [`Diary.md`](Diary.md)).

**Канон слоёв:** [`SYSTEM.md`](SYSTEM.md) (инварианты данных и интеграций), [`PRODUCT.md`](PRODUCT.md) (поведение продукта). Список верхнего уровня — в [`PROJECT-FOUNDATION.md`](PROJECT-FOUNDATION.md) § Source of Truth.

**Полный текст инвариантов (ядро):** [`core/architecture.md`](core/architecture.md). При расхождении приоритет у детализации в `core/architecture.md`; этот файл — навигация и сводка.

---

## 1) Краткая карта системы

| Слой | Роль | Код (ориентир) |
|------|------|----------------|
| Public site | Витрина, SEO, лендинги, каталог | `packages/frontend` |
| Admin V3 | Операционное управление каталогом и контентом | `packages/frontend-admin-v3` |
| Admin V1 | Legacy toolbox | `packages/frontend-admin` |
| Backend API | Доменные сервисы, admin/public API, webhooks | `packages/backend` |
| Shared | Типы, общие утилиты | `packages/shared` |
| Data | PostgreSQL + Prisma; Redis; очереди | см. [`runbooks/infra.md`](runbooks/infra.md) |

---

## 2) Bounded contexts (логические границы)

- **Catalog:** события, площадки, города, таксономия, связи и derived-слои.
- **Ingestion:** импорт и синхронизация (Ticketscloud, Teplohod), маппинг и ограничения.
- **Admin:** write-path, модерация, quality/readiness, ops (settings/sync/cache) с RBAC на backend.
- **Public read-models:** стабильные ответы для витрины, лендингов, SEO.

Подробности: [`core/architecture.md`](core/architecture.md).

---

## 3) Доменные крупные темы

| Тема | Документ |
|------|----------|
| Классификация | [`domains/CLASSIFICATION.md`](domains/CLASSIFICATION.md) |
| Лендинги | [`domains/LANDINGS.md`](domains/LANDINGS.md) |
| Checkout / заказы | [`domains/CHECKOUT-ORDERS.md`](domains/CHECKOUT-ORDERS.md) |
| SEO / аудит | [`domains/SEO-AUDIT.md`](domains/SEO-AUDIT.md) |
| Медиа | [`domains/MEDIA-ASSETS.md`](domains/MEDIA-ASSETS.md) |
| Промо / витрина | [`domains/PROMO-STOREFRONT.md`](domains/PROMO-STOREFRONT.md) |

---

## 4) Сущности (один файл на объект)

- [`entities/EVENTS.md`](entities/EVENTS.md)
- [`entities/VENUES.md`](entities/VENUES.md)
- [`entities/CITIES.md`](entities/CITIES.md)
- [`entities/SUPPLIERS.md`](entities/SUPPLIERS.md)
- [`entities/USERS-ORDERS.md`](entities/USERS-ORDERS.md)

---

## 5) Prisma / миграции / очереди / кэш

Политика: [`runbooks/infra.md`](runbooks/infra.md). Принцип: контракты БД и порядок деплоя не ломаем без явной задачи и миграции.

---

## 6) Исторические материалы

См. [`archive/README.md`](archive/README.md).
