# Teplohod API fixtures

Снимок ответов `api.teplohod.info` для окружений без VPN (Codex, CI, офлайн-разработка).

## Содержимое

| Файл | API endpoint |
|------|----------------|
| `cities.json` | `GET /v1/cities` |
| `events-compact.json` | `GET /v1/events?compact` |
| `manifest.json` | метаданные снимка (дата, счётчики, sha256) |

## Использование в Codex

1. Поднять локальный мост (когда скрипт будет добавлен) или указать `TEP_API_URL` на хост с VPN.
2. В `.env`:

```env
TEP_API_URL=http://127.0.0.1:8787/v1
```

3. Запустить синк:

```bash
curl -X POST http://localhost:4000/api/v1/tep/sync
```

## Обновление снимка

На машине с доступом к Teplohod API:

```bash
curl -sS "https://api.teplohod.info/v1/cities" -o packages/backend/fixtures/teplohod/cities.json
curl -sS "https://api.teplohod.info/v1/events?compact" -o packages/backend/fixtures/teplohod/events-compact.json
```

Затем пересобрать `manifest.json` (см. ветку `fixtures`).
