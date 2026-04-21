# Catalog sections (5) + subcategories — backend implementation notes

## Terminology (fixed)

- **Категория (section)** = derived top-level group (5):
  - `events` — Мероприятия
  - `excursions` — Экскурсии
  - `museums` — Музеи и арт
  - `activities` — Активности
  - `entertainment` — Развлечения

- **Подкатегория** = canonical subcategory (dictionary row), attached to Event via M:N links.

- **Rule**: section is **never stored on Event**, only derived from chosen subcategories.

## Current state (audit)

Already present in codebase (should be reused):
- Admin endpoints for subcategories: `packages/backend/src/admin/admin-subcategories.controller.ts`
- Event↔Subcategory assignment: `packages/backend/src/subcategories/subcategory-assignment.service.ts`
- Existing links table usage: `event_subcategory_links` referenced in services/controllers (see `admin-events.controller.ts`)
- Publish/quality: `packages/backend/src/catalog/publish-gate.service.ts`, `packages/backend/src/catalog/event-quality.service.ts`
- Canonical seed for subcategories (whitelist + SEO policy): `packages/backend/prisma/seeds/subcategories-canonical.seed.ts`

## Implementation goals

Backend must:
1) return derived sections from event subcategories in admin list/detail DTO
2) filter admin events by `section` and by `subcategory`
3) enforce 1..3 subcategories for publish (publish gate + quality issues)
4) support editing event classification via admin endpoint (atomic update of links)
5) keep legacy technical EventCategory only as fallback for import when mapping fails

