#!/usr/bin/env bash
# Освобождает порты 80/443 и настраивает firewall перед запуском staging.
# Запуск: bash scripts/prepare-ports-staging.sh

set -euo pipefail

echo "==> Останавливаем системный nginx/apache (если запущены)..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

echo "==> Разрешаем порты 80, 443 в firewall..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
echo "y" | ufw enable 2>/dev/null || ufw reload 2>/dev/null || true

echo "==> Проверка портов 80, 443..."
if ss -tlnp | grep -qE ':80\s|:443\s'; then
  echo "ВНИМАНИЕ: порты 80 или 443 всё ещё заняты:"
  ss -tlnp | grep -E ':80 |:443 '
  exit 1
fi

echo "Порты готовы. Запускайте deploy."
