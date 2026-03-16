#!/usr/bin/env bash
# Деплой staging: сборка и запуск контейнеров.
# Запуск: из корня репо — bash deploy/staging/deploy.sh
#         или на сервере: cd /opt/daibilet && bash deploy/staging/deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Каталоги для certbot (нужны для монтирования nginx)
mkdir -p "$REPO_ROOT/deploy/nginx/certbot/www" "$REPO_ROOT/deploy/nginx/certbot/conf"

echo "=== Проверка сети (Docker DNS) ==="
if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null && ! ping -c 1 -W 3 google.com &>/dev/null; then
  echo "ВНИМАНИЕ: Сеть недоступна. Если контейнеры не выходят в интернет (resolv.conf),"
  echo "добавьте в /etc/docker/daemon.json:"
  echo '  "dns": ["8.8.8.8", "1.1.1.1"]'
  echo "Затем: systemctl restart docker"
fi

# Единый .env из корня репо (пароль БД и секреты)
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
[ -f "$ENV_FILE" ] || ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_ENV="--env-file $ENV_FILE"

# SSL: определяем compose-файлы
COMPOSE_FILES="-f docker-compose.yml"
if [ -d "$REPO_ROOT/deploy/nginx/certbot/conf/live" ] || [ -d "/etc/letsencrypt/live" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ssl.yml"
  echo "SSL-сертификаты найдены, подключаем HTTPS-конфиг"
fi

# Prebuilt-образы: если задан DOCKER_REGISTRY — не собираем на сервере, только pull + up
if [ -f "$ENV_FILE" ]; then
  DOCKER_REGISTRY=$(grep -E '^DOCKER_REGISTRY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
fi
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
USE_PREBUILT=false
if [ -n "$DOCKER_REGISTRY" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.images.yml"
  USE_PREBUILT=true
  echo "Режим prebuilt: образы из $DOCKER_REGISTRY (без сборки на сервере)"
fi

# Опционально: логин в Docker Hub (снимает лимит 429 при pull образов)
if [ -f "$ENV_FILE" ]; then
  DOCKERHUB_USER=$(grep -E '^DOCKERHUB_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
  DOCKERHUB_TOKEN=$(grep -E '^DOCKERHUB_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
fi
if [ -n "$DOCKERHUB_USER" ] && [ -n "$DOCKERHUB_TOKEN" ]; then
  echo "=== Docker Hub login (rate limit) ==="
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin 2>/dev/null || true
fi

echo "=== Staging: перезапуск (context: $REPO_ROOT, env: $ENV_FILE) ==="
cd "$SCRIPT_DIR"
# Явный project name и удаление старых контейнеров
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES down --remove-orphans 2>/dev/null || true

if [ "$USE_PREBUILT" = true ]; then
  echo "=== Pull образов ==="
  docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES pull backend frontend admin
  docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES up -d
else
  docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES build --pull 2>/dev/null || true
  docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES build frontend --no-cache 2>/dev/null || true
  docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES up -d --build
fi

echo ""
echo "=== Миграции Prisma (пауза 5с) ==="
sleep 5
docker exec daibilet-staging-backend npx prisma migrate deploy 2>/dev/null || echo "Миграции: docker exec daibilet-staging-backend npx prisma migrate deploy"

# Seed и тестовые данные (только если есть репо и SEED_STAGING не отключён)
# Требуется полный репо (monorepo): seed-supplier-finance использует сервисы backend.
SEED_STAGING="${SEED_STAGING:-true}"
if [ "$SEED_STAGING" = true ] && [ -f "$REPO_ROOT/packages/backend/prisma/seed-buyer-account-test.ts" ]; then
  echo ""
  echo "=== Seed: тестовые данные (buyer-account-test, supplier-finance) ==="
  if [ -f "$ENV_FILE" ]; then
    POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
    POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
    POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
    ADMIN_INITIAL_EMAIL=$(grep -E '^ADMIN_INITIAL_EMAIL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
    ADMIN_INITIAL_PASSWORD=$(grep -E '^ADMIN_INITIAL_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
  fi
  POSTGRES_USER="${POSTGRES_USER:-daibilet}"
  POSTGRES_DB="${POSTGRES_DB:-daibilet_staging}"
  if [ -n "$POSTGRES_PASSWORD" ]; then
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@daibilet-staging-postgres:5432/${POSTGRES_DB}?schema=public"
    docker run --rm --network daibilet-staging-net \
      -e DATABASE_URL="$DATABASE_URL" \
      -e ADMIN_INITIAL_EMAIL="${ADMIN_INITIAL_EMAIL:-admin@daibilet.ru}" \
      -e ADMIN_INITIAL_PASSWORD="${ADMIN_INITIAL_PASSWORD:-changeme123}" \
      -v "$REPO_ROOT:/app" -w /app \
      node:22-alpine sh -c 'corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && (cd packages/backend && npx prisma generate) && (cd packages/backend && npx tsx prisma/seed.ts) && (cd packages/backend && npx tsx prisma/seed-buyer-account-test.ts) && (cd packages/backend && npx tsx prisma/seed-supplier-finance.ts)' \
      || echo "Seed: ошибка или часть шагов пропущена (проверьте логи выше)"
  else
    echo "Seed: POSTGRES_PASSWORD не задан в .env, пропуск"
  fi
fi

echo ""
echo "=== Статус контейнеров ==="
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES ps

echo ""
echo "Логи: docker compose -f deploy/staging/docker-compose.yml logs -f"
