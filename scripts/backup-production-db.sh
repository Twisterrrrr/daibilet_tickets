#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"
BACKUP_DIR="${PROJECT_DIR}/backups"
CONTAINER="daibilet-postgres"
RETENTION_DAYS=14
POSTGRES_USER="${POSTGRES_USER:-daibilet}"
POSTGRES_DB="${POSTGRES_DB:-daibilet}"

cd "${PROJECT_DIR}"
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/daibilet_prod_${TIMESTAMP}.sql.gz"

docker exec "${CONTAINER}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${DUMP_FILE}"
echo "[backup-prod] Done: ${DUMP_FILE}"
find "${BACKUP_DIR}" -name "daibilet_prod_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
