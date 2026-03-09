#!/usr/bin/env bash
# Закрытие Gate 0: staging (0a) и при необходимости production (0b).
# Запуск на VPS: cd /opt/daibilet && bash scripts/close-gate0.sh [--staging|--prod|--all]
# По умолчанию: --staging (Gate 0 закрывается после 0a).

set -euo pipefail

MODE="${1:---staging}"
PROJECT_DIR="/opt/daibilet"
cd "${PROJECT_DIR}"

do_staging() {
  echo "==> Gate 0a: Staging"
  grep -q 'TC_API_TOKEN=.' deploy/staging/.env 2>/dev/null || { echo "Ошибка: добавь TC_API_TOKEN и TC_WIDGET_TOKEN в deploy/staging/.env"; exit 1; }
  grep -q 'TC_WIDGET_TOKEN=.' deploy/staging/.env 2>/dev/null || { echo "Ошибка: добавь TC_WIDGET_TOKEN в deploy/staging/.env"; exit 1; }

  bash scripts/prepare-ports-staging.sh
  bash scripts/deploy-staging.sh
  bash scripts/migrate-staging.sh
  bash scripts/backup-staging-db.sh
  bash scripts/verify-staging.sh

  echo ""
  echo "==> Gate 0a: automated steps OK"
  echo "Ручные шаги (если ещё не сделано):"
  echo "  1. DNS A: staging.daibilet.ru, api-staging.daibilet.ru, admin-staging.daibilet.ru -> $(curl -s ifconfig.me 2>/dev/null || echo 'IP_VPS')"
  echo "  2. SSL: STAGING_ONLY=1 bash scripts/init-letsencrypt.sh && bash scripts/enable-ssl-staging.sh"
  echo "  3. Фиксация в Diary.md: первый бэкап staging выполнен"
  echo ""
  echo "Gate 0a закрыт после выполнения ручных шагов 1–3."
}

do_prod() {
  echo "==> Gate 0b: Production"
  [ -f deploy/production/.env ] || { echo "Нужен deploy/production/.env для prod"; exit 1; }
  bash scripts/deploy-production.sh
  bash scripts/migrate-production.sh
  bash scripts/backup-production-db.sh
  echo "Gate 0b: deploy OK. Проверь https://daibilet.ru, https://admin.daibilet.ru"
}

case "$MODE" in
  --staging) do_staging ;;
  --prod)    do_prod ;;
  --all)     do_staging; echo ""; do_prod ;;
  *)         do_staging ;;
esac
