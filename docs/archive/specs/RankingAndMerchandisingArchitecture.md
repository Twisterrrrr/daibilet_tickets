# Ranking & Merchandising (Phase 7)

Rule-based. No ML.

## Storage
EventOverride: manualBoost Int?, suppressLowQuality Boolean?

## Catalog
CatalogService: ORDER BY + manualBoost; exclude suppressLowQuality.

## Admin
Boost/suppress UI per event. PromoBlockEvent для featured.

## Definition of Done
manualBoost/suppress в schema и catalog, Admin UI.
