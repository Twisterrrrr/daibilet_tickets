# Runbook: Production SSL и Deploy

## Root Cause (почему deploy падал)

1. **nginx ожидает** `/etc/nginx/ssl/main/` и `/etc/nginx/ssl/subdomains/` (fullchain.pem, privkey.pem)
2. **Сертификаты отсутствовали** в этих путях — deploy/production/ssl/ был пуст после перехода на новую структуру
3. **Timeweb Pro cert** мог лежать в Docker volume `daibilet_certbot_conf` (старый compose) или в deploy/nginx/certbot/
4. **Deploy падал** на `docker compose up` — nginx не стартовал из‑за отсутствия cert

---

## Целевая схема

| Домен | Сертификат | Nginx block | Upstream |
|-------|------------|-------------|----------|
| daibilet.ru, www.daibilet.ru | Timeweb Pro (main) | production.conf | frontend:3000, backend:4000 |
| admin.daibilet.ru | Let's Encrypt (subdomains) | production.conf | admin:5173 |
| api.daibilet.ru | Let's Encrypt (subdomains) | production.conf | backend:4000 |
| supplier.daibilet.ru | Let's Encrypt (subdomains) | production.conf | supplier:5174 |

---

## Пути

- **Проект на сервере:** `/opt/daibilet`
- **SSL:** `deploy/production/ssl/main/` (Timeweb), `deploy/production/ssl/subdomains/` (LE)
- **Nginx config:** `deploy/nginx/production.conf`
- **Compose:** `deploy/production/docker-compose.yml`

---

## Первичная настройка SSL (один раз)

```bash
cd /opt/daibilet

# 1. Если main cert ещё нет — положи Timeweb Pro вручную или запусти bootstrap:
#    - Скачай CRT и KEY из панели Timeweb
#    - cp fullchain.pem deploy/production/ssl/main/
#    - cp privkey.pem deploy/production/ssl/main/

# 2. Автоматический bootstrap (извлекает из Docker volume или certbot, получает LE для subdomains):
bash scripts/setup-ssl-production.sh

# 3. Deploy
bash deploy/production/deploy.sh
```

---

## Deploy из Git

**С сервера:**
```bash
cd /opt/daibilet
DEPLOY_BRANCH=main bash deploy/production/deploy.sh
```

**Из CI (GitHub Actions):**
- Actions → Production Deploy → Run workflow
- SSH: `cd /opt/daibilet && DEPLOY_BRANCH=main bash deploy/production/deploy.sh`

Deploy делает:
- git fetch + reset
- миграцию SSL (копирует из volume/certbot в ssl/main, subdomains)
- docker compose up -d --build
- prisma migrate
- health check (daibilet.ru, admin.daibilet.ru, /api/v1/health)

---

## Renewal Let's Encrypt

```bash
cd /opt/daibilet
bash scripts/certbot-renew-production.sh
```

**Cron (ежедневно в 03:00):**
```cron
0 3 * * * cd /opt/daibilet && bash scripts/certbot-renew-production.sh >> /var/log/certbot-renew.log 2>&1
```

**Проверка:**
```bash
docker run --rm -v /opt/daibilet/deploy/production/ssl/letsencrypt:/etc/letsencrypt:ro certbot/certbot renew --dry-run
```

---

## Проверка после исправлений

```bash
# nginx config
docker compose -f deploy/production/docker-compose.yml -p daibilet-prod exec nginx nginx -t

# reload nginx
docker compose -f deploy/production/docker-compose.yml -p daibilet-prod exec nginx nginx -s reload

# HTTP → HTTPS
curl -I http://daibilet.ru/
# ожидаем: 301, Location: https://daibilet.ru/

# HTTPS
curl -sI https://daibilet.ru/ | head -5
curl -sI https://admin.daibilet.ru/ | head -5
curl -sI https://api.daibilet.ru/api/v1/health
curl -sI https://supplier.daibilet.ru/ | head -5
```

---

## Что изменено

| Файл | Изменение |
|------|-----------|
| deploy/production/deploy.sh | Миграция SSL из Docker volume, certbot, letsencrypt; fallback main→subdomains |
| deploy/nginx/production.conf | ssl_protocols, HSTS, комментарии |
| scripts/setup-ssl-production.sh | **Новый:** bootstrap Timeweb + LE subdomains |
| scripts/certbot-renew-production.sh | **Новый:** renewal LE subdomains |
| deploy/production/ssl/.gitignore | +letsencrypt/ |
| docs/Runbook-Production-SSL-Deploy.md | **Новый:** этот runbook |

---

## Резюме для оператора

**Если deploy падает с "nginx не находит сертификат":**
1. `cd /opt/daibilet`
2. `bash scripts/setup-ssl-production.sh` — один раз, bootstrap SSL
3. `bash deploy/production/deploy.sh` — деплой

**Ежедневный deploy:** `DEPLOY_BRANCH=main bash deploy/production/deploy.sh`

**Renewal LE:** cron `0 3 * * *` → `bash scripts/certbot-renew-production.sh`
