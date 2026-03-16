#!/usr/bin/env bash
# Запуск всех seed на staging (вызывать с сервера: bash deploy/staging/run-all-seeds.sh)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
cd "$REPO_ROOT"

if [ ! -f "$ENV_FILE" ]; then
  echo "Не найден .env: $ENV_FILE"
  exit 1
fi
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_USER="${POSTGRES_USER:-daibilet}"
POSTGRES_DB="${POSTGRES_DB:-daibilet_staging}"
ADMIN_INITIAL_EMAIL=$(grep -E '^ADMIN_INITIAL_EMAIL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
ADMIN_INITIAL_PASSWORD=$(grep -E '^ADMIN_INITIAL_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "POSTGRES_PASSWORD не задан в .env"
  exit 1
fi

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@daibilet-staging-postgres:5432/${POSTGRES_DB}?schema=public"
echo "=== Запуск всех seed на staging ==="
docker run --rm --network daibilet-staging-net \
  -e DATABASE_URL="$DATABASE_URL" \
  -e ADMIN_INITIAL_EMAIL="${ADMIN_INITIAL_EMAIL:-admin@daibilet.ru}" \
  -e ADMIN_INITIAL_PASSWORD="${ADMIN_INITIAL_PASSWORD:-changeme123}" \
  -v "$REPO_ROOT:/app" -w /app \
  node:22-alpine sh -c '
    corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile &&
    (cd packages/backend && npx prisma generate) &&
    (cd packages/backend && npx tsx prisma/seed.ts) &&
    (cd packages/backend && npx tsx prisma/seed-regions.ts) &&
    (cd packages/backend && npx tsx prisma/seed-query-filters.ts) &&
    (cd packages/backend && npx tsx prisma/seed-seo-templates.ts) &&
    (cd packages/backend && npx tsx prisma/seed-teplohod-widgets.ts) &&
    (cd packages/backend && npx tsx prisma/seed-buyer-account-test.ts) &&
    (cd packages/backend && npx tsx prisma/seed-supplier-finance.ts)
  '
echo "=== Все seed выполнены ==="
