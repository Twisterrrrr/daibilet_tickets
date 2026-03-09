#!/usr/bin/env bash
# Backup staging PostgreSQL. Retention: 14 dumps.
# Run: bash scripts/backup-staging-db.sh
# Cron: 0 3 * * * cd /opt/daibilet && bash scripts/backup-staging-db.sh

set -euo pipefail

PROJECT_DIR="/opt/daibilet"
BACKUP_DIR="${PROJECT_DIR}/backups"
CONTAINER="daibilet-staging-postgres"
RETENTION_DAYS=14
POSTGRES_USER="${POSTGRES_USER:-daibilet}"
POSTGRES_DB="${POSTGRES_DB:-daibilet_staging}"

cd "${PROJECT_DIR}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/daibilet_staging_${TIMESTAMP}.sql.gz"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[backup-staging] ERROR: Container ${CONTAINER} not running"
  exit 1
fi

echo "[backup-staging] Dumping to ${DUMP_FILE} ..."
docker exec "${CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DUMP_FILE}"

echo "[backup-staging] Done: ${DUMP_FILE}"
if [ -f "${DUMP_FILE}" ]; then
  du -h "${DUMP_FILE}" | cut -f1
fi

if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "${BACKUP_DIR}" -name "daibilet_staging_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
  echo "[backup-staging] Cleaned dumps older than ${RETENTION_DAYS} days"
fi
