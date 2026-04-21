# Task10 — Admin Intelligence (archive merged)

Назначение: один вход для исторических документов “Task 10” (Event/Venue admin intelligence + content blocks UX).

Примечание: многое из Task10 было реализовано в legacy admin. Для текущего курса (Admin V3 first) этот материал — **reference**, чтобы не потерять правила и DTO‑идеи.

---

## Состав (источники)

1) Аудит и план по репозиторию: `docs/archive/Task10-Admin-Intelligence-Audit.md`  
2) Phase B (Venue summary slice): `docs/archive/Task10-PhaseB-Venue-Spec.md`  
3) Phase C (visual editor + preview): `docs/archive/Task10-PhaseC-Content-Blocks-Spec.md`

---

## Что здесь “ценно” (сигналы)

- **Принцип:** никакой доменной логики на фронте → только backend read model / DTO.
- **Фазирование:** Phase A (Event summary) → Phase B (Venue summary) → Phase C (content blocks editor).
- **Performance guardrails:** лимиты на “глубокий пересчёт readiness” (только top‑K) + `dataQuality`/`truncated`.

---

## Ссылки на источники

- `docs/archive/Task10-Admin-Intelligence-Audit.md`
- `docs/archive/Task10-PhaseB-Venue-Spec.md`
- `docs/archive/Task10-PhaseC-Content-Blocks-Spec.md`

