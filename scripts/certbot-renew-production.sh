#!/usr/bin/env bash
# Обновление Let's Encrypt для subdomains (admin, api, supplier)
# Запуск: на сервере, cron "0 3 * * *" или вручную
# cd /opt/daibilet && bash scripts/certbot-renew-production.sh
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
LE_DIR="$PROJECT_DIR/deploy/production/ssl/letsencrypt"
SSL_SUB="$PROJECT_DIR/deploy/production/ssl/subdomains"
ACME="$PROJECT_DIR/deploy/production/acme"
COMPOSE_OPTS=( -f deploy/production/docker-compose.yml -p daibilet-prod )
[ -f deploy/production/.env ] && COMPOSE_OPTS+=( --env-file deploy/production/.env )

cd "$PROJECT_DIR"

# Webroot mode: nginx должен быть запущен
mkdir -p "$ACME"

docker run --rm \
  -v "$ACME:/var/www/certbot:rw" \
  -v "$LE_DIR:/etc/letsencrypt:rw" \
  certbot/certbot renew --webroot -w /var/www/certbot --quiet

LE_LIVE=$(find "$LE_DIR/live" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1)
if [ -n "$LE_LIVE" ] && [ -f "$LE_LIVE/fullchain.pem" ]; then
  cp "$LE_LIVE/fullchain.pem" "$SSL_SUB/"
  cp "$LE_LIVE/privkey.pem" "$SSL_SUB/"
  docker compose "${COMPOSE_OPTS[@]}" exec -T nginx nginx -s reload 2>/dev/null || true
  echo "Renewed and reloaded nginx"
fi
