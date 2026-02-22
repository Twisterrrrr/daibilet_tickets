# Pre-deploy Checklist — до первого production-запуска

> **Цель:** убедиться, что env полный, security включён, smoke-план есть. Перед запуском `deploy.sh` — пройти этот чеклист.

---

## 1) Production env checklist

**Источник истины:** `.env.example` — все переменные описаны там. `docker-compose.prod.yml` и `deploy.sh` опираются на него.

### Обязательные переменные (deploy.sh и compose проверяют)

| Переменная | Проверка | Примечание |
|------------|----------|------------|
| `POSTGRES_PASSWORD` | `:?` в compose | deploy.sh генерирует при первом запуске |
| `REDIS_PASSWORD` | deploy.sh генерирует | — |
| `JWT_SECRET` | `:?` в compose | deploy.sh генерирует при первом запуске |
| `ADMIN_INITIAL_PASSWORD` | `:?` в compose | deploy.sh генерирует |
| `TC_API_TOKEN` | deploy.sh проверяет перед compose | Вручную заполнить из Ticketscloud |
| `TC_WIDGET_TOKEN` | deploy.sh проверяет перед compose | Вручную заполнить из Ticketscloud |

### Рекомендуемые для prod

- `NODE_ENV=production` — deploy.sh устанавливает
- `APP_URL=https://daibilet.ru`
- `CORS_ORIGIN` — deploy.sh подставляет `https://daibilet.ru,https://admin.daibilet.ru`

### Перед deploy

- [ ] Актуализировать `.env.example` — любые новые переменные должны быть там
- [ ] Backend стартует только при наличии критичных env: `JWT_SECRET` (config.getOrThrow), `POSTGRES_PASSWORD` (compose :?), `ADMIN_INITIAL_PASSWORD` (compose :?)
- [ ] После первого `deploy.sh`: заполнить `TC_API_TOKEN`, `TC_WIDGET_TOKEN` → перезапустить скрипт

---

## 2) Security baseline (B1–B4)

Проверить, что включено в prod. Реализовано в коде (main.ts, app.module, nginx) — не зависит от env.

| Батч | Что | Статус | Как проверить |
|------|-----|--------|---------------|
| B1 | Helmet + security headers | ✅ main.ts | Страницы грузятся, виджеты TC/teplohod работают |
| B2 | CORS policy | ✅ cors.util, CORS_ORIGIN | Фронт/админка загружаются, preflight OK |
| B3 | Rate limiting | ✅ ThrottlerModule, nginx | 429 при перегрузке публичных API |
| B4 | Brute-force (admin login) | ✅ LoginBruteForceService | Блокировка после N попыток, лог `blocked ip=...` |

### До деплоя

- [ ] Убедиться, что `nginx/default.conf` используется в prod (volume в docker-compose.prod.yml)
- [ ] CSP выключен (`contentSecurityPolicy: false`) — виджеты teplohod/TC не ломаются
- [ ] CORS в prod: только `daibilet.ru` и `admin.daibilet.ru` (из CORS_ORIGIN)

---

## 3) Healthcheck и smoke-проверки

### Health endpoints

| URL | Назначение |
|-----|------------|
| `GET /api/v1/health` | Публичный health (PostgreSQL + Redis) |
| `GET /admin/ops/health` | Admin-only: pending stale, failed jobs, active sync |

`deploy.sh` ждёт ответа от `/api/v1/health` перед миграциями.

### Smoke-план (после деплоя)

- [ ] **Публичный сайт:** https://daibilet.ru — главная, каталог, страница города
- [ ] **Админка:** https://admin.daibilet.ru — логин с credentials из вывода deploy.sh
- [ ] **API Health:** https://daibilet.ru/api/v1/health → `{ status: 'ok', db: true }`
- [ ] **Виджеты:** страница с событием TC/teplohod — виджет загружается
- [ ] **x-request-id:** запрос к API → заголовок `x-request-id` в ответе

Не откладывать smoke — выполнить в день деплоя.

---

## 4) Логи в prod: requestId + PII masking

**Реализовано (A1):**

- `RequestIdMiddleware` — UUID, прокидывает в `req.id`, header `x-request-id`
- `LoggingInterceptor` — логирует `[requestId=...]` для каждого запроса
- `AllExceptionsFilter` — логирует ошибки с requestId, маскирует PII через `pii-mask.util`
- Маскирование: email, phone, authorization, cookie, token, apiKey

### До деплоя

- [ ] Убедиться, что middleware/interceptor включены в prod (AppModule — всегда, нет env-toggle)
- [ ] При первом инциденте: искать по `[requestId=...]` в логах backend

См. `docs/Observability.md`.

---

## 5) Ссылки

- `.env.example` — полный список переменных
- `docs/ProductionHardeningPlan.md` — батчи A–F
- `docs/SecurityHeaders.md` — Helmet, CORS, rate limit
- `docs/Observability.md` — requestId, логирование, PII
