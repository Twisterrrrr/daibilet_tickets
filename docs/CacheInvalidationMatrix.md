# D2 — Матрица инвалидации кэша

> Какие ключи сбрасываются при каких событиях.

## События → сбрасываемые ключи

| Событие | Ключи/паттерны |
|---------|----------------|
| **Override save** (админ изменил title/category/image и т.д.) | `events:detail:{slug}`, `search:*` |
| **Sync** (TC/TEP full/incremental) | `cities:*`, `events:*`, `tags:*`, `regions:*`, `landings:*`, `combos:*`, `search:*` |
| **Admin: update event** (priceFrom, venue, isActive...) | `events:detail:{slug}`, `search:*` |
| **Admin: update city** | `cities:detail:{slug}`, `cities:*`, `regions:*` |
| **Admin: update region** | `regions:*` |
| **Admin: update venue** | `events:detail` по событиям venue (через invalidateEventById) |
| **Pricing config update** | `pricing:config` |
| **Reclassification** | `events:*`, `search:*` (полная инвалидация catalog) |

## Вызывающие сервисы

- **EventOverrideService** — нет вызова (override сохраняется через AdminEventsController, который вызывает `cacheInvalidation.invalidateOverride(eventId)`).
- **AdminEventsController** — PATCH override, PATCH event, PATCH offer → `invalidateOverride`.
- **SyncProcessor** — после sync → `cache.invalidateAfterSync()`.
- **AdminSettingsController** — pricing update → `cache.del(cacheKeys.pricing.config())`, ops flush → `delByPrefix` или `invalidateAfterSync`.
