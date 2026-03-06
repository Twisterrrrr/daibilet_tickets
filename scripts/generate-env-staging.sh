#!/usr/bin/env bash
# Генерирует .env для staging со всеми обязательными секретами.
# Запуск на VPS: cd /opt/daibilet && bash scripts/generate-env-staging.sh

set -euo pipefail

cd /opt/daibilet

POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
# ============================================
# STAGING .env — сгенерировано $(date -Iseconds)
# ============================================

POSTGRES_DB=daibilet_staging
POSTGRES_USER=daibilet
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

REDIS_PASSWORD=${REDIS_PASSWORD}

JWT_SECRET=${JWT_SECRET}
ADMIN_INITIAL_EMAIL=admin@daibilet.ru
ADMIN_INITIAL_PASSWORD=StagingAdmin2025!

APP_URL=https://staging.daibilet.ru
CORS_ORIGIN=https://staging.daibilet.ru,https://admin-staging.daibilet.ru

TC_API_TOKEN=
TC_WIDGET_TOKEN=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

NEXT_PUBLIC_YM_ID=
EOF

echo "Создан /opt/daibilet/.env"
echo "Пароль админки: StagingAdmin2025!"
echo "Остальные секреты — случайные, см. в FileZilla"
