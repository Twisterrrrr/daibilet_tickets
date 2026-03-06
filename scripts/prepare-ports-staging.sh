#!/usr/bin/env bash
# Освобождает порты 80/443 перед запуском staging.
# Запуск: bash scripts/prepare-ports-staging.sh

set -euo pipefail

cd /opt/daibilet 2>/dev/null || true

echo "==> Кто занимает 80/443?"
ss -tlnp 2>/dev/null | grep -E ':80 |:443 ' || echo "  (ничего)"

echo "==> Останавливаем staging nginx (Docker)..."
docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging stop nginx 2>/dev/null || true
docker stop daibilet-staging-nginx 2>/dev/null || true
sleep 2

echo "==> Останавливаем системный nginx/apache..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

echo "==> Убиваем процессы на портах 80 и 443..."
for port in 80 443; do
  pid=$(ss -tlnp 2>/dev/null | grep ":$port " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
  if [ -n "$pid" ]; then
    echo "  Порт $port занят PID=$pid, останавливаем..."
    kill -9 "$pid" 2>/dev/null || true
  fi
done
# fuser если установлен (psmisc)
command -v fuser >/dev/null 2>&1 && fuser -k 80/tcp 443/tcp 2>/dev/null || true
sleep 2

echo "==> Разрешаем порты в firewall..."
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || ufw reload 2>/dev/null || true

echo "==> Проверка..."
if ss -tlnp 2>/dev/null | grep -qE ':80\s|:443\s'; then
  echo "Порты 80/443 всё ещё заняты:"
  ss -tlnp | grep -E ':80 |:443 ' || true
  exit 1
fi

echo "Порты 80, 443 свободны."
