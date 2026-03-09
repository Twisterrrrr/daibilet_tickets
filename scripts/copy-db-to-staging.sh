#!/usr/bin/env bash
# ============================================
# Копирование БД localhost → staging
# Полный дамп и восстановление. Staging перезаписывается.
# ============================================
# Запуск: bash scripts/copy-db-to-staging.sh
# ============================================

set -euo pipefail

STAGING_SERVER="${STAGING_SERVER:-root@213.171.7.16}"
REMOTE_PATH="/opt/daibilet"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DUMP="${TMPDIR:-/tmp}/daibilet_local_dump_$(date +%Y%m%d_%H%M%S).dump"

# Локальная БД (docker-compose)
LOCAL_CONTAINER="${LOCAL_POSTGRES_CONTAINER:-daibilet-postgres}"
LOCAL_DB="${LOCAL_POSTGRES_DB:-daibilet}"
LOCAL_USER="${LOCAL_POSTGRES_USER:-daibilet}"

# Удалённая staging БД
REMOTE_CONTAINER="daibilet-staging-postgres"
REMOTE_DB="${POSTGRES_DB:-daibilet_staging}"
REMOTE_USER="${POSTGRES_USER:-daibilet}"

echo "=== Копирование БД: local → staging ==="
echo "  Локально:  $LOCAL_CONTAINER / $LOCAL_DB"
echo "  Staging:   $STAGING_SERVER / $REMOTE_CONTAINER / $REMOTE_DB"
echo ""

# --- 1. Локальный дамп ---
if ! docker ps --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER}$"; then
  echo "Ошибка: локальный контейнер $LOCAL_CONTAINER не запущен."
  echo "Запусти: docker compose up -d"
  exit 1
fi

echo "[1/4] Дамп локальной БД..."
# MSYS_NO_PATHCONV=1 — Git Bash на Windows не преобразует /tmp в путь хоста
MSYS_NO_PATHCONV=1 docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -d "$LOCAL_DB" -F c -f /tmp/db.dump
docker cp "$LOCAL_CONTAINER:/tmp/db.dump" "$TMP_DUMP"
MSYS_NO_PATHCONV=1 docker exec "$LOCAL_CONTAINER" rm -f /tmp/db.dump 2>/dev/null || true

SIZE=$(du -h "$TMP_DUMP" | cut -f1)
echo "      Создан дамп: $TMP_DUMP ($SIZE)"

# --- 2. Копирование на сервер ---
echo "[2/4] Копирование на $STAGING_SERVER ..."
scp -q "$TMP_DUMP" "$STAGING_SERVER:/tmp/daibilet_copy.dump"
rm -f "$TMP_DUMP"

# --- 3. Restore на staging ---
echo "[3/4] Восстановление на staging..."
ssh "$STAGING_SERVER" "cd $REMOTE_PATH && \
  docker exec -i $REMOTE_CONTAINER pg_restore -U $REMOTE_USER -d $REMOTE_DB -c --if-exists < /tmp/daibilet_copy.dump 2>/dev/null || true; \
  rm -f /tmp/daibilet_copy.dump"

# pg_restore с -c --if-exists может вернуть код 1 при DROP несуществующих объектов — это нормально

# --- 4. Restart backend ---
echo "[4/4] Перезапуск backend на staging..."
ssh "$STAGING_SERVER" "cd $REMOTE_PATH && docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging --env-file .env restart backend 2>/dev/null || \
  docker compose -f deploy/staging/docker-compose.yml --env-file .env restart backend 2>/dev/null || true"

echo "      Инвалидация кэша каталога..."
ssh "$STAGING_SERVER" "sleep 6 && docker exec daibilet-staging-backend curl -s -X POST http://localhost:4000/api/v1/tep/sync >/dev/null 2>&1 || true"

echo ""
echo "Готово. Staging использует данные с localhost."
echo "Проверка: https://api-staging.daibilet.ru/api/v1/health"
echo "Города: https://staging.daibilet.ru/cities"
echo "Если города пустые — нужны события с будущими сессиями. Запустите TC sync позже: POST /api/v1/tc/sync"
