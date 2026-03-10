# Admin Ops API

> Операционные эндпоинты для админки. Prompt 2 + Admin ops (08.03.2026).

## Catalog Observability (Prompt 2)

**GET /admin/ops/metrics** — расширен полем `cache`:

```json
{
  "cache": { "hits": 1523, "misses": 87, "hitRate": 0.946 },
  "rates": { ... }
}
```

- hits/misses — счётчики getOrSet (in-memory, сброс при рестарте)
- hitRate = hits / (hits + misses)

## Flush Cache by Namespace

**POST /admin/settings/ops/cache/flush?namespace={ns}**

| namespace | Описание |
|-----------|----------|
| full | Вся инвалидация (default) |
| cities | cities:* |
| events | events:* |
| catalog | catalog:* |
| tags | tags:* |
| regions | regions:* |
| landings | landings:* |
| combos | combos:* |
| search | search:* |

UI: Настройки → Управление операциями → select namespace → «Flush Cache».

## Resync with Progress

**POST /admin/settings/ops/sync/full** — ставит задачу в BullMQ:

```json
{ "success": true, "message": "...", "jobId": "singleton_sync_full", "queued": true }
```

**GET /admin/settings/ops/sync/progress?jobId=singleton_sync_full** — статус:

```json
{ "jobId": "...", "state": "active", "timestamp": 123, "processedOn": null }
```

state: waiting | active | completed | failed. Для completed: finishedOn, returnvalue. Для failed: failedReason.

**POST /admin/settings/ops/sync/incremental** — аналогично, jobId singleton_sync_incremental.
