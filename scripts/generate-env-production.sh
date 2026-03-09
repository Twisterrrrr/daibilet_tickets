#!/usr/bin/env bash
# Генерирует deploy/production/.env. TC_*, YooKassa — заполнить вручную из локального .env / YooKassa.
# Запуск: cd /opt/daibilet && bash scripts/generate-env-production.sh

set -euo pipefail

cd /opt/daibilet

POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD="ProdAdmin$(openssl rand -hex 8)!"

mkdir -p deploy/production
cat > deploy/production/.env << 'ENVBLOCK'
# ============================================
# PRODUCTION .env — daibilet.ru
# TC_*, YooKassa — скопировать/заполнить вручную
# ============================================

POSTGRES_DB=daibilet
POSTGRES_USER=daibilet
POSTGRES_PASSWORD=__POSTGRES_PASSWORD__

REDIS_PASSWORD=__REDIS_PASSWORD__

JWT_SECRET=__JWT_SECRET__
ADMIN_INITIAL_EMAIL=admin@daibilet.ru
ADMIN_INITIAL_PASSWORD=__ADMIN_PASSWORD__

APP_URL=https://daibilet.ru
CORS_ORIGIN=https://daibilet.ru,https://admin.daibilet.ru,https://api.daibilet.ru

TC_API_TOKEN=
TC_WIDGET_TOKEN=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

NEXT_PUBLIC_YM_ID=
ENVBLOCK

sed -i "s/__POSTGRES_PASSWORD__/${POSTGRES_PASSWORD}/" deploy/production/.env
sed -i "s/__REDIS_PASSWORD__/${REDIS_PASSWORD}/" deploy/production/.env
sed -i "s/__JWT_SECRET__/${JWT_SECRET}/" deploy/production/.env
sed -i "s|__ADMIN_PASSWORD__|${ADMIN_PASSWORD}|" deploy/production/.env

echo "Создан deploy/production/.env."
echo "Вручную добавь: TC_API_TOKEN, TC_WIDGET_TOKEN, YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY"
echo "  nano deploy/production/.env"
