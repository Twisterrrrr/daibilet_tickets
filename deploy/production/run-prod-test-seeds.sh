#!/usr/bin/env bash
# Явный запуск prod-safe сидов (test-event-prod + test.yookassa@daibilet.ru).
# Запускать ТОЛЬКО вручную на prod-сервере:
#   cd /opt/daibilet && bash deploy/production/run-prod-test-seeds.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="deploy/production/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] deploy/production/.env не найден. Сначала сгенерируйте его (scripts/generate-env-production.sh) и заполните секреты."
  exit 1
fi

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)

POSTGRES_USER="${POSTGRES_USER:-daibilet}"
POSTGRES_DB="${POSTGRES_DB:-daibilet}"

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "[ERROR] POSTGRES_PASSWORD не задан в deploy/production/.env"
  exit 1
fi

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@daibilet-postgres:5432/${POSTGRES_DB}?schema=public"

echo "=== Prod test seeds: DATABASE_URL=${DATABASE_URL} ==="
docker run --rm --network daibilet-prod-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -v "$REPO_ROOT:/app" -w /app \
  node:22-alpine sh -c '
    set -e
    corepack enable
    corepack prepare pnpm@latest --activate
    pnpm install --frozen-lockfile
    cd packages/backend
    npx prisma generate
    npx tsx prisma/seed-prod-test.ts
  '

echo "=== Prod test seeds completed ==="

