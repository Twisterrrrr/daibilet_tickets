# Runbook — Staging: HTTPS (Let's Encrypt + nginx)

> Цель: включить HTTPS для staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru с помощью Certbot и конфигов staging.conf + staging-ssl.conf.

## Предусловия

- Staging-стек уже поднят по HTTP (порт 80 открыт, сайт открывается по `http://staging.daibilet.ru` или по IP).
- DNS: A-записи для `staging.daibilet.ru`, `api-staging.daibilet.ru`, `admin-staging.daibilet.ru` указывают на IP сервера.
- На сервере есть каталог репозитория (например `/opt/daibilet`), откуда запускается `docker compose` для staging.

## 1. Проверить каталоги для Certbot

Nginx в staging уже монтирует тома для сертификатов. Убедиться, что на хосте есть директории (они создаются при первом запуске compose, но для certbot webroot нужна пустая или с правами на запись):

```bash
cd /opt/daibilet
mkdir -p deploy/nginx/certbot/www deploy/nginx/certbot/conf
chmod -R 755 deploy/nginx/certbot
```

Текущий compose монтирует:
- `deploy/nginx/certbot/conf` → `/etc/letsencrypt` в nginx (read-only)
- `deploy/nginx/certbot/www` → `/var/www/certbot` в nginx (webroot для ACME challenge)

## 2. Получить сертификат (Certbot, webroot)

Пока работает **HTTP**-конфиг (`staging-http.conf`), nginx отдаёт `/.well-known/acme-challenge/` из `/var/www/certbot`. Запустить certbot один раз (подставить свой email):

```bash
cd /opt/daibilet

docker run --rm \
  -v "$(pwd)/deploy/nginx/certbot/www:/var/www/certbot" \
  -v "$(pwd)/deploy/nginx/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d staging.daibilet.ru \
  -d api-staging.daibilet.ru \
  -d admin-staging.daibilet.ru \
  --email admin@daibilet.ru \
  --agree-tos \
  --non-interactive
```

После успеха сертификаты будут в:
- `deploy/nginx/certbot/conf/live/staging.daibilet.ru/fullchain.pem`
- `deploy/nginx/certbot/conf/live/staging.daibilet.ru/privkey.pem`

Конфиг `staging-ssl.conf` ожидает путь `/etc/letsencrypt/live/staging.daibilet.ru/` (это уже есть в монтировании `certbot/conf` → `/etc/letsencrypt`).

## 3. Включить HTTPS в nginx (override)

Перезапустить staging с override, который подключает `staging.conf` (HTTP → редирект на HTTPS + ACME) и `staging-ssl.conf` (HTTPS):

```bash
cd /opt/daibilet

docker compose -f deploy/staging/docker-compose.yml \
  --env-file deploy/staging/.env \
  -f deploy/staging/docker-compose.ssl.yml \
  -p daibilet-staging up -d
```

Перезапустится только сервис `nginx` (остальные контейнеры без изменений). Проверить:

```bash
curl -sI https://staging.daibilet.ru/ | head -5
```

Ожидается `HTTP/2 200` (или 301/302 при редиректе с главной).

## 4. Обновление сертификата (renewal)

Let's Encrypt выдаёт сертификаты на 90 дней. Варианты:

**Вариант A — разовый запуск certbot renew (cron):**

```bash
docker run --rm \
  -v "/opt/daibilet/deploy/nginx/certbot/www:/var/www/certbot" \
  -v "/opt/daibilet/deploy/nginx/certbot/conf:/etc/letsencrypt" \
  certbot/certbot renew
```

После успешного renew перезагрузить nginx, чтобы подхватить новые сертификаты:

```bash
docker exec daibilet-staging-nginx nginx -s reload
```

**Вариант B — общий контейнер Certbot (deploy/nginx/docker-compose.yml):**  
Если на том же сервере используется edge-nginx с certbot (см. `deploy/nginx/docker-compose.yml`), там уже есть контейнер с циклом `certbot renew` каждые 12 часов. Для staging-сертификата нужно либо добавить домены в тот же cert, либо запускать отдельный certbot для staging (как в варианте A) и при необходимости один раз в день делать `nginx -s reload` в контейнере `daibilet-staging-nginx`.

## 5. Откат на HTTP (если нужно)

Вернуть только HTTP без редиректа на HTTPS:

```bash
cd /opt/daibilet

docker compose -f deploy/staging/docker-compose.yml \
  --env-file deploy/staging/.env \
  -p daibilet-staging up -d
```

(без `-f deploy/staging/docker-compose.ssl.yml`)

## Файлы

| Файл | Назначение |
|------|------------|
| `deploy/nginx/staging-http.conf` | HTTP (80), прокси на frontend/backend/admin, webroot для ACME. Используется по умолчанию. |
| `deploy/nginx/staging.conf` | HTTP (80): только `/.well-known` и редирект всего остального на HTTPS. |
| `deploy/nginx/staging-ssl.conf` | HTTPS (443) для staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru. |
| `deploy/staging/docker-compose.ssl.yml` | Override: монтирует staging.conf + staging-ssl.conf вместо staging-http.conf. |
