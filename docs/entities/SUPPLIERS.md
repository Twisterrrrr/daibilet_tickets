# Entity: Suppliers / Operators

## Domain role

Операционный контур «кто наполняет каталог»: интеграции, sync health, агрегаты по событиям/площадкам. Self-service кабинет — отдельный контур (см. [`../future/SUPPLIER.md`](../future/SUPPLIER.md)).

## Schema / model

- Семантика operator/supplier в коде и БД — см. backend; исторические спеки в [`../archive/specs/SupplierTrustSpec.md`](../archive/specs/SupplierTrustSpec.md) (reference).

## Admin V3

- Read-heavy списки/карточки по мере покрытия; без смешивания с полным финансовым UI (см. [`../PROJECT-FOUNDATION.md`](../PROJECT-FOUNDATION.md)).

## Public usage

- Косвенно через события и офферы.

## Relations

- Events, venues, import metadata.
