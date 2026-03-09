# Деплой и инфраструктура

> Объединённый документ: staging/prod, low-memory, technical debt.

---

## 0. Локальная разработка

Backend требует **PostgreSQL** (порт 5433) и **Redis** (порт 6379). Инфраструктура поднимается через Docker.

### Требования
- **Docker Desktop** — запущен (Windows: стартовое меню → Docker Desktop).

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

### Запуск

```bash
# Prod
docker compose -f docker-compose.prod.yml up -d --build

# Staging
docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build
```

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

## 3. Технические долги (приоритеты)

| Файл | TODO | Приоритет |
|------|------|-----------|
| checkout.service.ts | Package + YooKassa (Trip Planner) | Критический |
| checkout.service.ts | Webhook: IP + подпись, payment.succeeded | Критический |
| Типизация | ~31 файл с `any` — type guards | Низкий |

### Миграции после коммита

```bash
cd packages/backend
npx prisma migrate deploy
npx prisma generate
```

---

## 4. Troubleshooting staging

### `host not found in upstream "daibilet-staging-backend:4000"`
Nginx не может разрешить upstream при старте. Исправлено: `staging.conf` использует `resolver 127.0.0.11` и переменные в `proxy_pass` (резолв в runtime).

### `Cannot find module '@sentry/nestjs'`
Dockerfile.backend использует `pnpm deploy`, чтобы собрать standalone-образ с корректным node_modules. Пересоберите: `docker compose ... up -d --build`.

### `database "daibilet" does not exist`
В `deploy/staging/.env` должен быть `POSTGRES_DB=daibilet_staging`. Решение: `scripts/generate-env-staging.sh` создаёт правильный deploy/staging/.env; при ручной настройке не менять POSTGRES_DB на `daibilet`.

---

## 5. Staging Runbook (Gate 0a)

**VPS:** 213.171.7.16, путь: `/opt/daibilet`

### DNS A-записи (213.171.7.16)
- `staging.daibilet.ru`
- `api-staging.daibilet.ru`
- `admin-staging.daibilet.ru`

### Порядок действий

**1. Bootstrap (первый раз):**
```bash
ssh root@213.171.7.16
# если репо нет: git clone <repo> /opt/daibilet && cd /opt/daibilet
cd /opt/daibilet
bash scripts/setup-vps.sh          # Docker, каталоги
bash scripts/generate-env-staging.sh
nano deploy/staging/.env   # добавить TC_API_TOKEN, TC_WIDGET_TOKEN из локального .env
bash scripts/bootstrap-staging.sh
```

**2. SSL (после DNS):**
```bash
STAGING_ONLY=1 bash scripts/init-letsencrypt.sh
bash scripts/enable-ssl-staging.sh   # подключает второй конфиг staging-ssl.conf
```
Два конфига в контейнере: `staging.conf` (HTTP 80, acme + redirect) и `staging-ssl.conf` (HTTPS 443). Нужны для YooKassa.

**3. Деплой (обновление):**
```bash
cd /opt/daibilet && bash scripts/deploy-staging.sh
bash scripts/migrate-staging.sh
bash scripts/verify-staging.sh
```

**4. Бэкап:**
```bash
bash scripts/backup-staging-db.sh
# cron: 0 3 * * * cd /opt/daibilet && bash scripts/backup-staging-db.sh
```

**5. Копирование БД localhost → staging** (разработка и тесты):
```bash
# Локально (из корня репо): дамп → scp → restore → restart backend
bash scripts/copy-db-to-staging.sh
```
Требуется: Docker с `daibilet-postgres`, SSH-доступ к серверу. Переменные: `STAGING_SERVER`, `LOCAL_POSTGRES_CONTAINER`, `POSTGRES_DB`.

**6. Gate 0 одной командой:**
```bash
bash scripts/close-gate0.sh        # только staging (0a)
bash scripts/close-gate0.sh --prod # prod (0b)
```

### Важно: .env и compose
**Всегда из корня** `/opt/daibilet`. У каждого окружения свой `.env`:
```bash
cd /opt/daibilet

# Staging (добавить -f deploy/staging/docker-compose.ssl.yml после получения SSL)
docker compose -f deploy/staging/docker-compose.yml --env-file deploy/staging/.env -p daibilet-staging up -d --build

# Production
docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod up -d --build
```
Без `--env-file deploy/<env>/.env` — ошибка `POSTGRES_PASSWORD is required`.

### Env-файлы
| Окружение | Файл | Генерация |
|-----------|------|-----------|
| Staging | `deploy/staging/.env` | `scripts/generate-env-staging.sh` |
| Production | `deploy/production/.env` | `scripts/generate-env-production.sh` |

### Обязательные переменные (оба .env)
- `TC_API_TOKEN` — 1:1
- `TC_WIDGET_TOKEN` — 1:1
