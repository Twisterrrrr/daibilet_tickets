#!/usr/bin/env bash
# Post-deploy verification. Run: bash scripts/verify-staging.sh

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
cd "${PROJECT_DIR}"

echo "==> docker compose ps"
docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging ps

echo ""
echo "==> Container state checks"
required_containers=(
  "daibilet-staging-postgres"
  "daibilet-staging-redis"
  "daibilet-staging-backend"
  "daibilet-staging-frontend"
  "daibilet-staging-admin"
  "daibilet-staging-nginx"
)

for name in "${required_containers[@]}"; do
  if ! docker inspect -f '{{.State.Running}}' "${name}" >/dev/null 2>&1; then
    echo "[verify-staging] Container ${name} is missing or not running"
    exit 1
  fi
done

echo ""
echo "==> Health (curl)"
BASE="https://staging.daibilet.ru"
API="https://api-staging.daibilet.ru"
ADMIN="https://admin-staging.daibilet.ru"

failed=0

for url in "${BASE}/" "${API}/api/v1/health" "${ADMIN}/"; do
  code=$(curl -sfk -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "  $url -> $code"
  if [ "${url}" = "${API}/api/v1/health" ]; then
    # API health endpoint должен возвращать 200
    if [ "${code}" != "200" ]; then
      failed=1
    fi
  else
    # Для UI принимаем 2xx/3xx как успешные
    case "${code}" in
      2*|3*) ;;
      *) failed=1 ;;
    esac
  fi
done

if [ "${failed}" -ne 0 ]; then
  echo "[verify-staging] Health check FAILED"
  exit 1
fi

echo "[verify-staging] Health check OK"

