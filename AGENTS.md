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
| [docs/ui-scope.md](docs/ui-scope.md) | Разделение Admin/Catalog vs Public Landing |
| [docs/design-system.md](docs/design-system.md) | Публичные лендинги: простор, иерархия, CTA |
| [docs/lovable-parity.md](docs/lovable-parity.md) | Паритет с эталоном Lovable |
| [docs/landing-reference-pages.md](docs/landing-reference-pages.md) | Набор эталонных маршрутов |
| [docs/daibilet-shell-integration.md](docs/daibilet-shell-integration.md) | Header/footer вокруг лендинга |

При конфликте приоритетов см. `docs/ui-scope.md`.
