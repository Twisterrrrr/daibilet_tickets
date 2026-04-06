#!/usr/bin/env bash
# Деплой staging: обновление кода, миграции, контейнеры, health-check.
# Запуск: на сервере: cd /opt/daibilet && bash deploy/staging/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-staging}"

echo "=== [1/7] Git sync (origin/${DEPLOY_BRANCH}) ==="
git fetch origin "${DEPLOY_BRANCH}"
if [ -f "scripts/setup-ssl-production.sh" ] && ! git ls-files --error-unmatch "scripts/setup-ssl-production.sh" >/dev/null 2>&1; then
  echo "[git] removing untracked scripts/setup-ssl-production.sh (will be restored from repo)"
  rm -f "scripts/setup-ssl-production.sh"
fi
git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
git reset --hard "origin/${DEPLOY_BRANCH}"

echo "=== [2/7] Подготовка каталогов certbot ==="
mkdir -p "$REPO_ROOT/deploy/nginx/certbot/www" "$REPO_ROOT/deploy/nginx/certbot/conf"

ENV_FILE="deploy/staging/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"

COMPOSE_FILES="-f deploy/staging/docker-compose.yml"
if [ -d "$REPO_ROOT/deploy/nginx/certbot/conf/live/staging.daibilet.ru" ]; then
  if [ -f "$REPO_ROOT/deploy/staging/docker-compose.ssl.yml" ]; then
    COMPOSE_FILES="${COMPOSE_FILES} -f deploy/staging/docker-compose.ssl.yml"
    echo "SSL конфиг для staging подключен"
  fi
fi

echo "=== [3/7] Перезапуск staging stack (docker compose up -d --build) ==="
docker compose ${COMPOSE_FILES} --env-file "$ENV_FILE" -p daibilet-staging up -d --build

echo "=== [4/7] Prisma migrations (prisma migrate deploy) ==="
docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging run --rm backend npx prisma migrate deploy

echo "=== [5/7] FULL_SYNC=1 pnpm full:sync (one-off backend) ==="
docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging run --rm backend env FULL_SYNC=1 pnpm full:sync || echo \"FULL_SYNC: ошибка, проверьте логи BullMQ/SyncProcessor\"

echo "=== [6/7] Seeds for staging (optional, RUN_STAGING_SEEDS=1) ==="
if [ "${RUN_STAGING_SEEDS:-0}" = "1" ]; then
  bash deploy/staging/run-all-seeds.sh
else
  echo "Seeds пропущены (RUN_STAGING_SEEDS != 1)"
fi

echo "=== [7/7] Post-deploy health-check (статус контейнеров + HTTP) ==="
docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging ps

if [ -x "scripts/health-check-staging.sh" ]; then
  bash scripts/health-check-staging.sh
elif [ -x "scripts/verify-staging.sh" ]; then
  bash scripts/verify-staging.sh
else
  echo "[WARN] health-check-staging.sh/verify-staging.sh не найдены, выполняем базовый health-check..."
  set +e
  code=$(curl -sfk -o /dev/null -w "%{http_code}" "https://api-staging.daibilet.ru/api/v1/health" 2>/dev/null || echo "000")
  set -e
  echo "  https://api-staging.daibilet.ru/api/v1/health -> ${code}"
  if [ "${code}" != "200" ]; then
    echo "[ERROR] Staging health-check failed"
    exit 1
  fi
fi

echo ""
echo "Staging deploy complete."
