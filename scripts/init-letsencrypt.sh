#!/usr/bin/env bash
set -euo pipefail

DOMAINS_STAGING="staging.daibilet.ru api-staging.daibilet.ru admin-staging.daibilet.ru"
DOMAINS_PROD="daibilet.ru www.daibilet.ru api.daibilet.ru admin.daibilet.ru"
EMAIL="${LETSENCRYPT_EMAIL:-admin@daibilet.ru}"

# STAGING_ONLY=1 — только staging домены (prod ещё не указывает на VPS)
DOMAINS="${DOMAINS_STAGING}"
if [ "${STAGING_ONLY:-0}" != "1" ]; then
  DOMAINS="${DOMAINS_STAGING} ${DOMAINS_PROD}"
fi

echo "==> Creating certbot folders..."
mkdir -p /opt/daibilet/deploy/nginx/certbot/{www,conf}

echo "==> Requesting certificates..."
docker run --rm \
  -v /opt/daibilet/deploy/nginx/certbot/conf:/etc/letsencrypt \
  -v /opt/daibilet/deploy/nginx/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  $(for d in ${DOMAINS}; do echo -n " -d ${d}"; done) \
  --email "${EMAIL}" --agree-tos --non-interactive --expand

echo "Certificates initialized. Reload nginx after mounting cert volumes."

