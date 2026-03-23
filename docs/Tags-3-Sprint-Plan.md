# Tags: 3-Sprint Execution Plan

Дата: 2026-03-23

## Sprint 1 (P0): Real DB Rollout Finalization

### Scope

- завершить rollout тегов на реальной БД;
- валидировать constraint;
- сохранить доказуемый артефакт.

### Tasks

- выполнить `docs/rollout-tags-runbook.md` end-to-end;
- зафиксировать `docs/rollout-tags-YYYYMMDD.md`;
- сделать smoke-check catalog endpoints.

### Definition of Done

- `tagKind IS NULL = 0`
- `STRUCTURAL + structuralGroup IS NULL = 0`
- `POPULAR + structuralGroup IS NOT NULL = 0`
- `tag_kind_group_check` validated
- startup warning о legacy отсутствует.

### Risks

- отставание схемы БД;
- объём апдейтов на проде.

---

## Sprint 2 (P1): Import Lifecycle Hardening

### Scope

- стабилизировать происхождение тегов и поведение при sync для imported событий.

### Tasks

- добавить source назначения тегов:
  - `MANUAL_ADMIN`
  - `IMPORT_MAPPED`
  - `AUTO_RULE`
- добавить suppression для авто-тегов;
- обеспечить инвариант: ручные теги не теряются при sync;
- покрыть integration/unit тестами sync-поведение.

### Definition of Done

- повторный sync не затирает ручные назначения;
- suppression предотвращает повторное auto-назначение;
- операции идемпотентны и детерминированы.

### Risks

- гонки фоновых sync jobs;
- конфликт с legacy event-tag связями.

---

## Sprint 3 (P2): Final UI Parity Pass (Lovable Contract)

### Scope

- закрыть системный UX-долг по затронутым admin/supplier страницам через формальный checklist.

### Tasks

- подготовить parity checklist по MHTML/Lovable contract:
  - sidebar contract
  - page shell
  - state UX (loading/empty/error/skeleton density)
  - list/detail rhythm
  - hover/selected/focus states
- пройти приоритетные страницы (теги, событие, supplier event detail);
- зафиксировать статус в doc.

### Definition of Done

- у целевого списка страниц статус `Pass`;
- остаточные расхождения оформлены как backlog с приоритетами.

### Risks

- расползание в полный рефакторинг админки;
- визуальные изменения без smoke-regression.

---

## Cross-sprint governance

- no API-break для текущих клиентов;
- no destructive data ops;
- все изменения через minimal-diff;
- после каждого спринта: build + tests + lints + короткий release report.

