# Teplohod API fixtures

Снимок ответов `api.teplohod.info` для окружений без VPN (Codex, CI, офлайн-разработка).

## Содержимое

| Файл | API endpoint |
|------|----------------|
| `cities.json` | `GET /v1/cities` |
| `events-compact.json` | `GET /v1/events?compact` |
| `manifest.json` | метаданные снимка (дата, счётчики, sha256) |

## Использование в Codex (без VPN)

### 1. Получить fixtures

```bash
git fetch origin
git checkout fixtures
# или только папку:
# git checkout fixtures -- packages/backend/fixtures/teplohod/
```

### 2. Поднять локальный мост

```bash
cd packages/backend
pnpm run tep:fixture-bridge
```

Сервер слушает `http://127.0.0.1:8787/v1` и отдаёт:
- `GET /v1/cities`
- `GET /v1/events` / `?compact` / `?city_id=...`
- `GET /v1/events/:id` (нужно для гидратации расписания в `tep-sync`)

### 3. Настроить backend

В `.env`:

```env
TEP_API_URL=http://127.0.0.1:8787/v1
```

### 4. Запустить синк

В отдельном терминале — backend, затем:

```bash
curl -X POST http://localhost:4000/api/v1/tep/sync
```

Или:

```bash
cd packages/backend && pnpm run sync:tep
```

## Обновление снимка (машина с VPN)

```bash
cd packages/backend
pnpm run tep:export-fixtures
```

Или вручную:

```bash
curl -sS "https://api.teplohod.info/v1/cities" -o packages/backend/fixtures/teplohod/cities.json
curl -sS "https://api.teplohod.info/v1/events?compact" -o packages/backend/fixtures/teplohod/events-compact.json
pnpm run tep:export-fixtures   # пересоберёт manifest.json
```

Затем закоммитить в ветку `fixtures`.

## ENV моста

| Переменная | По умолчанию |
|------------|----------------|
| `TEP_BRIDGE_PORT` | `8787` |
| `TEP_FIXTURES_DIR` | `./fixtures/teplohod` |
