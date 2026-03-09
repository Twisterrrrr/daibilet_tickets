#!/usr/bin/env bash
# Post-deploy verification. Run: bash scripts/verify-staging.sh

set -euo pipefail

cd /opt/daibilet

echo "==> docker compose ps"
docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging ps

echo ""
echo "==> Health (curl)"
BASE="https://staging.daibilet.ru"
API="https://api-staging.daibilet.ru"
ADMIN="https://admin-staging.daibilet.ru"
for url in "${BASE}/" "${API}/api/v1/health" "${ADMIN}/"; do
  code=$(curl -sfk -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  echo "  $url -> $code"
done
