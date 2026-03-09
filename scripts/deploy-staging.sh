#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${PROJECT_DIR}"

# Проверка сети (Docker DNS)
echo "==> Проверка сети..."
if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null && ! ping -c 1 -W 3 google.com &>/dev/null; then
  echo "ВНИМАНИЕ: Сеть недоступна. Если контейнеры не резолвят DNS, добавьте в /etc/docker/daemon.json:"
  echo '  "dns": ["8.8.8.8", "1.1.1.1"]'
  echo "Затем: systemctl restart docker"
fi

# VPS: deploy/staging/.env; локально: .env в корне
ENV_FILE="deploy/staging/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"

echo "==> Освобождаем порты 80/443..."
bash scripts/prepare-ports-staging.sh

echo "==> Git pull (staging)..."
git fetch origin
git checkout staging 2>/dev/null || true
git pull origin staging || git pull || true

COMPOSE_FILES="-f deploy/staging/docker-compose.yml"
if [ -d deploy/nginx/certbot/conf/live/staging.daibilet.ru ]; then
  COMPOSE_FILES="${COMPOSE_FILES} -f deploy/staging/docker-compose.ssl.yml"
fi
echo "==> Building and starting staging stack..."
docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" -p daibilet-staging up -d --build

echo ""
echo "Staging up. Next: bash scripts/migrate-staging.sh && bash scripts/verify-staging.sh"

