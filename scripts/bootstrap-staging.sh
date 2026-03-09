#!/usr/bin/env bash
# Полная установка staging на VPS. Domains: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru
# Запуск: cd /opt/daibilet && bash scripts/bootstrap-staging.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Twisterrrrr/daibilet_tickets.git}"
PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
TARGET_BRANCH="${TARGET_BRANCH:-staging}"

cd "${PROJECT_DIR}"

ENV_FILE="deploy/staging/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"

echo "==> [1/8] Ensuring Docker..."
command -v docker >/dev/null 2>&1 || { apt-get update && apt-get install -y docker.io docker-compose-plugin; systemctl enable docker; systemctl start docker; }

echo "==> [2/8] Git clone/pull..."
mkdir -p "${PROJECT_DIR}"
cd "${PROJECT_DIR}"
if [ -d .git ]; then
  git fetch origin
  git checkout "${TARGET_BRANCH}" 2>/dev/null || git checkout -b "${TARGET_BRANCH}" origin/"${TARGET_BRANCH}" 2>/dev/null || git pull origin main || git pull origin master || git pull || true
else
  git clone "${REPO_URL}" .
  git checkout "${TARGET_BRANCH}" 2>/dev/null || true
fi

echo "==> [3/8] deploy/staging/.env (create if missing)..."
if [ ! -f deploy/staging/.env ]; then
  bash scripts/generate-env-staging.sh
  echo "  Добавь TC_API_TOKEN и TC_WIDGET_TOKEN из локального .env, затем повторно запусти bootstrap"
  exit 0
fi

echo "==> [4/8] Freeing ports 80/443..."
bash scripts/prepare-ports-staging.sh

echo "==> [5/8] HTTP-only nginx for first boot (до получения SSL)..."
cp deploy/nginx/staging-http.conf deploy/nginx/staging.conf

echo "==> [6/8] Certbot dirs..."
mkdir -p deploy/nginx/certbot/{www,conf}
mkdir -p backups

echo "==> [7/8] Docker build & up..."
docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging up -d --build

echo "==> [8/8] Prisma migrate..."
sleep 20
docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging exec -T backend npx prisma migrate deploy || true

echo ""
echo "============================================"
echo "Staging up on HTTP (port 80)"
echo "  http://213.171.7.16 or http://staging.daibilet.ru (after DNS)"
echo ""
echo "Next:"
echo "  1. DNS A: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru -> 213.171.7.16"
echo "  2. STAGING_ONLY=1 bash scripts/init-letsencrypt.sh"
echo "  3. bash scripts/enable-ssl-staging.sh   # подключает второй конфиг staging-ssl.conf"
echo "  5. bash scripts/backup-staging-db.sh"
echo "============================================"
