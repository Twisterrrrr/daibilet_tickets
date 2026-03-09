#!/usr/bin/env bash
# Генерирует deploy/staging/.env. TC_API_TOKEN и TC_WIDGET_TOKEN — скопировать из локального .env 1:1.
# Запуск: cd /opt/daibilet && bash scripts/generate-env-staging.sh

set -euo pipefail

cd /opt/daibilet

POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

mkdir -p deploy/staging
cat > deploy/staging/.env << 'ENVBLOCK'
# ============================================
# STAGING .env — daibilet.ru
# TC_API_TOKEN и TC_WIDGET_TOKEN — скопировать из локального .env 1:1
# ============================================

POSTGRES_DB=daibilet_staging
POSTGRES_USER=daibilet
POSTGRES_PASSWORD=__POSTGRES_PASSWORD__

REDIS_PASSWORD=__REDIS_PASSWORD__

JWT_SECRET=__JWT_SECRET__
ADMIN_INITIAL_EMAIL=admin@daibilet.ru
ADMIN_INITIAL_PASSWORD=StagingAdmin2025!

APP_URL=https://staging.daibilet.ru
CORS_ORIGIN=https://staging.daibilet.ru,https://admin-staging.daibilet.ru,https://api-staging.daibilet.ru

# Обязательно: скопировать из локального .env
TC_API_TOKEN=
TC_WIDGET_TOKEN=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

NEXT_PUBLIC_YM_ID=
ENVBLOCK

sed -i "s/__POSTGRES_PASSWORD__/${POSTGRES_PASSWORD}/" deploy/staging/.env
sed -i "s/__REDIS_PASSWORD__/${REDIS_PASSWORD}/" deploy/staging/.env
sed -i "s/__JWT_SECRET__/${JWT_SECRET}/" deploy/staging/.env

echo "Создан deploy/staging/.env. Вручную добавь TC_API_TOKEN и TC_WIDGET_TOKEN из локального .env"
echo "  nano deploy/staging/.env"
echo "Пароль админки: StagingAdmin2025!"
