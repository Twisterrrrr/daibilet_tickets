# Archive top‑30 triage (2026‑04‑21)

Цель: выбрать ~30 самых важных документов из `docs/archive/**`, дать им статус и определить **куда и как** переносим знания в канонические `docs/*` (под стратегию Admin V3 first).

Статусы:
- **Promote** — делаем каноническую сводку в активных docs (archive остаётся как история).
- **Legacy (reference)** — не переносим сейчас; можно ссылаться как на референс, но не как на source of truth.
- **Delete-candidate** — потенциально удаляем/выносим позже (после проверки, что нигде не нужно).

---

| # | Файл (archive) | Домен | Статус | Каноническая замена / куда переносим |
|---|---|---|---|---|
| 1 | `archive/Gate0-Gate1.md` | ops/gates | **Promote** | Уже агрегировано в `docs/runbooks/infra.md` (осталось убрать зависимость от archive при необходимости) |
| 2 | `archive/PR-C0-C7-Final.md` | checkout | **Promote** | Сводка “Checkout invariants” → `docs/core/checkout.md` (новый канон), а PR-файл оставить историей |
| 3 | `archive/ReviewModuleAudit.md` | reviews | **Legacy (reference)** | Модуль реализован; в каноне держим кратко в `docs/SYSTEM.md` / `docs/PRODUCT.md` + ссылки на текущие endpoints |
| 4 | `archive/PopularDirectionsBlueprint.md` | merchandising | **Legacy (reference)** | Реализовано; при возврате — выделить в `docs/product/merchandising.md` (если понадобится) |
| 5 | `archive/specs/SupplierTrustSpec.md` | supplier-trust | **Legacy (reference)** | Supplier deferred; для возврата — вынести краткий конспект в `docs/product/suppliers.md` |
| 6 | `archive/specs/AvailabilityAndSessionsArchitecture.md` | sessions | **Promote** | Конспект “Source-based editability” → `docs/core/events.md` (раздел про sessions editability) |
| 7 | `archive/legacy-root/admin-v3_old/Implementation-Guide.md` | admin-v3 | **Legacy (reference)** | Канон: `docs/admin-v3/grand-master-plan.md` + `docs/DIRECTION.md` |
| 8 | `archive/legacy-root/admin-v3_old/admin-v3-roadmap.md` | admin-v3 | **Delete-candidate** | Устарело; заменено каноном (оставить до конца пересборки, потом удалить) |
| 9 | `archive/legacy-root/product_old/Chat-Support.md` | support | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` (RBAC) + текущие product docs по мере надобности |
| 10 | `archive/legacy-root/product_old/BuyerAccountSpecs.md` | buyer-account | **Legacy (reference)** | Buyer deferred; держать как reference |
| 11 | `archive/legacy-root/product_old/Roadmap-3-Sprints-Catalog-Admin-Supplier.md` | roadmap | **Legacy (reference)** | Канон: `docs/DIRECTION.md` + `docs/Tasktracker.md` |
| 12 | `archive/security/legacy-folders-security/RBAC-Matrix.md` | security | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` (быстрый контракт) |
| 13 | `archive/specs/PageTemplateSpecs.md` | content model | **Legacy (reference)** | Канон: `docs/product/landings.md` и актуальные core docs |
| 14 | `archive/EDO-Implementation-Plan.md` | edo | **Legacy (reference)** | EDO deferred; keep |
| 15 | `archive/DevelopmentScenario.md` | process | **Legacy (reference)** | История; keep |
| 16 | `archive/Admin-Health-Dashboard-Design.md` | observability | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` + текущие метрики |
| 17 | `archive/specs/Prisma-Guide.md` | prisma | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` Prisma section |
| 18 | `archive/legacy-root/runbooks_old/Runbook-Production-SSL-Deploy.md` | deploy | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` + `deploy/README.md` |
| 19 | `archive/legacy-root/runbooks_old/media-upload.md` | media | **Legacy (reference)** | Если будет нужно — promote в `docs/runbooks/media-upload.md` |
| 20 | `archive/specs/PromoBlocksSpec.md` | promo | **Legacy (reference)** | Канон: `docs/admin-v3/grand-master-plan.md` (Promo) |
| 21 | `archive/specs/PricingAndPromotionsArchitecture.md` | pricing/promo | **Legacy (reference)** | Возврат позже (business layer) |
| 22 | `archive/specs/SupplierOrdersArchitecture.md` | supplier-orders | **Legacy (reference)** | Supplier deferred; keep |
| 23 | `archive/specs/SupplierAnalyticsArchitecture.md` | supplier-analytics | **Legacy (reference)** | Supplier deferred; keep |
| 24 | `archive/specs/ListingHealthArchitecture.md` | listing-health | **Legacy (reference)** | Канон: текущий backend + `docs/runbooks/infra.md` наблюдаемость |
| 25 | `archive/Tags-3-Sprint-Plan.md` | taxonomy | **Legacy (reference)** | История; keep |
| 26 | `archive/rollout-tags-20260323.md` | taxonomy | **Legacy (reference)** | История; keep |
| 27 | `archive/Runbook-Staging-HTTPS.md` | staging | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` |
| 28 | `archive/specs/AdminSystem.md` | admin | **Legacy (reference)** | Канон: `docs/admin-v3/grand-master-plan.md` |
| 29 | `archive/specs/ARCHITECTURE_DECISIONS.md` | process | **Promote** | Сводка ADR-правил → `docs/core/architecture.md` (короткий раздел “как принимаем решения”) |
| 30 | `archive/specs/TeamRolesSupportArchitecture.md` | org/rbac | **Legacy (reference)** | Канон: `docs/runbooks/infra.md` RBAC + `docs/DIRECTION.md` |

---

## Следующие действия (по этому triage)

1) **Promote**: создать/обновить канонические сводки:\n+- `docs/core/checkout.md` (из PR‑C0‑C7 Final)\n+- раздел “sessions editability” в `docs/core/events.md` (из AvailabilityAndSessionsArchitecture)\n+- раздел “ADR rules” в `docs/core/architecture.md` (из ARCHITECTURE_DECISIONS)\n+\n+2) **Cleanup links**: активные docs должны ссылаться на эти канонические сводки, а не на архив.\n+3) **Archive remains**: PR-файлы и старые спеки остаются как история.\n+
