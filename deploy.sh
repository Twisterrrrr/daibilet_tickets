#!/usr/bin/env bash
# ============================================
# Дайбилет — первоначальное развёртывание на VPS
# Запуск: chmod +x deploy.sh && sudo ./deploy.sh
# ============================================

set -euo pipefail

DOMAIN="daibilet.ru"
REPO_URL=""  # <-- Указать URL git-репозитория
PROJECT_DIR="/opt/daibilet"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=========================================="
echo " Дайбилет — Установка на VPS"
echo "=========================================="

# ---- 1. Системные пакеты ----
echo "[1/8] Обновление системы..."
apt-get update -y && apt-get upgrade -y

# ---- 2. Docker ----
echo "[2/8] Установка Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker && systemctl start docker
  echo "Docker установлен."
else
  echo "Docker уже установлен."
fi

# Docker Compose plugin
if ! docker compose version &> /dev/null; then
  apt-get install -y docker-compose-plugin
fi

# ---- 3. Git ----
echo "[3/8] Установка Git..."
apt-get install -y git

# ---- 4. Клонирование/обновление репозитория ----
echo "[4/8] Подготовка проекта..."
if [ -d "$PROJECT_DIR" ]; then
  echo "Директория $PROJECT_DIR существует, обновляем..."
  cd "$PROJECT_DIR"
  git pull origin main
else
  if [ -z "$REPO_URL" ]; then
    echo "ОШИБКА: Укажите REPO_URL в скрипте для первого клона."
    echo "Создаём директорию для ручного копирования..."
    mkdir -p "$PROJECT_DIR"
    echo "Скопируйте проект в $PROJECT_DIR и перезапустите скрипт."
    exit 1
  fi
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# ---- 5. Файл окружения ----
echo "[5/8] Проверка .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "ВНИМАНИЕ: Файл .env создан из .env.example."
  echo "Отредактируйте $PROJECT_DIR/.env и перезапустите скрипт."
  echo "  nano $PROJECT_DIR/.env"
  exit 1
else
  echo ".env найден."
fi

# ---- 6. Получение SSL-сертификата (первый раз) ----
echo "[6/8] SSL-сертификат..."

# Временный Nginx для Let's Encrypt challenge (без SSL)
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Получаем SSL-сертификат для $DOMAIN..."

  # Создаём временный nginx конфиг для HTTP-only
  mkdir -p /tmp/nginx-temp
  cat > /tmp/nginx-temp/default.conf << 'NGINX_TMP'
server {
    listen 80;
    server_name daibilet.ru www.daibilet.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up...';
        add_header Content-Type text/plain;
    }
}
NGINX_TMP

  # Запускаем временный nginx
  mkdir -p /var/www/certbot
  docker run -d --name temp-nginx \
    -p 80:80 \
    -v /tmp/nginx-temp/default.conf:/etc/nginx/conf.d/default.conf:ro \
    -v /var/www/certbot:/var/www/certbot \
    nginx:alpine

  # Certbot
  docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
      --webroot -w /var/www/certbot \
      -d "$DOMAIN" -d "www.$DOMAIN" \
      --email "admin@$DOMAIN" \
      --agree-tos \
      --non-interactive

  # Убираем временный nginx
  docker stop temp-nginx && docker rm temp-nginx
  rm -rf /tmp/nginx-temp

  echo "SSL-сертификат получен."
else
  echo "SSL-сертификат уже существует."
fi

# ---- 7. Запуск контейнеров ----
echo "[7/8] Сборка и запуск контейнеров..."
cd "$PROJECT_DIR"
docker compose -f "$COMPOSE_FILE" up -d --build

# Ждём пока backend будет готов
echo "Ожидание готовности backend..."
sleep 10

# ---- 8. Миграции и seed ----
echo "[8/8] Применение миграций..."
docker exec daibilet-backend npx prisma migrate deploy

echo ""
echo "=========================================="
echo " Развёртывание завершено!"
echo "=========================================="
echo ""
echo " Сайт: https://$DOMAIN"
echo " API:  https://$DOMAIN/api/v1/health"
echo ""
echo " Полезные команды:"
echo "   Логи:     docker compose -f $COMPOSE_FILE logs -f"
echo "   Стоп:     docker compose -f $COMPOSE_FILE down"
echo "   Рестарт:  docker compose -f $COMPOSE_FILE restart"
echo "   Ребилд:   docker compose -f $COMPOSE_FILE up -d --build"
echo "   Миграция: docker exec daibilet-backend npx prisma migrate deploy"
echo ""
echo " Обновление SSL (добавить в cron каждые 12 часов):"
echo "   0 */12 * * * docker compose -f $PROJECT_DIR/$COMPOSE_FILE run --rm certbot renew && docker compose -f $PROJECT_DIR/$COMPOSE_FILE exec nginx nginx -s reload"
echo ""
