# Observability — Логирование и трассировка

> Часть Production Hardening Plan, батч A1+. Документ обновляется по мере внедрения A2, A3.

## Request ID

Каждый HTTP-запрос к API получает уникальный **requestId** для корреляции логов и отладки.

### Где смотреть requestId

| Источник | Описание |
|----------|----------|
| Response header `x-request-id` | В любом ответе API (включая ошибки). Клиент может передать свой `x-request-id` — бэкенд подхватит его. |
| Логи приложения | Все логи запросов и ошибок содержат `[requestId=...]` в строке. |
| req.id (NestJS) | В коде: `req.id` — строка UUID. |

### Откуда берётся

1. Если клиент передал заголовок `x-request-id` — он используется.
2. Иначе генерируется UUID v4.

### Примеры логов

- Входящий запрос: `[requestId=a1b2c3d4-...] GET /api/v1/catalog/events`
- Завершение: `[requestId=a1b2c3d4-...] GET /api/v1/catalog/events 200 45ms`
- Ошибка: `[requestId=a1b2c3d4-...] GET /api/v1/unknown 404 Not Found`

### Компоненты

- RequestIdMiddleware — устанавливает req.id, response header, лог входа
- LoggingInterceptor — лог завершения (status, duration)
- AllExceptionsFilter — лог ошибок с requestId и маскированием PII

## PII Masking

В логах маскируются: email, phone, authorization, cookie, token, apiKey, password, secret.

## Sentry (A2)

- Включается только при `SENTRY_DSN` и `NODE_ENV=production`
- 4xx не репортятся (beforeSend)
- Теги: requestId, route (через SentryContextMiddleware), service

## Ops endpoints (A3)

- `GET /api/v1/admin/ops/health` — pendingStale, failedUnresolved, escalatedOpen, activeIntents, activeSyncJobs
- `GET /api/v1/admin/ops/metrics` — rates (fulfillment_fail_rate, webhook_dedup_rate), thresholds
- Защищены admin guard
