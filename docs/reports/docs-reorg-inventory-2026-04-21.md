# Инвентарь документации и план реорганизации (2026-04-21)

Цель: оставить в корне `docs/` только «золотую десятку» (core), остальное разнести по зонам:

- `docs/landings/` — публичные лендинги/SEO/parity/reference
- `docs/admin-v3/` — Admin V3
- `docs/runbooks/` — runbooks/операционка (кроме тех, что остаются core)
- `docs/reports/` — разовые аудиты/ноуты/выгрузки (включая json)
- `docs/process/` — процессные документы (дневник, правила ведения)
- `docs/foundation/` — трек reset/foundation (если актуален)
- `docs/archive/` — только реально устаревшее и не влияющее на решения

Критическое правило: если документ нужен, чтобы понять «как работает система» — он не `archive/`.

---

## Золотая десятка (оставляем в корне `docs/`)

| Документ | Почему core |
|---------|-------------|
| `Project.md` | карта системы + инварианты |
| `Tasktracker.md` | управление работой/приоритетами |
| `Operations.md` | единый операционный вход (Prisma/деплой/gates) |
| `Catalog-Classification-Policy.md` | publish‑gate/классификация → напрямую влияет на каталог/лендинги/качество |
| `Event-Sessions-Product-Contract.md` | контракт ядра событий/сеансов |
| `finance.md` | деньги и контур заказов/рефандов |
| `SeoAudit-Taxonomy-MasterPlan.md` | рычаг масштаба через качество/таксономию |
| `Landing-Composition-System.md` | production‑модель лендингов, масштабирование |
| `Runbook-CatalogSync.md` | критичный ingestion/import runbook |
| `admin-v3-grand-master-plan.md` | основной admin‑инструмент как система доставки изменений |

> `Diary.md` переносится в `docs/process/Diary.md` (важен, но не должен «захватывать» корень).

---

## Переносы по зонам (move)

### Landings → `docs/landings/`

- `Landings-Architecture.md`
- `design-system.md`
- `ui-scope.md`
- `daibilet-shell-integration.md`
- `lovable-dinner-cruise-landing-parity.md`

Кандидаты на объединение (merge):
- `lovable-parity.md`
- `landing-reference-pages.md`
- `page-anatomy.md`

### Admin V3 → `docs/admin-v3/`

Оставляем отдельно:
- `admin-v3-roadmap.md` (тактика)

Кандидаты на объединение (merge) в `docs/admin-v3/Implementation-Guide.md`:
- `admin-v3-plan.md`
- `admin-v3-routing.md`
- `admin-v3-components.md`
- `admin-v3-ux.md`
- `admin-v3-ux-audit.md`
- `admin-v3-settings-ux.md`
- `admin-v3-system-audit-phase0.md`
- `adminv3-block-ui-backend-prisma-matrix.md`

### Runbooks → `docs/runbooks/`

- `Runbook-Production-SSL-Deploy.md`
- `rollout-tags-runbook.md`
- `RegressionChecklist.md`
- (опционально) `Runbook-CatalogSync.md` — но сейчас он core и остаётся в корне

### Reports → `docs/reports/`

- `legacy-paths-mini-audit-2026-04-15.md`
- `migration-history-note-2026-04-15.md`
- `foundation-dry-run-summary-2026-04-15.md`
- прочие `*audit*`, `*note*`, `*summary*` (включая json)

### Process → `docs/process/`

- `Diary.md` → `docs/process/Diary.md`
- добавить `docs/process/README.md` (правила и как пользоваться дневником)

### Foundation → `docs/foundation/`

- `foundation-reset-track.md`
- `foundation-reset-readiness-checklist.md`
- `foundation-decision-note.md`
- `foundation-reentry-plan.md`
- `foundation-migration-status.md`

---

## Кандидаты на “не core” и разнесение (move, без archive)

- `Reference.md` → вероятнее `docs/runbooks/Reference.md` или `docs/architecture/Reference.md` (зависит от того, насколько он живой источник правды; сейчас это “свалка” PageTemplateSpecs/Cache/Observability).
- `Architecture.md` → либо оставить как “secondary core” (но тогда будет 11 в корне), либо разнести по `docs/architecture/` и оставить корневой `Project.md` как индекс.
- `BuyerAccountSpecs.md`, `RBAC-Matrix.md`, `Security-Test-Matrix.md`, `Logs.md`, `Chat-Support.md`, `Roadmap-3-Sprints-Catalog-Admin-Supplier.md`, `TicketProviderCapability*`, `Wave1-*`, `Tags-Architecture.md`, `Collections-Architecture.md`, `UX-Parity-Backlog.md`, `media-upload.md`, `Venue-Program-UX.md`, `finance-print-samples/` — нужны, но не должны быть в корне при “золотой десятке”.

Решение: разнести в подзоны (например, `docs/product/`, `docs/security/`, `docs/integrations/`, `docs/catalog/`, `docs/support/`). Это будет сделано на 2‑й итерации после первичного сведения корня к 10 файлам.

