# Staging и Production на одном VDS

> Подготовка к раздельному staging и prod на VDS.

## Архитектура

| Окружение | Домены | БД / Redis | Платежи |
|-----------|--------|------------|---------|
| **Production** | daibilet.ru, admin.daibilet.ru | postgres_data, redis_data | YOOKASSA |
| **Staging** | staging.daibilet.ru, admin-staging.daibilet.ru | postgres_data_staging, redis_data_staging | STUB |

Оба окружения работают на одном сервере. Nginx (в prod) маршрутизирует запросы по домену.

## DNS

Добавь A‑записи:
- `staging.daibilet.ru` → IP сервера
- `admin-staging.daibilet.ru` → IP сервера

## SSL-сертификат

Расширь SAN-сертификат (Let's Encrypt):

```bash
sudo docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    -d daibilet.ru -d www.daibilet.ru \
    -d admin.daibilet.ru \
    -d staging.daibilet.ru -d admin-staging.daibilet.ru \
    --email admin@daibilet.ru \
    --agree-tos \
    --non-interactive \
    --expand
```

## Порядок развёртывания

### 1. Prod (уже развёрнут)

```bash
cd /opt/daibilet

# Создать volume для staging uploads (нужен для nginx, даже если staging ещё не запущен)
docker volume create uploads_staging

docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Staging (дополнительно)

Сеть `daibilet-net` создаётся при первом запуске prod.

```bash
cd /opt/daibilet

# Используется .env, часть переменных переопределяется через .env.staging (см. ниже)
docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build
```

### 3. Миграции и seed (staging)

```bash
docker exec daibilet-staging-backend npx prisma migrate deploy
docker exec daibilet-staging-backend npx prisma db seed
```

### 4. Перезагрузка Nginx (после изменений конфига)

```bash
docker exec daibilet-nginx nginx -s reload
```

## Переменные окружения для Staging

Основной `.env` используется и для staging. Специфичные для staging переменные (опционально — в `.env.staging` или в shell перед `docker compose`):

```bash
# .env.staging (или экспорт перед запуском)
POSTGRES_DB=daibilet_staging
REDIS_PASSWORD_STAGING=<отдельный пароль для Redis staging>
JWT_SECRET_STAGING=<отдельный JWT secret для staging>
APP_URL_STAGING=https://staging.daibilet.ru
CORS_ORIGIN_STAGING=https://staging.daibilet.ru,https://admin-staging.daibilet.ru
```

Если `REDIS_PASSWORD_STAGING` и `JWT_SECRET_STAGING` не заданы, используются `REDIS_PASSWORD` и `JWT_SECRET` из `.env`.

Запуск с переопределением:

```bash
set -a && source .env.staging 2>/dev/null; set +a
docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build
```

## Полезные команды

| Действие | Команда |
|----------|---------|
| Логи staging | `docker compose -f docker-compose.staging.yml -p daibilet-staging logs -f backend` |
| Остановить staging | `docker compose -f docker-compose.staging.yml -p daibilet-staging down` |
| Ребилд staging | `docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build` |
| Миграции staging | `docker exec daibilet-staging-backend npx prisma migrate deploy` |
| Бэкап staging БД | `docker exec daibilet-staging-postgres pg_dump -U daibilet daibilet_staging > backup_staging_$(date +%Y%m%d).sql` |

## deploy-staging.sh

Скрипт `deploy-staging.sh` выполняет развёртывание staging одной командой (после prod).

## Проверка

- Prod: https://daibilet.ru, https://admin.daibilet.ru
- Staging: https://staging.daibilet.ru, https://admin-staging.daibilet.ru
- Staging возвращает заголовок `X-Environment: staging`
- В staging доступен `simulate-paid` (PAYMENT_PROVIDER=STUB)
