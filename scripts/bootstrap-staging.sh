#!/usr/bin/env bash
# Полная установка staging на голый VPS (Docker, git, клонирование, .env, запуск).
# Запускать от root: bash scripts/bootstrap-staging.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Twisterrrrr/daibilet_tickets.git}"
PROJECT_DIR="/opt/daibilet"

echo "==> [1/7] Установка Docker, docker-compose, git..."
apt update
apt install -y docker.io docker-compose-plugin git curl
systemctl enable docker
systemctl start docker

echo "==> [2/7] Создание каталога и клонирование репозитория..."
mkdir -p "${PROJECT_DIR}"
cd "${PROJECT_DIR}"
if [ -d .git ]; then
  git pull origin main || git pull origin master || git pull || true
else
  git clone "${REPO_URL}" .
fi

echo "==> [3/7] Генерация .env (POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET)..."
PW=$(openssl rand -hex 24)
REDIS_PW=$(openssl rand -hex 16)
JWT=$(openssl rand -hex 32)
cp deploy/staging/.env.example .env
sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=${PW}/" .env
sed -i "s/^REDIS_PASSWORD=$/REDIS_PASSWORD=${REDIS_PW}/" .env
sed -i "s/^JWT_SECRET=$/JWT_SECRET=${JWT}/" .env
sed -i "s/^ADMIN_INITIAL_PASSWORD=$/ADMIN_INITIAL_PASSWORD=StagingAdmin2025!/" .env
echo "  Пароли записаны в .env (POSTGRES, REDIS, JWT, ADMIN=StagingAdmin2025!)"

echo "==> [4/7] Подключение HTTP-only nginx (без SSL) для первого запуска..."
if [ -f deploy/nginx/staging-https.conf ]; then
  :  # уже swap делали
else
  cp deploy/nginx/staging.conf deploy/nginx/staging-https.conf
fi
cp deploy/nginx/staging-http.conf deploy/nginx/staging.conf

echo "==> [5/7] Создание каталогов certbot..."
mkdir -p deploy/nginx/certbot/{www,conf}

echo "==> [6/7] Сборка и запуск Docker..."
docker compose -f deploy/staging/docker-compose.yml --env-file .env -p daibilet-staging up -d --build

echo "==> [7/7] Миграции Prisma..."
sleep 15
docker compose -f deploy/staging/docker-compose.yml --env-file .env -p daibilet-staging exec -T backend npx prisma migrate deploy || true

echo ""
echo "============================================"
echo "Staging запущен на HTTP (порт 80)."
echo "Открой: http://<IP_VPS> или http://staging.daibilet.ru (если DNS настроен)"
echo ""
echo "Дальнейшие шаги (SSL):"
echo "  1. Настрой A-записи: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru -> IP VPS"
echo "  2. bash scripts/init-letsencrypt.sh"
echo "  3. cp deploy/nginx/staging-https.conf deploy/nginx/staging.conf"
echo "  4. docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging restart nginx"
echo ""
echo "Логи: bash scripts/logs-staging.sh"
echo "============================================"
