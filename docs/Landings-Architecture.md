# Landings Architecture

## Role

Landing is a city-bound marketing presentation over the same selection foundation as collections.

- Collection = selection engine surface
- Landing = conversion/content packaging over selection output

Landings are **not** articles and **not** a replacement for collections.

## Data Model

`LandingPage` includes:

- identity: `id`, `cityId`, `slug`, `title`, `subtitle`
- workflow: `status`, `templateType`, `selectionMode`
- selection basis: `collectionId` (optional), `filterTag`, `additionalFilters`, `rankingJson`
- content packaging: hero/faq/info/reviews/links/legal/meta
- discoverability: `showInCollections`, `isIndexable`

Statuses:

- `DRAFT`
- `ACTIVE`
- `ARCHIVED`

Template types (MVP):

- `GENERIC_CARDS`
- `COMPARISON_TABLE`
- `HYBRID`
- `SEASONAL_EVENT` (reserved extension)

## Subcategory-first (read-path, 2026)

- Публичный отбор событий лендинга: **`buildLandingEventsWhere`** — ветка по тегу (`filterTag` → `tagId`) **OR** ветки по `additionalFilters.subcategories` (slug → `SubcategoryPolicyService.buildEventSubcategoryFilter`).
- Совпадает с материализатором и `GET /admin/catalog/consistency` для активных лендингов.
- Подробности: [Catalog-Classification-Policy.md](Catalog-Classification-Policy.md) §10–§11.

## Shared Selection Principle

Selection remains unified:

- `CollectionSelectionService` is canonical for **collections**.
- **Landings** use `buildLandingEventsWhere` (tag OR subcategories + сеансы/OPEN_DATE); city + `filterTag` + `additionalFilters` из `LandingPage`.
- No duplicated independent selection engines.

## Admin Surfaces

`/admin/landings`:

- list with status/template/index/showInCollections signals
- editor with sections for basis, template, status, SEO, JSON content blocks

## Catalog Contracts

- `GET /catalog/landings/:citySlug/:slug`
- `GET /catalog/collections/featured-landings?city=...`

## showInCollections

If `showInCollections = true` and landing is active:

- it appears in a dedicated featured block on `/podborki`
- it is returned by `featured-landings` endpoint
- it stays separate from regular collections list (different entity and UX role)
