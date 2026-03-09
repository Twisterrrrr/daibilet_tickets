# Первый деплой на VPS

## Шаг 1: Подключись по SSH

```bash
ssh root@ТВОЙ_IPv4
# Введи пароль когда попросит
```

## Шаг 2: Загрузи проект (если репо только локально)

На своей машине (новое окно терминала):

```powershell
ssh root@ТВОЙ_IPv4 "mkdir -p /opt/daibilet"
scp -r F:\coding\SPBBOATS/. root@ТВОЙ_IPv4:/opt/daibilet/
```

## Шаг 3: Запусти скрипт

**Вариант A** — если репо на GitHub:

```bash
curl -sSL https://raw.githubusercontent.com/YOUR_USER/SPBBOATS/main/deploy/scripts/setup-vps.sh -o /tmp/setup.sh
bash /tmp/setup.sh https://github.com/YOUR_USER/SPBBOATS.git
```

**Вариант B** — проект уже в /opt/daibilet (scp):

1. Открой `deploy/scripts/setup-vps.sh` на своём компьютере
2. Скопируй всё содержимое
3. На сервере: `nano /tmp/setup.sh` → вставь → Ctrl+O, Enter, Ctrl+X
4. Запусти: `bash /tmp/setup.sh`

## Шаг 4: Допиши .env (Prod и Staging)

Скрипт создаст пароли. Добавь TC-токены в оба файла:

```bash
nano /opt/daibilet/deploy/prod/.env
# TC_API_TOKEN=...  TC_WIDGET_TOKEN=...

nano /opt/daibilet/deploy/staging/.env
# TC_API_TOKEN=...  TC_WIDGET_TOKEN=...
```

Staging уже настроен: APP_URL, CORS_ORIGIN, POSTGRES_DB — свои. Сохрани: Ctrl+O, Enter, Ctrl+X.

## Шаг 5: Запуск (порядок важен)

```bash
# 1. Prod
cd /opt/daibilet/deploy/prod
docker compose up -d --build

# 2. Staging (включает свой nginx на 80/443, по умолчанию HTTP без сертификатов)
cd /opt/daibilet/deploy/staging
mkdir -p ../nginx/certbot/{www,conf}
docker compose up -d --build
# Или из корня репо: bash deploy/staging/deploy.sh
```

На первом запуске без TLS staging отвечает по HTTP (порт 80). Для HTTPS после certbot подключайте `docker-compose.ssl.yml` и замените в `docker-compose.yml` конфиг nginx на `staging.conf`.

## Шаг 6: Миграции и seed

```bash
# Prod
docker exec -it daibilet-prod-backend npx prisma migrate deploy
docker exec -it daibilet-prod-backend pnpm run db:seed

# Staging (опционально)
docker exec -it daibilet-staging-backend npx prisma migrate deploy
docker exec -it daibilet-staging-backend pnpm run db:seed
```

---

**Пароли админки** — скрипт выведет их в консоль. Или смотри в `.env`:
- Prod: `deploy/prod/.env` → `ADMIN_INITIAL_PASSWORD`
- Staging: `deploy/staging/.env` → `ADMIN_INITIAL_PASSWORD`
