#!/usr/bin/env bash
# Переключить staging на HTTPS после успешного получения сертификатов.
# Выполнять: bash scripts/init-letsencrypt.sh
#            bash scripts/enable-ssl-staging.sh

set -euo pipefail

cd /opt/daibilet

if [ ! -f deploy/nginx/staging-https.conf ]; then
  echo "Ошибка: deploy/nginx/staging-https.conf не найден (bootstrap ещё не запускали?)"
  exit 1
fi

echo "==> Переключение nginx на HTTPS config..."
cp deploy/nginx/staging-https.conf deploy/nginx/staging.conf

echo "==> Перезапуск nginx..."
docker compose -f deploy/staging/docker-compose.yml --env-file .env -p daibilet-staging restart nginx

echo "Staging доступен по HTTPS."
