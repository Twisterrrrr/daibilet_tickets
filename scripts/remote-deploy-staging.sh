#!/usr/bin/env bash
# CI-friendly staging deploy script.
# Запуск на VPS:
#   DEPLOY_BRANCH=staging STAGING_BACKUP_BEFORE_DEPLOY=1 bash scripts/remote-deploy-staging.sh

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-staging}"
STAGING_BACKUP_BEFORE_DEPLOY="${STAGING_BACKUP_BEFORE_DEPLOY:-1}"

cd "${PROJECT_DIR}"

echo "==> [1/8] Git sync (hard reset to origin/${DEPLOY_BRANCH})..."
git fetch origin "${DEPLOY_BRANCH}"
if [ \( -e "scripts/setup-ssl-production.sh" -o -L "scripts/setup-ssl-production.sh" \) ] && ! git ls-files --error-unmatch "scripts/setup-ssl-production.sh" >/dev/null 2>&1; then
  echo "[git] removing untracked scripts/setup-ssl-production.sh (will be restored from repo)"
  rm -rf "scripts/setup-ssl-production.sh"
fi
git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
git reset --hard "origin/${DEPLOY_BRANCH}"

ENV_FILE="deploy/staging/.env"
[ -f "${ENV_FILE}" ] || ENV_FILE=".env"

COMPOSE_BASE=(docker compose -f deploy/staging/docker-compose.yml --env-file "${ENV_FILE}" -p daibilet-staging)

echo "==> [2/8] Ensure Postgres/Redis are up for backup..."
"${COMPOSE_BASE[@]}" up -d postgres redis

echo "==> [3/8] Optional DB backup (STAGING_BACKUP_BEFORE_DEPLOY=${STAGING_BACKUP_BEFORE_DEPLOY})..."
if [ "${STAGING_BACKUP_BEFORE_DEPLOY}" = "1" ]; then
  if [ -x "scripts/backup-staging-db.sh" ]; then
    bash scripts/backup-staging-db.sh
  else
    echo "[WARN] scripts/backup-staging-db.sh not found or not executable, skipping backup"
  fi
else
  echo "Backup disabled, skipping."
fi

echo "==> [4/8] Building & starting full staging stack (docker compose up -d --build)..."
COMPOSE_FILES="-f deploy/staging/docker-compose.yml"
if [ -d deploy/nginx/certbot/conf/live/staging.daibilet.ru ]; then
  # HTTP+HTTPS конфиг, если SSL уже поднят
  if [ -f deploy/staging/docker-compose.ssl.yml ]; then
    COMPOSE_FILES="${COMPOSE_FILES} -f deploy/staging/docker-compose.ssl.yml"
  fi
fi

docker compose ${COMPOSE_FILES} --env-file "${ENV_FILE}" -p daibilet-staging up -d --build

echo "==> [5/8] Running Prisma migrations (prisma migrate deploy)..."
"${COMPOSE_BASE[@]}" run --rm backend npx prisma migrate deploy

echo "==> [6/8] FULL_SYNC=1 pnpm full:sync via one-off backend container..."
"${COMPOSE_BASE[@]}" run --rm backend env FULL_SYNC=1 pnpm full:sync

echo "==> [7/8] Edge nginx stack (deploy/nginx/docker-compose.yml up -d)..."
if [ -f deploy/nginx/docker-compose.yml ]; then
  (cd deploy/nginx && docker compose up -d)
else
  echo "[WARN] deploy/nginx/docker-compose.yml not found, skipping edge nginx stack"
fi

echo "==> [8/8] Post-deploy health checks..."
if [ -x "scripts/health-check-staging.sh" ]; then
  bash scripts/health-check-staging.sh
elif [ -x "scripts/verify-staging.sh" ]; then
  bash scripts/verify-staging.sh
else
  echo "[WARN] health-check-staging.sh and verify-staging.sh not found or not executable, performing basic health check..."
  set +e
  code=$(curl -sfk -o /dev/null -w "%{http_code}" "https://api-staging.daibilet.ru/api/v1/health" 2>/dev/null || echo "000")
  set -e
  echo "  https://api-staging.daibilet.ru/api/v1/health -> ${code}"
  if [ "${code}" != "200" ]; then
    echo "[ERROR] Basic health check failed"
    exit 1
  fi
fi

echo ""
echo "Staging deploy complete."

