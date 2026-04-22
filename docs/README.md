# Docs

Корень `docs/` — не склад. **Активный контур** сведён к ограниченному набору «якорных» файлов; детальные спеки и история — в `core/`, `product/`, `archive/`.

**Единый верхний вход по смыслу продукта:** [`PROJECT-FOUNDATION.md`](PROJECT-FOUNDATION.md). Список канонических слоёв — в нём, раздел **Source of Truth**.

---

## Якорные документы (канон верхнего уровня)

| Файл | Зачем |
|------|--------|
| [`PROJECT-FOUNDATION.md`](PROJECT-FOUNDATION.md) | Продукт, фаза Now/Next/Later, Source of Truth, принципы |
| [`SYSTEM.md`](SYSTEM.md) | Инварианты данных, интеграций, API |
| [`PRODUCT.md`](PRODUCT.md) | Поведение продукта для пользователя и бизнеса |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Системное устройство, границы, навигация по доменам |
| [`ADMIN_V3.md`](ADMIN_V3.md) | Admin V3 как канон UI-контура |
| [`SEO.md`](SEO.md) | Верхний вход SEO |
| [`OPERATIONS.md`](OPERATIONS.md) | Верхний вход эксплуатации |
| [`ROADMAP.md`](ROADMAP.md) | Этапы, ворота, исполнение |

**Дополнительно (не «второй верх», а рабочие слои):** [`DECISIONS.md`](DECISIONS.md), [`Tasktracker.md`](Tasktracker.md), [`Diary.md`](Diary.md).

**Редирект / legacy:** [`DIRECTION.md`](DIRECTION.md) — deprecated, смотреть foundation.

**Сущности (один файл на объект, кратко):** [`entities/`](entities/)  
**Домены-крупняк (ссылки на канон):** [`domains/`](domains/)  
**Отложенное:** [`future/SUPPLIER.md`](future/SUPPLIER.md)

**Полный дамп старого `Project.md` (reference):** [`archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md`](archive/deprecated-active-merged/Project.md.full-backup-2026-04-22.md)

---

## Расширенная справка

- [`admin-v3/grand-master-plan.md`](admin-v3/grand-master-plan.md) — полная фазовая карта Admin V3

## Core

- [`core/architecture.md`](core/architecture.md)
- [`core/classification.md`](core/classification.md)
- [`core/events.md`](core/events.md)
- [`core/ingestion.md`](core/ingestion.md)
- [`core/taxonomy.md`](core/taxonomy.md)
- [`core/checkout.md`](core/checkout.md)

## Product

- [`product/landings.md`](product/landings.md)
- [`product/finance.md`](product/finance.md)
- [`product/seo.md`](product/seo.md)
- [`product/lovable-admin-supplier-prompts.md`](product/lovable-admin-supplier-prompts.md) — пошаговые промпты для генерации Admin/Supplier UI (Lovable) + шаблон «один модуль»; в **оглавлении** строка **+** → [v3 §13 Classification UI](product/lovable-prompts-admin-supplier-v3-production-tight.md#13-classification-ui-for-event-and-venue) (Event/Venue, Admin + Supplier)
- [`product/lovable-prompts-admin-supplier-v2-enriched.md`](product/lovable-prompts-admin-supplier-v2-enriched.md) — **v2 обогащённый** пакет (MASTER, shell, §16–17) + ссылка на модули с DTO
- [`product/lovable-prompts-admin-supplier-v2-modules-6-15.md`](product/lovable-prompts-admin-supplier-v2-modules-6-15.md) — v2: промпты **§6–§15** (Events, Venues, Cities, Suppliers, Orders, Supplier…)
- [`product/lovable-prompts-admin-supplier-v3-production-tight.md`](product/lovable-prompts-admin-supplier-v3-production-tight.md) — **v3 production-tight**: 14 блоков — критичные модули + Settings, Promo, SEO Audit, Support + **§13 Classification UI** (Event/Venue, Admin + Supplier) + **§14 Admin Supplier Integrations**
- [`product/lovable-finance-prompts.md`](product/lovable-finance-prompts.md) — пакет №2: Finance (обзоры, settlement, payout, adjustments, exports)
- [`product/lovable-finance-shared-contracts.md`](product/lovable-finance-shared-contracts.md) — общие enum/DTO для finance-промптов
- [`product/lovable-finance-prompts-orders-full.md`](product/lovable-finance-prompts-orders-full.md) — полные промпты Admin/Supplier Orders (finance-aware)

## Runbooks

- [`runbooks/infra.md`](runbooks/infra.md)
- [`runbooks/catalog-sync.md`](runbooks/catalog-sync.md)
- [`runbooks/foundation-reset-track.md`](runbooks/foundation-reset-track.md)

## Reports

- [`reports/`](reports/)

## Archive

- [`archive/README.md`](archive/README.md) — archive ≠ source of truth
