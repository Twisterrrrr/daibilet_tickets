#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
cd "$REPO_ROOT"

[ -f "$ENV_FILE" ] || { echo "No .env"; exit 1; }
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
POSTGRES_USER="${POSTGRES_USER:-daibilet}"
POSTGRES_DB="${POSTGRES_DB:-daibilet_staging}"
[ -n "$POSTGRES_PASSWORD" ] || { echo "POSTGRES_PASSWORD required"; exit 1; }

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@daibilet-staging-postgres:5432/${POSTGRES_DB}?schema=public"

echo "=== Applying Prisma migrations ==="
docker run --rm --network daibilet-staging-net \
  -e DATABASE_URL="$DATABASE_URL" \
  daibilet-staging-backend \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

echo ""
echo "=== Restarting containers ==="
cd "$SCRIPT_DIR"
docker compose -p daibilet-staging --env-file "$ENV_FILE" -f docker-compose.yml restart

echo ""
echo "=== Done ==="
docker compose -p daibilet-staging --env-file "$ENV_FILE" -f docker-compose.yml ps
