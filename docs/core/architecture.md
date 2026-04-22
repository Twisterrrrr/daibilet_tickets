# Core Architecture

> **Вход в активном контуре:** [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — навигация по системе и доменам. Ниже — полный текст инвариантов ядра.

Этот документ фиксирует **только глобальные инварианты**: границы модулей, source of truth, модели override, read/write paths, derived data, publish/quality gates, import constraints.

## 1. System boundaries

- **Catalog**: события, площадки, города, таксономия; канонические связи и derived‑слои.
- **Admin**: write‑path (операционное управление), аудит изменений, quality/readiness.
- **Ingestion**: импорт/синхронизация (Ticketscloud, Teplohod, будущие провайдеры), ограничения маппинга.
- **Public read-models**: витрина (Next), лендинги, SEO read‑models, кэширование.

## 2. Sources of truth

- **Imported fields vs local overrides**: импорт даёт базовый слой, локальные override’ы накладываются поверх и не должны теряться при синке.
- **Links-first** для канонических связей (например, подкатегории): read‑path использует links + справочник; legacy fallback только для старых данных.
- **Derived section** вычисляется из канонической PRIMARY подкатегории, а не хранится как отдельная «вторая правда».

## 3. Read / write paths

- **Admin write path**: Controller → Service → Repository/Prisma; мутации должны сохранять контракт DTO и быть трассируемыми.
- **Public read path**: минимальные стабильные read‑models, агрегации/проекции — отдельно от write‑модели.
- **Projection принцип**: derived/read‑данные строятся детерминированно и могут пересобираться (repair/backfill).

## 4. Imports

- **Ticketscloud / Teplohod**: внешний ownership на расписание/остатки/идентификаторы; локальные поля не должны «переезжать» в импортные.
- **Mapping constraints**: явные правила соответствия сущностей (event/session/venue) + политика конфликтов.
- **External boundaries**: внешние id и статусы — отдельный слой; не смешивать с внутренним жизненным циклом.

## 5. Publish and quality

- **Publish gate**: публикация зависит от минимального набора данных (контент/медиа/цены/сессии/привязки).
- **SEO issues**: soft‑validation (подсказки/аудит), не ломает write‑path.
- **Quality checks**: правила качества не должны дублировать «вторую модель» — это derived слой.

## 6. Non-goals / postponed areas

- Углубление checkout/финансовой сложности — в `product/finance.md`.
- Детали лендингов/SEO‑специфика — в `product/landings.md` и `product/seo.md`.
- Admin UX/план миграции — в `admin-v3/grand-master-plan.md`.

## 7. ADR (как фиксируем архитектурные решения)

- Формат: **контекст → решение → альтернативы → последствия**.
- Если решение влияет на контракты/границы модулей/ownership данных — оно должно быть отражено в docs как ADR.
- Исторический реестр (reference): `docs/archive/specs/ARCHITECTURE_DECISIONS.md`.

