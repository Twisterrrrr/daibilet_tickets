#!/usr/bin/env bash
# ============================================
# Дайбилет — Развёртывание Staging
# Запуск: chmod +x deploy-staging.sh && ./deploy-staging.sh
# Требования: prod уже развёрнут (создана сеть daibilet-net)
# ============================================

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
COMPOSE_FILE="docker-compose.staging.yml"
PROJECT_NAME="daibilet-staging"

echo "=========================================="
echo " Дайбилет — Staging"
echo "=========================================="

cd "$PROJECT_DIR"

# Проверяем .env
if [ ! -f .env ]; then
  echo "ОШИБКА: .env не найден. Сначала выполните deploy.sh для prod."
  exit 1
fi

# Опционально: staging-специфичные переменные
if [ -f .env.staging ]; then
  echo "Загружаем .env.staging..."
  set -a
  source .env.staging
  set +a
fi

# Проверяем сеть daibilet-net
if ! docker network inspect daibilet-net &>/dev/null; then
  echo "ОШИБКА: Сеть daibilet-net не найдена. Сначала запустите prod:"
  echo "  docker compose -f docker-compose.prod.yml up -d"
  exit 1
fi

# Volume для uploads (должен существовать, создаётся в deploy.sh)
docker volume create uploads_staging 2>/dev/null || true

echo "Сборка и запуск staging..."
docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build

echo "Ожидание backend..."
sleep 15

echo "Миграции..."
docker exec daibilet-staging-backend npx prisma migrate deploy

echo "Seed..."
docker exec daibilet-staging-backend npx prisma db seed

echo ""
echo "=========================================="
echo " Staging развёрнут"
echo "=========================================="
echo "  Сайт:     https://staging.daibilet.ru"
echo "  Админка:  https://admin-staging.daibilet.ru"
echo ""
echo "  Логи: docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f backend"
echo ""
