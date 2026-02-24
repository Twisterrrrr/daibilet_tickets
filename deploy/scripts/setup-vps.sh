#!/bin/bash
# ============================================
# Дайбилет — первичная настройка VPS
# Запускать на сервере: bash setup-vps.sh
# ============================================
set -e

REPO_URL="${1:-https://github.com/YOUR_USER/SPBBOATS.git}"
INSTALL_DIR="/opt/daibilet"

echo "=== 1. Docker ==="
apt update && apt install -y docker.io docker-compose-plugin git

echo "=== 2. UFW ==="
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "=== 3. Swap (2G) ==="
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "=== 4. Клонирование ==="
mkdir -p /opt
if [ -d "$INSTALL_DIR" ]; then
  echo "Папка $INSTALL_DIR уже есть. Пропуск clone. Для обновления: cd $INSTALL_DIR && git pull"
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

echo "=== 5. .env Prod ==="
cd "$INSTALL_DIR/deploy/prod"
cp .env.example .env

PG_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
RED_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT=$(openssl rand -base64 48)
ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)

sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$PG_PASS/" .env
sed -i "s/^REDIS_PASSWORD=$/REDIS_PASSWORD=$RED_PASS/" .env
sed -i "s/^JWT_SECRET=$/JWT_SECRET=$JWT/" .env
sed -i "s/^ADMIN_INITIAL_PASSWORD=$/ADMIN_INITIAL_PASSWORD=$ADMIN_PASS/" .env

echo ""
echo "=== 6. .env Staging ==="
cd "$INSTALL_DIR/deploy/staging"
cp .env.example .env

PG_PASS_STG=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
RED_PASS_STG=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_STG=$(openssl rand -base64 48)
ADMIN_PASS_STG=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)

sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$PG_PASS_STG/" .env
sed -i "s/^REDIS_PASSWORD=$/REDIS_PASSWORD=$RED_PASS_STG/" .env
sed -i "s/^JWT_SECRET=$/JWT_SECRET=$JWT_STG/" .env
sed -i "s/^ADMIN_INITIAL_PASSWORD=$/ADMIN_INITIAL_PASSWORD=$ADMIN_PASS_STG/" .env

echo ""
echo "============================================"
echo "Пароли сгенерированы. Сохрани:"
echo ""
echo "  PROD:    admin@daibilet.ru / $ADMIN_PASS"
echo "  STAGING: admin@daibilet.ru / $ADMIN_PASS_STG"
echo "============================================"
echo ""
echo "Нужно дописать в оба .env:"
echo "  TC_API_TOKEN=     (Ticketscloud)"
echo "  TC_WIDGET_TOKEN=  (Ticketscloud)"
echo ""
echo "  nano $INSTALL_DIR/deploy/prod/.env"
echo "  nano $INSTALL_DIR/deploy/staging/.env"
echo ""
echo "После правки запусти (порядок важен):"
echo "  cd $INSTALL_DIR/deploy/prod    && docker compose up -d --build"
echo "  cd $INSTALL_DIR/deploy/staging && docker compose up -d --build"
echo "  mkdir -p $INSTALL_DIR/deploy/nginx/certbot/{www,conf}"
echo "  cd $INSTALL_DIR/deploy/nginx   && docker compose up -d"
echo ""
