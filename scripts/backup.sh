#!/bin/bash
# Ops Foundation Batch 6 — pg_dump + compression + retention
#
# Использование:
#   ./scripts/backup.sh [--retention-days 7] [--out-dir /path/to/backups]
#
# Требуется: Docker с контейнером daibilet-postgres, или pg_dump в PATH с DATABASE_URL
# Retention: по умолчанию 7 дней, старые дампы удаляются

set -e

RETENTION_DAYS=7
OUT_DIR="${PWD}/backups"
CONTAINER="${POSTGRES_CONTAINER:-daibilet-postgres}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

mkdir -p "$OUT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${OUT_DIR}/daibilet_${TIMESTAMP}.sql.gz"

echo "[backup] Starting dump to $DUMP_FILE ..."

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  docker exec "$CONTAINER" pg_dump -U "${POSTGRES_USER:-daibilet}" "${POSTGRES_DB:-daibilet}" | gzip > "$DUMP_FILE"
else
  # Fallback: pg_dump напрямую (нужен DATABASE_URL)
  if [ -z "$DATABASE_URL" ]; then
    echo "[backup] ERROR: DATABASE_URL not set and container $CONTAINER not running"
    exit 1
  fi
  pg_dump "$DATABASE_URL" | gzip > "$DUMP_FILE"
fi

echo "[backup] Done: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# Удаляем дампы старше RETENTION_DAYS
if [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$OUT_DIR" -name "daibilet_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  echo "[backup] Cleaned up dumps older than $RETENTION_DAYS days"
fi
