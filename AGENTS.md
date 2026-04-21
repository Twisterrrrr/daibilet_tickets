# AGENTS.md — репозиторий Daibilet

## CRITICAL SCOPE SPLIT

There are **TWO** UI systems in this project:

1. **Admin / Catalog UI** → governed by `ui-system` rules (`.cursor/rules/ui-system.mdc`)
2. **Public Landing UI** → governed by `landing-reference` + `lovable-parity` (`docs/`)

These systems **MUST NOT** be mixed.

---

### Landing override

If the task involves:

- landing pages
- SEO pages
- public promotional pages

Then:

- **IGNORE** `ui-system` rules
- **DO NOT** use DataTableShell / FilterBar as primary layout
- **DO NOT** convert the page into catalog-style UI

---

## Дополнительные источники

| Документ | Назначение |
|----------|------------|
| [docs/product/landings.md](docs/product/landings.md) | Лендинги: композиция/инварианты/каноника |
| [docs/archive/legacy-folders/landings/](docs/archive/legacy-folders/landings/) | Исторические reference/parity/anatomy/shell docs |

При конфликте приоритетов см. `docs/product/landings.md` (а исторические правила — в `docs/archive/legacy-folders/landings/`).
