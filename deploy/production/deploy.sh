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
# Если в рабочем дереве есть файл, который в текущем HEAD не отслеживается,
# git checkout может упасть с "untracked working tree files would be overwritten".
# На VPS это чаще всего артефакт ручных правок/старых запусков, а в репо файл уже добавлен.
if [ \( -e "scripts/setup-ssl-production.sh" -o -L "scripts/setup-ssl-production.sh" \) ] && ! git ls-files --error-unmatch "scripts/setup-ssl-production.sh" >/dev/null 2>&1; then
  echo "[git] removing untracked scripts/setup-ssl-production.sh (will be restored from repo)"
  rm -rf "scripts/setup-ssl-production.sh"
fi
git checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
git reset --hard "origin/${DEPLOY_BRANCH}"

ENV_FILE="deploy/production/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] deploy/production/.env не найден. Сгенерируй его через scripts/generate-env-production.sh и заполни секреты."
  exit 1
fi

COMPOSE_BASE=(docker compose -f deploy/production/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-prod)

echo "=== [1b/6] Ensure ssl/acme dirs + migrate certs ==="
mkdir -p "$REPO_ROOT/deploy/production/ssl/main" "$REPO_ROOT/deploy/production/ssl/subdomains" "$REPO_ROOT/deploy/production/acme"
SSL_DIR="$REPO_ROOT/deploy/production/ssl"
CERTBOT_BASE="$REPO_ROOT/deploy/nginx/certbot"
# Миграция: ищем main cert в нескольких местах
if [ ! -f "$SSL_DIR/main/fullchain.pem" ]; then
  SOURCE=""
  if [ -f "$SSL_DIR/fullchain.pem" ]; then
    SOURCE="$SSL_DIR"
  elif [ -f "$SSL_DIR/letsencrypt/live/daibilet.ru/fullchain.pem" ]; then
    SOURCE="$SSL_DIR/letsencrypt/live/daibilet.ru"
  elif [ -f "$CERTBOT_BASE/conf/live/daibilet.ru/fullchain.pem" ]; then
    SOURCE="$CERTBOT_BASE/conf/live/daibilet.ru"
  elif [ -f "$CERTBOT_BASE/conf/live/www.daibilet.ru/fullchain.pem" ]; then
    SOURCE="$CERTBOT_BASE/conf/live/www.daibilet.ru"
  elif [ -f "$CERTBOT_BASE/www/fullchain.pem" ]; then
    SOURCE="$CERTBOT_BASE/www"
  elif [ -f "$CERTBOT_BASE/www/daibilet.crt" ]; then
    echo "[ssl] Копирую из certbot/www (daibilet.crt/key)"
    cp "$CERTBOT_BASE/www/daibilet.crt" "$SSL_DIR/main/fullchain.pem"
    cp "$CERTBOT_BASE/www/daibilet.key" "$SSL_DIR/main/privkey.pem"
    SOURCE="done"
  else
    LIVE_DIR=$(find "$CERTBOT_BASE/conf/live" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1)
    if [ -n "$LIVE_DIR" ] && [ -f "$LIVE_DIR/fullchain.pem" ]; then
      SOURCE="$LIVE_DIR"
    fi
  fi
  # Docker volume (старый docker-compose.prod / certbot)
  if [ -z "$SOURCE" ]; then
    for VOL in daibilet_certbot_conf daibilet-prod_nginx_certbot_conf; do
      if docker volume inspect "$VOL" &>/dev/null; then
        for DOMAIN in daibilet.ru www.daibilet.ru; do
          if docker run --rm -v "${VOL}:/v:ro" alpine test -f "/v/live/${DOMAIN}/fullchain.pem" 2>/dev/null; then
            echo "[ssl] Извлекаю из Docker volume $VOL (live/$DOMAIN)"
            docker run --rm -v "${VOL}:/v:ro" -v "$SSL_DIR/main:/to" alpine sh -c "cp /v/live/${DOMAIN}/fullchain.pem /to/ && cp /v/live/${DOMAIN}/privkey.pem /to/"
            SOURCE="done"
            break 2
          fi
        done
      fi
    done
  fi
  if [ -n "$SOURCE" ] && [ "$SOURCE" != "done" ]; then
    echo "[ssl] Копирую сертификаты из $SOURCE в ssl/main/"
    cp "$SOURCE/fullchain.pem" "$SSL_DIR/main/"
    cp "$SOURCE/privkey.pem" "$SSL_DIR/main/"
  fi
fi
# subdomains: пробуем LE, иначе fallback на main
if [ ! -f "$SSL_DIR/subdomains/fullchain.pem" ]; then
  LE_SUB=$(find "$SSL_DIR/letsencrypt/live" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1)
  if [ -n "$LE_SUB" ] && [ -f "$LE_SUB/fullchain.pem" ]; then
    echo "[ssl] Копирую subdomains cert из letsencrypt"
    cp "$LE_SUB/fullchain.pem" "$SSL_DIR/subdomains/"
    cp "$LE_SUB/privkey.pem" "$SSL_DIR/subdomains/"
  elif [ -f "$SSL_DIR/main/fullchain.pem" ]; then
    echo "[ssl] subdomains/ пусто — fallback на main (запусти scripts/setup-ssl-production.sh для отдельного LE)"
    cp "$SSL_DIR/main/fullchain.pem" "$SSL_DIR/subdomains/"
    cp "$SSL_DIR/main/privkey.pem" "$SSL_DIR/subdomains/"
  fi
fi
# subdomains: если нет — используем main (временный fallback до выпуска отдельного сертификата)
if [ ! -f "$SSL_DIR/subdomains/fullchain.pem" ] && [ -f "$SSL_DIR/main/fullchain.pem" ]; then
  echo "[ssl] subdomains/ пусто — использую main/ как fallback (выпусти отдельный cert для admin/api/supplier)"
  cp -a "$SSL_DIR/main/fullchain.pem" "$SSL_DIR/subdomains/" 2>/dev/null || cp "$SSL_DIR/main/fullchain.pem" "$SSL_DIR/subdomains/"
  cp -a "$SSL_DIR/main/privkey.pem" "$SSL_DIR/subdomains/" 2>/dev/null || cp "$SSL_DIR/main/privkey.pem" "$SSL_DIR/subdomains/"
fi
if [ ! -f "$SSL_DIR/main/fullchain.pem" ] || [ ! -f "$SSL_DIR/main/privkey.pem" ]; then
  echo "[ERROR] Нет SSL. Варианты:"
  echo "  1) bash scripts/setup-ssl-production.sh  — bootstrap Timeweb + Let's Encrypt"
  echo "  2) Положить вручную: deploy/production/ssl/main/{fullchain,privkey}.pem"
  echo "  Или: deploy/nginx/certbot/conf/live/daibilet.ru/ | deploy/nginx/certbot/www/"
  exit 1
fi

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
# API под /api/ на daibilet.ru
check_http "https://daibilet.ru/api/v1/health" "api"

if [ "${failed}" -ne 0 ]; then
  echo "[deploy-production] Health check FAILED"
  echo "Подсказка: 000 = нет соединения. Проверь: docker compose -f deploy/production/docker-compose.yml logs nginx"
  echo "Убедись, что сертификаты есть в ssl/main/ и ssl/subdomains/"
  exit 1
fi

echo ""
echo "Production deploy complete."

