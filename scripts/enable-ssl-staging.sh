#!/usr/bin/env bash
# Переключить staging на HTTPS после успешного получения сертификатов.
# Выполнять: STAGING_ONLY=1 bash scripts/init-letsencrypt.sh
#            bash scripts/enable-ssl-staging.sh

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
cd "${PROJECT_DIR}"

ENV_FILE="deploy/staging/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"

if [ ! -d deploy/nginx/certbot/conf/live/staging.daibilet.ru ]; then
  echo "Ошибка: сертификаты staging.daibilet.ru не найдены (запустите init-letsencrypt.sh)"
  exit 1
fi

echo "==> Подключение второго конфига (staging-ssl.conf)..."
echo "==> Перезапуск nginx с SSL..."
docker compose -f deploy/staging/docker-compose.yml -f deploy/staging/docker-compose.ssl.yml \
  --env-file "$ENV_FILE" -p daibilet-staging up -d nginx

echo "Staging доступен по HTTPS."
