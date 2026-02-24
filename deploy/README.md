# Дайбилет — prod + staging на одном VPS

Структура для развёртывания на VPS: изолированные prod и staging, общий nginx на 80/443.

> **Первый раз?** См. `scripts/README.md` — пошаговая инструкция + скрипт настройки.

## Структура на VPS

**Вариант A** — репо в корне, deploy внутри:
```
/opt/daibilet/           # git clone (корень репо)
  Dockerfile.backend
  Dockerfile.frontend
  Dockerfile.admin
  deploy/
    prod/
    staging/
    nginx/
```

**Вариант B** — отдельная папка app:
```
/opt/daibilet/
  app/                  # git clone
  prod/                 # symlink или cp -r deploy/prod .
  staging/
  nginx/
```
Для варианта B в docker-compose заменить `context: ../..` на `context: ../app`.

## Домены

| Домен | Назначение |
|-------|------------|
| daibilet.ru | Публичный сайт (Next.js) |
| admin.daibilet.ru | Админ-панель |
| staging.daibilet.ru | Staging сайт |
| admin-staging.daibilet.ru | Staging админка |

API: `/api/v1/*` проксируется на backend (через daibilet.ru и staging.daibilet.ru).

## Чеклист развёртывания

### 0. Подготовка VPS

```bash
# Docker + Compose
apt update && apt install -y docker.io docker-compose-plugin

# UFW
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

### 1. DNS

A-записи на IP VPS:
- daibilet.ru, www.daibilet.ru
- admin.daibilet.ru
- staging.daibilet.ru
- admin-staging.daibilet.ru

### 2. Клонирование или копирование

```bash
# Вариант A — git (если репо на GitHub)
cd /opt && git clone <repo> daibilet

# Вариант B — scp с локальной машины (содержимое сразу в /opt/daibilet)
# ssh root@IP "mkdir -p /opt/daibilet"
# scp -r F:\coding\SPBBOATS/. root@IP:/opt/daibilet/
```

### 3. Создание .env

```bash
cp /opt/daibilet/deploy/prod/.env.example /opt/daibilet/deploy/prod/.env
cp /opt/daibilet/deploy/staging/.env.example /opt/daibilet/deploy/staging/.env
# Заполнить оба .env разными значениями!
```

### 4. Запуск prod и staging (порядок важен)

```bash
cd /opt/daibilet/deploy/prod
docker compose up -d --build

cd /opt/daibilet/deploy/staging
docker compose up -d --build

mkdir -p /opt/daibilet/deploy/nginx/certbot/{www,conf}
```

### 5. Выпуск TLS (certbot)

```bash
cd /opt/daibilet/deploy/nginx
# Убедиться что порт 80 свободен; временно закомментировать SSL блоки в conf.d при необходимости

docker compose up -d nginx
docker compose run --rm certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d daibilet.ru -d www.daibilet.ru \
  -d admin.daibilet.ru \
  -d staging.daibilet.ru \
  -d admin-staging.daibilet.ru \
  --email your@email.com \
  --agree-tos --no-eff-email

# Раскомментировать SSL блоки, перезапустить nginx
docker compose restart nginx
```

### 6. Запуск nginx

```bash
cd /opt/daibilet/deploy/nginx
docker compose up -d
```

### 7. Миграции

```bash
docker exec -it daibilet-prod-backend npx prisma migrate deploy
docker exec -it daibilet-stg-backend npx prisma migrate deploy
```

### 8. Seed (при необходимости)

```bash
docker exec -it daibilet-prod-backend pnpm run db:seed
docker exec -it daibilet-prod-backend pnpm run db:seed:qf
docker exec -it daibilet-prod-backend pnpm run db:seed:seo
```

### 9. YooKassa

- **Staging**: sandbox ключи, webhook `https://staging.daibilet.ru/api/v1/checkout/webhook/yookassa`
- **Prod**: боевые ключи, webhook `https://daibilet.ru/api/v1/checkout/webhook/yookassa`

## Порядок запуска

1. `cd /opt/daibilet/deploy/prod && docker compose up -d --build`
2. `cd /opt/daibilet/deploy/staging && docker compose up -d --build`
3. `mkdir -p /opt/daibilet/deploy/nginx/certbot/{www,conf}`
4. `cd /opt/daibilet/deploy/nginx && docker compose up -d`

## Изоляция env

В `.env` prod и staging обязательно разные:
- `DATABASE_URL` (разные БД)
- `REDIS_URL` (разные инстансы)
- `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`
- `YOOKASSA_*` (staging = sandbox, prod = боевые)
- `APP_URL`, `CORS_ORIGIN`
