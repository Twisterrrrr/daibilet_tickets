# Security Headers (Helmet)

> B1 — Production Hardening Plan

## Текущая конфигурация

Helmet включён с отключённым CSP (`contentSecurityPolicy: false`), чтобы не ломать виджеты teplohod/TC.

Стандартные заголовки активны:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection
- Strict-Transport-Security (в prod при HTTPS)
- и др.

## CSP (если включать)

Если включить Content-Security-Policy, в allowlist должны быть:
- **teplohod.info** — виджеты речных прогулок
- **ticketscloud.com** — виджеты Ticketscloud
- **daibilet.ru** — свой домен

## CORS (B2)

- **CORS_ORIGINS** или **CORS_ORIGIN** — comma-separated список разрешённых origins
- **Dev** (без env): localhost:3000, 3001, 5173
- **Prod**: только из env; fallback на APP_URL если CORS_ORIGINS не задан
- Preflight: methods, allowedHeaders настроены

## Brute-force admin login (B4)

- **BRUTE_FORCE_MAX_ATTEMPTS** (default 5) — после N неудачных попыток блокировка
- **BRUTE_FORCE_COOLDOWN_SEC** (default 600) — длительность блокировки в секундах
- Отслеживание по IP + email (хеш)
- Логирование: `Admin login brute-force: blocked ip=...`
- Ответ при блокировке: «Слишком много попыток входа. Повторите через X мин.»

## HTTP timeouts + AbortController (C2)

- **TC_HTTP_TIMEOUT_MS** (default 60_000) — таймаут HTTP-запросов к Ticketscloud API
- **TEP_HTTP_TIMEOUT_MS** (default 30_000) — таймаут HTTP-запросов к teplohod.info API
- Job timeout: при превышении full sync 90 мин / incremental 30 мин вызывается `AbortController.abort()` → HTTP-запросы TC/TEP прерываются, job переводится в failed
- `http-signal.util`: combineAbortSignals, getHttpTimeoutMs (значение &lt; 1000 трактуется как секунды)

## Rate limiting (B3)

- **THROTTLE_TTL**, **THROTTLE_LIMIT** — глобальный лимит (по умолчанию 60s / 30 req)
- **THROTTLE_SEARCH_***, **THROTTLE_CHECKOUT_***, **THROTTLE_AUTH_***, **THROTTLE_REVIEWS_*** — в `throttle.util` для расширения
- Per-route: search 60/min, checkout session/pay 5–3/min, auth login 5/min, reviews 10/min
- 429 response: `errorCode: 'RATE_LIMIT_EXCEEDED'`
- Webhooks: `@SkipThrottle()` — не ограничиваются

## Команда для установки

```bash
cd packages/backend && pnpm add helmet
```
