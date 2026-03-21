# Task 10 — Phase C: Visual editor + preview для content blocks

> **Узкий scope.** Не разрастаться. Сначала зафиксировать границы, затем реализовывать.

Связь: Phase A (Event summary) и Phase B (Venue summary) дали read-model подход. Phase C — редакторский UX для контент-блоков PDP.

---

## 1. Разбиение Phase C

| Подфаза | Область | Scope |
|---------|---------|-------|
| **C1** | Event PDP content blocks | structured form over `contentTemplateData`, preview, fallback raw JSON |
| **C2** | Venue content blocks | `venueTemplateData`, preview, **без** «универсального page builder» |

**Приоритет:** C1 → C2 (последовательно).

---

## 2. Phase C1 — Event content blocks

- **Structured form** над `EventOverride.contentTemplateData` (или Event + Override merge).
- Поля по registry: `routeDescription`, `program`, `menu`, `cast`, `bookingRules`, `visitorTips`, `extraFaq` и т.д.
- **Preview** — рендер блоков как на PDP (или упрощённый).
- **Fallback raw JSON** — collapsible advanced для ручной правки.
- Источник схемы: `packages/shared` — `EventContentTemplateData`, `getEventTemplateSpecs`.

**Не в C1:** drag-and-drop конструктор, schema studio, live-preview всего сайта.

---

## 3. Phase C2 — Venue content blocks

- **Structured form** над `Venue.venueTemplateData`.
- Поля по registry: `collections`, `halls`, `cloakroom`, `seasonality`, `accessibilityNotes` и т.д.
- **Preview** — рендер как на PDP площадки.
- **Без** универсального page builder.
- Источник схемы: `VenueTemplateData`, `getVenueTemplateSpecs`.

---

## 4. Что НЕ делать на старте C

| Исключено | Причина |
|-----------|---------|
| Drag-and-drop конструктор | Раздувание scope |
| Сложная schema studio | Отдельный эпик |
| Live-preview всего сайта | Другая класс задачи |
| Единый mega-editor для всех типов сущностей | Слишком общее |

---

## 5. Связанные документы

- `docs/Task10-Admin-Intelligence-Audit.md`
- `packages/shared/src/content/content-template.types.ts` — EventContentTemplateData, VenueTemplateData
- `packages/shared/src/content/page-template-specs.ts` — getEventTemplateSpecs, getVenueTemplateSpecs

---

## 6. Критерии готовности (чеклисты — заполнять при реализации)

### C1
- [x] Structured form для contentTemplateData на EventEdit (`ContentBlocksPanel` + `getEventTemplateSpecs`)
- [x] Preview блоков
- [x] Fallback raw JSON (вкладка Raw JSON)
- [x] Документация обновлена

### C2
- [x] Structured form для venueTemplateData на VenueEdit (вкладка «Контент PDP»)
- [x] Preview
- [x] Без универсального page builder
