# Operations — Деплой, инфраструктура, Gates

> Объединённый документ: Deploy + DevOps + Gate0-Gate1. Локальная разработка, staging/prod, Gates, Prisma.

---

## 0. Локальная разработка

Backend требует **PostgreSQL** (порт 5433) и **Redis** (порт 6379). Инфраструктура поднимается через Docker.

### Требования
- **Docker Desktop** — запущен (Windows: стартовое меню → Docker Desktop).

### Стандарт запуска CLI
- Для локальных бинарей всегда использовать `npx` или `pnpm exec`, не вызывать инструменты напрямую.
- Предпочитать `pnpm`-скрипты из `package.json`, если они уже есть.
- Примеры: `npx prisma migrate deploy`, `pnpm exec prisma generate`, `npx tsc --noEmit`.

### Шаги

```powershell
# 1. Запустить Postgres и Redis (из корня репо)
pnpm docker:up

# 2. Применить миграции (первый раз или после pull)
pnpm db:migrate

# 3. Запустить backend
pnpm dev:backend
```

В отдельном терминале: `pnpm dev:frontend`, `pnpm dev:admin` и т.д.

### Ошибки
| Ошибка | Причина | Решение |
|--------|---------|---------|
| `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` | Docker не запущен | Запустить Docker Desktop |
| `Can't reach database server at localhost:5433` | Postgres не запущен | `pnpm docker:up` |
| `ECONNREFUSED 127.0.0.1:6379` | Redis не запущен | `pnpm docker:up` |

### Проверка
```powershell
docker ps   # должны быть daibilet-postgres, daibilet-redis
```

---

## 1. Staging и Production на одном VDS

**Структура:** `deploy/README.md` — отдельные prod/staging compose, изолированные сети.

| Окружение | Домены | БД / Redis | Платежи |
|-----------|--------|------------|---------|
| **Production** | daibilet.ru, admin.daibilet.ru | postgres_data, redis_data | YOOKASSA |
| **Staging** | staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru | postgres_data_staging, redis_data_staging | STUB |

### DNS

A-записи: `staging.daibilet.ru`, `api-staging.daibilet.ru`, `admin-staging.daibilet.ru` → IP сервера.

### SSL (Let's Encrypt)

```bash
sudo docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d daibilet.ru -d www.daibilet.ru -d admin.daibilet.ru \
  -d staging.daibilet.ru -d admin-staging.daibilet.ru \
  --email admin@daibilet.ru --agree-tos --non-interactive --expand
```

### Запуск (ручной)

```bash
# Prod
docker compose -f docker-compose.prod.yml up -d --build

# Staging
docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build
```

### CI/CD: staging-deploy (GitHub Actions)

Staging окружение деплоится из ветки `staging` на тот же VPS (`/opt/daibilet`) через GitHub Actions workflow `staging-deploy.yml`.

Высокоуровневый порядок:

1. **Триггер**: push в ветку `staging` или ручной запуск `workflow_dispatch`.
2. **CI** подключается по SSH к VPS (`STAGING_USER@STAGING_HOST`) с использованием приватного ключа из `STAGING_SSH_KEY`.
3. На сервере запускается `bash scripts/remote-deploy-staging.sh`, который:
   - жёстко синхронизирует локальную ветку с `origin/<DEPLOY_BRANCH>`;
   - поднимает postgres/redis, опционально бэкап;
   - поднимает staging‑stack;
   - применяет миграции;
   - делает FULL SYNC;
   - выполняет post‑deploy health‑check.

#### Секреты CI для staging

- `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`

#### Ветки

- CI‑деплой staging по умолчанию из ветки `staging` (`DEPLOY_BRANCH`).

---

## 2. Низкая RAM (4 ГБ)

### PostgreSQL

```yaml
command: postgres -c shared_buffers=512MB -c work_mem=16MB -c maintenance_work_mem=128MB
```

### Redis

```yaml
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Swap на хосте

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Troubleshooting staging

### `host not found in upstream "daibilet-staging-backend:4000"`

Nginx использует `resolver 127.0.0.11` и переменные в `proxy_pass`.

### `Could not resolve host: daibilet-staging-backend`

```bash
cd /opt/daibilet
docker network connect daibilet-net daibilet-staging-nginx
```

### `Cannot find module '@sentry/nestjs'`

Пересоберите: `docker compose ... up -d --build`.

### `database "daibilet" does not exist`

В `deploy/staging/.env` должен быть `POSTGRES_DB=daibilet_staging`.

---

## 4. Staging Runbook (Gate 0a)

**VPS:** 213.171.7.16, путь: `/opt/daibilet`

### Порядок действий

**1. Bootstrap (первый раз):**
```bash
cd /opt/daibilet
bash scripts/setup-vps.sh
bash scripts/generate-env-staging.sh
nano deploy/staging/.env   # TC_API_TOKEN, TC_WIDGET_TOKEN
bash scripts/bootstrap-staging.sh
```

**2. SSL:** `STAGING_ONLY=1 bash scripts/init-letsencrypt.sh` + `bash scripts/enable-ssl-staging.sh`

**3. Деплой:** `bash scripts/deploy-staging.sh`, `bash scripts/migrate-staging.sh`, `bash scripts/verify-staging.sh`

**4. Gate 0:** `bash scripts/close-gate0.sh` (staging) или `bash scripts/close-gate0.sh --prod` (prod)

### Env-файлы

| Окружение | Файл | Генерация |
|-----------|------|-----------|
| Staging | `deploy/staging/.env` | `scripts/generate-env-staging.sh` |
| Production | `deploy/production/.env` | `scripts/generate-env-production.sh` |

---

## 5. Infrastructure Overview (DevOps)

- **Staging / Production** на VPS.
- **Cache:** Redis; namespace flush через POST /admin/settings/ops/cache/flush.
- **Sync:** BullMQ; full/incremental jobs; progress через GET /admin/settings/ops/sync/progress.

### Observability (production)

- **GET /admin/ops/metrics** — счётчики платежей, `rates`, алерты по порогам, статистика Redis-кэша (`hits`/`misses`/`hitRate`), блок `latency` (в т.ч. `byMetric` и отдельно analytics-tabs / catalog-consistency), `system.uptime` и `timestamp`.
- **GET /admin/ops/diagnostics** — лёгкие агрегаты по событиям и пустым подборкам/лендингам (без тяжёлых обходов; `empty*` могут заполняться из кэша consistency после `GET /admin/catalog/consistency`).
- **Env (опционально):** `CATALOG_CONSISTENCY_BUDGET_MS` — по умолчанию 1000 ms на «тяжёлую» фазу selection; `0` отключает таймаут (полный пересчёт). `CACHE_TTL_CATALOG_CONSISTENCY`, `CACHE_TTL_ANALYTICS_TABS` — TTL с клампом в диапазонах 60–120s и 60–180s соответственно.

### Ops Roadmap

Улучшения, **не обязательные для MVP**:

- Admin ops audit: история flush и sync jobs
- Partitioning rollout (см. §6)
- Maintenance jobs: ensure-partitions (cron 1-го числа)

**Когда возвращаться:** Catalog latency растёт, количество сессий растёт, cache hit rate падает.

---

## 6. Database Partitioning

### Цель

RANGE-партиционирование `event_sessions` по `startsAt` (месяц).

### Структура

- `event_sessions` — текущая
- `event_sessions_partitioned` — scaffolding
- `event_sessions_YYYY_MM` — партиции

### Этапы

1. Scaffolding (сделано)
2. Перенос данных
3. Swap
4. Удаление legacy

Ссылки: `archive/old-specs/PartitioningPlan.md`, `archive/old-specs/OpsRoadmap.md`

---

## 7. Prisma / миграции — правила безопасности

- **Никогда не редактировать** уже применённые миграции.
- Структуру БД меняем **только через schema.prisma**.
- **Dev:** `npx prisma migrate dev`
- **Staging/Prod:** только `npx prisma migrate deploy`

### Prisma 7 (backend) — как устроено сейчас

- **Конфиг**: `packages/backend/prisma.config.ts` (вынесены `schema`, `DATABASE_URL`, seed).
- **Schema**: `packages/backend/prisma/schema.prisma`:
  - в `datasource db` **нет** `url` (берётся из `prisma.config.ts`);
  - генератор клиента выводит код в `packages/backend/src/generated/prisma`.
- **Импорты Prisma**: по бэкенду используем `@/prisma-client` (shim), а не `@prisma/client`.
- **PostgreSQL adapter**: PrismaClient создаётся с адаптером `@prisma/adapter-pg` (см. `packages/backend/src/prisma/prisma.service.ts`).

### Команды (backend)

```powershell
cd packages/backend
npx prisma validate
npx prisma generate
npx prisma migrate dev
```

---

## 8. Gate 0 и Gate 1

### Gate 0a — Staging (закрыт)

- Ветка `staging`, auto‑deploy через `.github/workflows/staging-deploy.yml`.
- DNS, SSL, ENV: `deploy/staging/.env`.

### Gate 0b — Production (закрыт)

- Ветка `main`, деплой: `DEPLOY_BRANCH=main BACKUP_BEFORE_DEPLOY=1 bash deploy/production/deploy.sh`.
- SSL: Timeweb Pro сертификат. `PAYMENT_PROVIDER=STUB` — реальные платежи выключены.

### Gate 0.5 — Pre-payment hardening (STUB)

Чеклист: happy-path checkout, edge-cases, идемпотентность fulfilment. **Полный операторский чеклист** (скриншоты, шаги проверки): [archive/Gate0-Gate1.md](archive/Gate0-Gate1.md).

### Gate 1 — YooKassa

- Заполнить `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` (из личного кабинета ЮKassa; для проверок обычно используют **тестовый магазин** и тестовые ключи — запросы всё равно идут на `https://api.yookassa.ru/v3/...`).
- Сменить `PAYMENT_PROVIDER=YOOKASSA` (вместо `STUB`). После правки `.env` **перезапустить backend** (процесс читает env только при старте).
- При подключённой онлайн-кассе API требует **`receipt`** в теле создания платежа: бэкенд формирует чек (email или телефон покупателя из сессии, одна позиция на полную сумму). Опционально: `YOOKASSA_RECEIPT_VAT_CODE` (по умолчанию `1`), при нескольких СНО — `YOOKASSA_RECEIPT_TAX_SYSTEM_CODE`.
- **`APP_URL`** — публичный URL **фронта** (куда ЮKassa вернёт пользователя после оплаты), например `https://staging.daibilet.ru` или `http://localhost:3000`. В коде из него собирается `return_url`: `{APP_URL}/checkout/result?session=<checkoutSessionId>`.
- **Webhook в личном кабинете ЮKassa:** URL вида `https://<ваш-api-хост>/api/v1/checkout/webhook/yookassa` (глобальный префикс Nest — `api/v1`). Для локальной машины нужен туннель (ngrok и т.п.), иначе ЮKassa не достучится.
- **Проверка IP webhook:** при `NODE_ENV !== 'production'` whitelist отключён (удобно для dev/tunnel). В **production** принимаются только IP из диапазонов ЮKassa (`PaymentService.YOOKASSA_IPS`).
- **Очередь:** после webhook задача уходит в BullMQ (`QUEUE_FULFILLMENT`). Должны быть запущены **Redis** и **worker**, иначе оплата в БД может не дойти до финала.

#### Быстрый smoke (рекомендуется первым)

1. В `.env` бэкенда (корень монорепо подхватывается в `main.ts`): `PAYMENT_PROVIDER=YOOKASSA`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `APP_URL` как выше.
2. Фронт: при отдельном origin задать `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (или URL staging API).
3. Открыть **`/gift-certificate`**: сессия создаётся сразу в **`CONFIRMED`**, затем вызывается `POST .../checkout/:sessionId/pay` — должен вернуться **`paymentUrl`** и редирект на форму ЮKassa.
4. Оплатить тестовой картой из [документации ЮKassa](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing) (например `5555 5555 5555 4477`).
5. Убедиться: редирект на `/checkout/result?...`, в логах бэка — обработка webhook, сессия/фулфилмент в нужном статусе.

**Корзина с офферами `REQUEST`:** сессия изначально `PENDING_CONFIRMATION` — до вызова `/pay` нужно **подтвердить заказ из админки** (перевод в `CONFIRMED`). Иначе `createPaymentIntent` вернёт 400.

**Split (transfers):** если у поставщика заполнен `yookassaAccountId`, в создание платежа добавляется `transfers`. Для первого теста проще номинал сертификата или оффер без split.

---

## 9. Связанные runbooks

| Runbook | Назначение |
|---------|------------|
| [Runbook-Production-SSL-Deploy.md](Runbook-Production-SSL-Deploy.md) | Prod SSL/deploy |
| [Runbook-CatalogSync.md](Runbook-CatalogSync.md) | Sync каталога |
| [rollout-tags-runbook.md](rollout-tags-runbook.md) | Tags rollout |

---

## 10. PDF-билеты (Puppeteer MVP)

### Что реализовано

- Генерация PDF-версии ваучера выполняется on-demand через Puppeteer:
  - endpoint: `GET /api/v1/vouchers/:shortCode/pdf`
  - рендер: `packages/backend/src/voucher/ticket-pdf.service.ts`
  - шаблон: `packages/backend/src/voucher/templates/default-ticket.template.html`

### ENV-переменные

- `PUPPETEER_EXECUTABLE_PATH` — путь к Chromium/Chrome (опционально).
- `PUPPETEER_HEADLESS` — `true|false|shell` (по умолчанию `true`).
- `PUPPETEER_NO_SANDBOX` — `true|false` (по умолчанию `true`).
- `TICKET_PDF_DEBUG_ENABLED` — включает admin debug endpoint.

### Локальная проверка

1. Поднять backend.
2. Иметь валидный `shortCode` ваучера.
3. Проверить:

```bash
curl -L "http://localhost:4000/api/v1/vouchers/V-ABC123/pdf" -o voucher.pdf
```

### Debug endpoint (только ADMIN)

- `GET /api/v1/admin/debug/ticket-pdf/:shortCode`
- Требует:
  - JWT админа,
  - `TICKET_PDF_DEBUG_ENABLED=true`.

Пример:

```bash
curl -L -H "Authorization: Bearer <ADMIN_JWT>" \
  "http://localhost:4000/api/v1/admin/debug/ticket-pdf/V-ABC123" \
  -o voucher-debug.pdf
```

### Docker нюансы

- В `Dockerfile.backend` для рантайма установлены пакеты Chromium (`chromium`, `nss`, `freetype`, `harfbuzz`, `ca-certificates`, `ttf-freefont`).
- По умолчанию задан `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`.

---

## Telegram — ответы в чате поддержки из бота (опционально)

Клиент пишет в виджет на сайте; операторы с numeric **user id** из `TELEGRAM_OPERATOR_USER_IDS` получают уведомление в личку с ботом и после `/start conv_<uuid>` могут отвечать текстом — сообщения сохраняются как ответы администратора в том же диалоге (как в админке).

**Переменные окружения:**

| Переменная | Назначение |
|------------|------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет для заголовка `X-Telegram-Bot-Api-Secret-Token` |
| `TELEGRAM_OPERATOR_USER_IDS` | Через запятую: numeric id пользователей Telegram (личный чат с ботом) |
| `TELEGRAM_BOT_USERNAME` | Имя бота без `@` — ссылки в письме и в тексте уведомления |

**Важно:** уведомления `sendMessage` в личку возможны только после того, как оператор **открыл бота и нажал Start** (или отправил любое сообщение боту). Иначе Telegram отвечает 403 — в логах backend будет предупреждение.

Если пушей нет: проверьте имя переменной **`TELEGRAM_OPERATOR_USER_IDS`** (именно мн. число), только цифры id через запятую, без `@username`. Для отладки включите уровень логов с `debug`, чтобы видеть строку «уведомление пропущено», если токен или список пустые.

**Webhook** (публичный HTTPS API):

- URL: `https://<host>/api/v1/webhooks/telegram`
- При установке webhook передать `secret_token` = `TELEGRAM_WEBHOOK_SECRET` (Telegram будет слать его в заголовке).

Пример:

```bash
curl -fsS -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<public-api-host>/api/v1/webhooks/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

**Миграция БД:** таблица `chat_telegram_operator_states` (состояние «активный диалог» на оператора).

После деплоя: `npx prisma migrate deploy` (или эквивалент в вашем CI) и `pnpm exec prisma generate` при необходимости.
