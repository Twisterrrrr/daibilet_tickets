# Snapshot внешнего продукта (для UI-клона)

Цель: снять “эталон” с внешней админки, чтобы дальше воспроизвести UI/UX и поведение **максимально близко** (screen-by-screen parity).

Скрипт: `scripts/snapshot-product.mjs`

## 0) Безопасность

- **Не отправляйте пароль в чат.** Скрипт читает креды из env локально.
- Если вы уже отправляли креды — **считайте их скомпрометированными**: смените пароль / создайте временного read-only пользователя.

## 1) Установка Playwright (один раз)

Вариант A (одноразово, без добавления в repo):

```bash
pnpm dlx playwright@latest install --with-deps
```

Вариант B (как devDependency в repo):

```bash
pnpm add -D playwright@latest
pnpm exec playwright install --with-deps
```

## 2) Запуск (PowerShell)

```powershell
$env:SNAP_BASE_URL="https://cp.triptickets.tech"
$env:SNAP_EMAIL="you@example.com"
$env:SNAP_PASSWORD="***"
node scripts/snapshot-product.mjs
```

Артефакты появятся в `artifacts/product-snapshots/...`:

- `routes.json` — discovered routes + метаданные страниц
- `network.har` — сетевой трейс (для моков/контрактов)
- `screenshots/` — скриншоты страниц
- `html/` — HTML снапшоты (для верстки/селекторов)
- `pages/` — JSON метаданные (status/title/finalUrl)

## 3) Настройка, если логин не распознался

Иногда форма логина нестандартная. Можно явно указать URL и селекторы:

```powershell
$env:SNAP_LOGIN_URL="https://cp.triptickets.tech/login"
$env:SNAP_EMAIL_SELECTOR='input[name="email"]'
$env:SNAP_PASSWORD_SELECTOR='input[name="password"]'
$env:SNAP_SUBMIT_SELECTOR='button[type="submit"]'
node scripts/snapshot-product.mjs
```

## 4) Ограничения

- По умолчанию скрипт обходит до 60 страниц. Можно увеличить:

```powershell
$env:SNAP_MAX_PAGES="200"
node scripts/snapshot-product.mjs
```

- Query-string по умолчанию игнорируется (чтобы не раздувать число URL). Если нужно сохранять query:

```powershell
$env:SNAP_INCLUDE_QUERY="1"
node scripts/snapshot-product.mjs
```

