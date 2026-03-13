# Отчёт по документации — 12.03.2026

## Выполненные действия

### Архивация

| Было | Стало |
|------|-------|
| `docs/4.1.txt` | `docs/archive/pr-specs/PR4.1-SEO-Page-Probe.txt` |
| `docs/4.2.txt` | `docs/archive/pr-specs/PR4.2-SEO-Opportunity-Finder.txt` |
| `docs/4.3.txt` | `docs/archive/pr-specs/PR4.3-SEO-Auto-Generator.txt` |
| `docs/ReviewModuleAudit.md` | `docs/archive/ReviewModuleAudit.md` |

**Причина:** PR4.1–4.3 — спецификации SEO-задач (отложены/частично реализованы). ReviewModuleAudit — pre-implementation аудит, Review MVP реализован.

### Обновления

- **Tasktracker:** убрана ссылка на несуществующий `InfraTypizationUXCheckoutPlan.md`, ссылка на ReviewModuleAudit → archive
- **Project:** ссылка на ReviewModuleAudit → archive
- **RoadmapPhases2-9Architecture:** Phase 8 и 9 помечены как выполненные
- **README:** полная карта документации с группами
- **archive/README:** обновлён с указанием содержимого

---

## Текущая структура docs

```
docs/
├── README.md                    # Карта документации
├── DOCS_REPORT.md               # Этот отчёт
├── Project.md
├── Tasktracker.md
├── DevelopmentScenario.md
├── Architecture.md
├── RoadmapPhases2-9.md
├── RoadmapPhases2-9Architecture.md
├── IntegrationsExtensionPoints.md
├── TeamRolesSupportArchitecture.md
├── PricingAndPromotionsArchitecture.md
├── RankingAndMerchandisingArchitecture.md
├── AvailabilityAndSessionsArchitecture.md
├── ListingHealthArchitecture.md
├── SupplierOrdersArchitecture.md
├── SupplierAnalyticsArchitecture.md
├── SupplierArchitecture.md
├── AdminSystem.md
├── ContentModel.md
├── PageTemplateSpecs.md
├── ARCHITECTURE_DECISIONS.md
├── Reference.md
├── SEO.md
├── ReviewModuleSpec.md
├── SupplierTrustSpec.md
├── PromoBlocksSpec.md
├── filters-policy.md
├── Reports.md
├── CapacityLedger.md
├── DevOps.md
├── Deploy.md
├── RegressionChecklist.md
├── Prisma-Guide.md
├── Widget-Checkout-Quick-Guide.md
├── Diary.md
├── image-assets-report.md
└── archive/
    ├── README.md
    ├── pr-specs/           # PR4.1–4.3
    ├── old-specs/
    ├── ReviewModuleAudit.md
    ├── Diary.md
    └── PR-C*.md
```

---

## Рекомендации по дальнейшему движению

### 1. Roadmap Phases 2–9 — текущий статус

| Phase | Статус | Комментарий |
|-------|--------|-------------|
| 2 Orders | ✅ | Supplier orders API, UI |
| 3 Sessions | ✅ | Supplier sessions, calendar |
| 4 Health | ✅ | ListingHealthService |
| 5 Analytics | ✅ | Отчёты, CSV |
| 6 Promo | ✅ | PromoCode, checkout |
| 7 Ranking | ✅ | manualBoost, suppressLowQuality |
| 8 Integrations | ✅ | SyncAdapter, страница Интеграции |
| 9 Team | ✅ | SupplierInvitation, Команда, /invite |

**Phases 2–9 закрыты.**

### 2. Приоритетные следующие шаги

1. **Admin UX (DevelopmentScenario, Этап B)**  
   Привести Checkout, Support, Payouts к единому паттерну PageHeader + SectionCard + DataTable.

2. **RBAC permissions matrix**  
   Задокументировать таблицу прав по ролям (OWNER, MANAGER, CONTENT, ACCOUNTANT).

3. **Support link supplier↔ticket**  
   Связать тикеты с operatorId, дать поставщику доступ к своим тикетам.

4. **SEO (при необходимости)**  
   PR4.1–4.3 в archive — можно реализовать при наличии приоритета.

5. **Технический долг**  
   - Исправить tsc-ошибки в frontend-supplier (SectionCard.actions, diffSessions)  
   - Pre-aggregation для аналитики (supplier_daily_metrics)

### 3. Отложено (6+ мес)

Planner, Unified Checkout, ML-рекомендации, PWA, gRPC-оптимизации, расширенная CI.
