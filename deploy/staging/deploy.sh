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

# SSL: определяем compose-файлы
COMPOSE_FILES="-f docker-compose.yml"
if [ -d "$REPO_ROOT/deploy/nginx/certbot/conf/live" ] || [ -d "/etc/letsencrypt/live" ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.ssl.yml"
  echo "SSL-сертификаты найдены, подключаем HTTPS-конфиг"
fi

# Единый .env из корня репо (пароль БД и секреты)
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
[ -f "$ENV_FILE" ] || ENV_FILE="$SCRIPT_DIR/.env"
COMPOSE_ENV="--env-file $ENV_FILE"

echo "=== Staging: перезапуск (context: $REPO_ROOT, env: $ENV_FILE) ==="
cd "$SCRIPT_DIR"
# Явный project name и удаление старых контейнеров
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES down --remove-orphans 2>/dev/null || true

# build --pull для подхвата package.json (Prisma в deps)
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES build --pull 2>/dev/null || true
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES build frontend --no-cache 2>/dev/null || true

docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES up -d --build

echo ""
echo "=== Миграции Prisma (пауза 5с) ==="
sleep 5
docker exec daibilet-staging-backend npx prisma migrate deploy 2>/dev/null || echo "Миграции: docker exec daibilet-staging-backend npx prisma migrate deploy"

echo ""
echo "=== Статус контейнеров ==="
docker compose -p daibilet-staging $COMPOSE_ENV $COMPOSE_FILES ps

echo ""
echo "Логи: docker compose -f deploy/staging/docker-compose.yml logs -f"
