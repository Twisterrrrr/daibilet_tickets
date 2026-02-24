#!/bin/bash
# Ops Foundation Batch 6 — restore из дампа (staging)
#
# Использование:
#   ./scripts/restore-to-staging.sh /path/to/daibilet_YYYYMMDD_HHMMSS.sql.gz
#
# Внимание: DROP и restore! Все данные в целевой БД будут потеряны.
# Использовать только для staging или после подтверждения.
#
# Требуется: Docker с контейнером daibilet-postgres (staging) или DATABASE_URL

set -e

if [ -z "$1" ] || [ ! -f "$1" ]; then
  echo "Usage: $0 <path-to-dump.sql.gz>"
  echo "Example: $0 ./backups/daibilet_20260223_120000.sql.gz"
  exit 1
fi

DUMP_FILE="$1"
CONTAINER="${POSTGRES_CONTAINER:-daibilet-postgres}"
DB_NAME="${POSTGRES_DB:-daibilet}"
DB_USER="${POSTGRES_USER:-daibilet}"

echo "[restore] WARNING: This will DROP and recreate data in database '$DB_NAME'"
echo "[restore] Dump: $DUMP_FILE"
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[restore] Dropping and recreating database..."
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
  docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

  echo "[restore] Restoring from dump..."
  gunzip -c "$DUMP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q

  echo "[restore] Run migrations manually: cd packages/backend && pnpm prisma migrate deploy"
else
  echo "[restore] ERROR: Container $CONTAINER not running. Set POSTGRES_CONTAINER or use DATABASE_URL with psql."
  exit 1
fi

echo "[restore] Done. Verify: GET /api/v1/health"
