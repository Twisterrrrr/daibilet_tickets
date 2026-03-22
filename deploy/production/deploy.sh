#!/usr/bin/env bash
# Деплой production: обновление кода, миграции, контейнеры, health-check.
# Запуск на VPS: cd /opt/daibilet && bash deploy/production/deploy.sh
# В CI: DEPLOY_BRANCH=main bash deploy/production/deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-1}"

echo "=== [1/6] Git sync (origin/${DEPLOY_BRANCH}) ==="
git fetch origin "${DEPLOY_BRANCH}"
git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
git reset --hard "origin/${DEPLOY_BRANCH}"

ENV_FILE="deploy/production/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] deploy/production/.env не найден. Сгенерируй его через scripts/generate-env-production.sh и заполни секреты."
  exit 1
fi

COMPOSE_BASE=(docker compose -f deploy/production/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-prod)

echo "=== [1b/6] Ensure ssl/acme dirs exist ==="
mkdir -p "$REPO_ROOT/deploy/production/ssl" "$REPO_ROOT/deploy/production/acme"

echo "=== [2/6] Ensure Postgres/Redis are up ==="
"${COMPOSE_BASE[@]}" up -d postgres redis

echo "=== [3/6] Optional DB backup (BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY}) ==="
if [ "${BACKUP_BEFORE_DEPLOY}" = "1" ]; then
  if [ -x "scripts/backup-production-db.sh" ]; then
    bash scripts/backup-production-db.sh
  else
    echo "[WARN] scripts/backup-production-db.sh not found or not executable, skipping backup"
  fi
else
  echo "Backup disabled, skipping."
fi

echo "=== [4/6] Build & start production stack (up -d --build) ==="
"${COMPOSE_BASE[@]}" up -d --build

echo "=== [5/6] Prisma migrations (prisma migrate deploy) ==="
"${COMPOSE_BASE[@]}" run --rm backend npx prisma migrate deploy

echo "=== [5b/7] Invalidate catalog cache (to apply visibility changes) ==="
"${COMPOSE_BASE[@]}" run --rm backend node -e "
const R=require('ioredis');
const r=new R(process.env.REDIS_URL||'redis://localhost:6379');
const prefixes=['cities:','events:','catalog:','tags:','regions:','landings:','combos:','search:'];
(async()=>{
  let n=0;
  for(const p of prefixes){
    const s=r.scanStream({match:p+'*',count:100});
    for await(const k of s){if(k.length){await r.del(...k);n+=k.length;}}
  }
  console.log('Invalidated',n,'cache keys');
  await r.quit();
})();
" || echo '[WARN] Cache invalidation skipped'

echo "=== [6/7] Production health-check (containers + HTTP) ==="
"${COMPOSE_BASE[@]}" ps

# Дать контейнерам время подняться после миграций
echo "Waiting 15s for services to become ready..."
sleep 15

failed=0

check_http() {
  local url="$1"
  local expect_api="$2" # "api" or "ui"

  code=$(curl -sfk -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || echo "000")
  echo "  ${url} -> ${code}"

  if [ "${expect_api}" = "api" ]; then
    if [ "${code}" != "200" ]; then
      echo "[ERROR] API health endpoint ${url} returned ${code}, expected 200"
      failed=1
    fi
  else
    case "${code}" in
      2*|3*) ;;
      *)
        echo "[ERROR] UI endpoint ${url} returned ${code}, expected 2xx/3xx"
        failed=1
        ;;
    esac
  fi
}

echo "=== HTTP checks ==="
check_http "https://daibilet.ru" "ui"
check_http "https://admin.daibilet.ru" "ui"
# API под /api/ на daibilet.ru (production.conf не использует api.daibilet.ru)
check_http "https://daibilet.ru/api/v1/health" "api"

if [ "${failed}" -ne 0 ]; then
  echo "[deploy-production] Health check FAILED"
  exit 1
fi

echo ""
echo "Production deploy complete."

