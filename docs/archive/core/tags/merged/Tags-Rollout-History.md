# Tags — rollout history (archive merged)

Назначение: один вход для истории “теги → миграции → очистка legacy → validate constraint → артефакт”.

Важное: актуальные политики/инварианты должны жить в активных docs (не в archive). Этот файл — **история выполнения и runbook’и**.

---

## Состав (источники)

1) План работ: `docs/archive/Tags-3-Sprint-Plan.md`  
2) Артефакт выполнения (что реально запускали и что получилось): `docs/archive/rollout-tags-20260323.md`  
3) Production runbook: `docs/archive/legacy-root/runbooks_old/rollout-tags-runbook.md`

---

## Быстрый ответ: “что было DoD”

Из плана (Sprint 1 / P0) ожидаемые инварианты:

- `tagKind IS NULL = 0`
- `STRUCTURAL + structuralGroup IS NULL = 0`
- `POPULAR + structuralGroup IS NOT NULL = 0`
- constraint `tag_kind_group_check` validated
- warning о legacy отсутствует

История подтверждения: см. `docs/archive/rollout-tags-20260323.md`.

---

## Ссылки на источники

- `docs/archive/Tags-3-Sprint-Plan.md`
- `docs/archive/rollout-tags-20260323.md`
- `docs/archive/legacy-root/runbooks_old/rollout-tags-runbook.md`

