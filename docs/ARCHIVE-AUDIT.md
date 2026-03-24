# Аудит документации docs/ (23.03.2026)

## Резюме

- **Корневых документов (до):** 27
- **После оптимизации:** ~15 активных + архив

---

## Действия

### 1. Объединение в Operations.md

| Было | Действие |
|------|----------|
| Deploy.md | Объединено в Operations.md |
| DevOps.md | Объединено в Operations.md |
| Gate0-Gate1.md | Объединено в Operations.md |

Единый операционный документ: деплой, инфраструктура, Gates, Prisma.

### 2. Перенос в archive/

| Документ | Причина |
|----------|---------|
| PopularDirectionsBlueprint.md | Реализовано (Wave B Phase 6: CollectionMaterializerService, bus-tour, rooftop) |
| Admin-Health-Dashboard-Design.md | Дизайн Phase 5+, разовый |
| BuyerAccountAudit.md | Аудит (завершён), результат в BuyerAccountSpecs |
| SupplierDailyStat-Design.md | Дизайн витрины |
| EDO-Implementation-Plan.md | План реализован |
| Task10-Admin-Intelligence-Audit.md | Task 10 завершён |
| Task10-PhaseB-Venue-Spec.md | Task 10 Phase B завершён |
| Task10-PhaseC-Content-Blocks-Spec.md | Task 10 Phase C завершён |
| DevelopmentScenario.md | Фазы A/B/C выполнены |
| SupplierAccount.md | Спеки виджета; перекрываются finance.md и Architecture |
| Tags-3-Sprint-Plan.md | Спринты завершены |
| Runbook-Staging-HTTPS.md | Специфичный runbook, пересекается с Deploy |

### 3. Оставляем в корне

| Документ | Назначение |
|----------|------------|
| Project.md | Миссия, архитектура |
| Tasktracker.md | Задачи, Gates |
| Diary.md | Наблюдения, решения |
| Reference.md | API, DTO, observability |
| finance.md | Buyer/Supplier/Admin финансы |
| BuyerAccountSpecs.md | ЛК покупателя |
| Architecture.md | Каталог, лендинги, topic definitions |
| Landings-Architecture.md | Архитектура лендингов |
| Collections-Architecture.md | Архитектура подборок |
| Tags-Architecture.md | Теги и SEO-routing |
| UX-Parity-Backlog.md | UI parity |
| RegressionChecklist.md | Чек-лист перед merge |
| Operations.md | Деплой, DevOps, Gates (объединённый) |
| Runbook-Production-SSL-Deploy.md | Prod SSL/deploy |
| Runbook-CatalogSync.md | Sync каталога |
| rollout-tags-runbook.md | Tags rollout |

### 4. Исправления

- Architecture.md: `PageTemplateSpecs.md` → `archive/specs/PageTemplateSpecs.md`

---

## Ссылки в Tasktracker (обновлены)

- `docs/Deploy.md` → `docs/Operations.md`
- `docs/Task10-*` → `docs/archive/` (Task 10 завершён)
- `docs/PopularDirectionsBlueprint.md` → `docs/archive/`
- `docs/BuyerAccountAudit.md` → `docs/archive/`
