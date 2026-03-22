#!/usr/bin/env bash
# =============================================================================
# Настройка SSL для production (daibilet.ru)
# Запуск НА СЕРВЕРЕ: cd /opt/daibilet && bash scripts/setup-ssl-production.sh
#
# Делает:
# 1) Извлечение Timeweb Pro сертификата из Docker volume (если есть)
# 2) Получение Let's Encrypt для admin/api/supplier (если subdomains пусто)
# =============================================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
SSL_MAIN="$PROJECT_DIR/deploy/production/ssl/main"
SSL_SUB="$PROJECT_DIR/deploy/production/ssl/subdomains"
ACME_WEBROOT="$PROJECT_DIR/deploy/production/acme"
LE_DIR="$PROJECT_DIR/deploy/production/ssl/letsencrypt"
EMAIL="${LETSENCRYPT_EMAIL:-admin@daibilet.ru}"

cd "$PROJECT_DIR"
mkdir -p "$SSL_MAIN" "$SSL_SUB" "$ACME_WEBROOT" "$LE_DIR"

# --- 1) Main cert: Timeweb Pro ---
if [ ! -f "$SSL_MAIN/fullchain.pem" ]; then
  echo "=== [1] Main cert (Timeweb Pro) ==="
  FOUND=""

  # a) Из Docker volume (старый docker-compose.prod / certbot)
  for VOL in daibilet_certbot_conf daibilet-prod_nginx_certbot_conf daibilet_prod_nginx_certbot_conf; do
    if docker volume inspect "$VOL" 2>/dev/null; then
      for DOMAIN in daibilet.ru www.daibilet.ru; do
        DIR="/live/$DOMAIN"
        if docker run --rm -v "${VOL}:/from:ro" alpine sh -c "test -f /from${DIR}/fullchain.pem" 2>/dev/null; then
          echo "  Найден сертификат в volume $VOL ($DOMAIN)"
          docker run --rm -v "${VOL}:/from:ro" -v "$SSL_MAIN:/to" alpine sh -c "cp -a /from${DIR}/fullchain.pem /to/ && cp -a /from${DIR}/privkey.pem /to/"
          FOUND=1
          break 2
        fi
      done
    fi
  done

  # b) deploy/nginx/certbot
  if [ -z "$FOUND" ]; then
    for P in "deploy/nginx/certbot/conf/live/daibilet.ru" "deploy/nginx/certbot/conf/live/www.daibilet.ru" "deploy/nginx/certbot/www"; do
      if [ -f "$PROJECT_DIR/$P/fullchain.pem" ]; then
        echo "  Копирую из $P"
        cp "$PROJECT_DIR/$P/fullchain.pem" "$SSL_MAIN/"
        cp "$PROJECT_DIR/$P/privkey.pem" "$SSL_MAIN/"
        FOUND=1
        break
      fi
    done
  fi

  if [ -z "$FOUND" ]; then
    echo ""
    echo "  [ACTION] Main cert не найден автоматически. Сделай вручную:"
    echo "    1. Скачай CRT и Private KEY из панели Timeweb Pro"
    echo "    2. Сохрани как:"
    echo "       $SSL_MAIN/fullchain.pem  (CRT = сертификат + цепочка)"
    echo "       $SSL_MAIN/privkey.pem    (приватный ключ)"
    echo ""
    read -p "  Положить сертификаты вручную и продолжить? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
    if [ ! -f "$SSL_MAIN/fullchain.pem" ]; then
      echo "[ERROR] fullchain.pem по-прежнему отсутствует"
      exit 1
    fi
  fi
else
  echo "=== [1] Main cert уже есть ==="
fi

# --- 2) Subdomains cert: Let's Encrypt ---
if [ ! -f "$SSL_SUB/fullchain.pem" ]; then
  echo "=== [2] Subdomains cert (Let's Encrypt) ==="
  COMPOSE_CMD="docker compose -f deploy/production/docker-compose.yml -p daibilet-prod"
  [ -f deploy/production/.env ] && COMPOSE_CMD="$COMPOSE_CMD --env-file deploy/production/.env"
  echo "  Останавливаем nginx (certbot standalone займёт порт 80)"
  $COMPOSE_CMD stop nginx 2>/dev/null || true

  echo "  Запускаю certbot standalone для admin.daibilet.ru api.daibilet.ru supplier.daibilet.ru"
  docker run --rm \
    -p 80:80 \
    -v "$LE_DIR:/etc/letsencrypt:rw" \
    certbot/certbot certonly --standalone \
    -d admin.daibilet.ru -d api.daibilet.ru -d supplier.daibilet.ru \
    --email "$EMAIL" --agree-tos --non-interactive

  echo "  Перезапускаем nginx"
  $COMPOSE_CMD up -d nginx 2>/dev/null || true

  LE_LIVE=$(find "$LE_DIR/live" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -1)
  if [ -n "$LE_LIVE" ] && [ -f "$LE_LIVE/fullchain.pem" ]; then
    cp "$LE_LIVE/fullchain.pem" "$SSL_SUB/"
    cp "$LE_LIVE/privkey.pem" "$SSL_SUB/"
    echo "  Cert скопирован в $SSL_SUB"
  else
    echo "[ERROR] Certbot не создал сертификат"
    exit 1
  fi
else
  echo "=== [2] Subdomains cert уже есть ==="
fi

echo ""
echo "SSL setup complete."
echo "  main:      $SSL_MAIN"
echo "  subdomains: $SSL_SUB"
echo ""
echo "Дальше: docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod up -d"
echo "Или: bash deploy/production/deploy.sh"
