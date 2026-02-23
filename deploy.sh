#!/usr/bin/env bash
# ============================================
# Дайбилет — первоначальное развёртывание на VPS
# Запуск: chmod +x deploy.sh && sudo ./deploy.sh
# ============================================

set -euo pipefail

DOMAIN="daibilet.ru"
ADMIN_DOMAIN="admin.daibilet.ru"
REPO_URL="https://github.com/Twisterrrrr/daibilet_tickets.git"
PROJECT_DIR="/opt/daibilet"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=========================================="
echo " Дайбилет — Установка на VPS"
echo "=========================================="

# ---- 1. Системные пакеты ----
echo "[1/9] Обновление системы..."
apt-get update -y && apt-get upgrade -y

# ---- 2. Docker ----
echo "[2/9] Установка Docker..."
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
echo "[3/9] Установка Git..."
apt-get install -y git

# ---- 4. Клонирование/обновление репозитория ----
echo "[4/9] Подготовка проекта..."
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
echo "[5/9] Проверка .env..."
if [ ! -f .env ]; then
  cp .env.example .env

  # Генерируем случайные пароли при первой установке
  GENERATED_PG_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  GENERATED_REDIS_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  GENERATED_JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 64)
  GENERATED_ADMIN_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)

  # Заменяем плейсхолдеры на сгенерированные значения
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$GENERATED_PG_PASS|" .env
  sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$GENERATED_REDIS_PASS|" .env
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$GENERATED_JWT_SECRET|" .env
  sed -i "s|ADMIN_INITIAL_PASSWORD=.*|ADMIN_INITIAL_PASSWORD=$GENERATED_ADMIN_PASS|" .env
  sed -i "s|NODE_ENV=.*|NODE_ENV=production|" .env
  sed -i "s|APP_URL=.*|APP_URL=https://$DOMAIN|" .env
  sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://$ADMIN_DOMAIN|" .env

  echo ""
  echo "============================================"
  echo " .env создан с автоматическими паролями."
  echo " ОБЯЗАТЕЛЬНО заполните вручную:"
  echo "   - TC_API_TOKEN"
  echo "   - TC_WIDGET_TOKEN"
  echo " Файл: $PROJECT_DIR/.env"
  echo "============================================"
  echo ""
  echo " Сгенерированные credentials (СОХРАНИТЕ!):"
  echo "   POSTGRES_PASSWORD: $GENERATED_PG_PASS"
  echo "   REDIS_PASSWORD:    $GENERATED_REDIS_PASS"
  echo "   JWT_SECRET:        $GENERATED_JWT_SECRET"
  echo "   Admin password:    $GENERATED_ADMIN_PASS"
  echo ""
  echo " После заполнения TC-токенов перезапустите скрипт."
  echo "   nano $PROJECT_DIR/.env"
  exit 1
else
  echo ".env найден."
fi

# Проверяем обязательные переменные
source .env
if [ -z "${TC_API_TOKEN:-}" ] || [ -z "${TC_WIDGET_TOKEN:-}" ]; then
  echo "ОШИБКА: TC_API_TOKEN и TC_WIDGET_TOKEN обязательны."
  echo "Заполните: nano $PROJECT_DIR/.env"
  exit 1
fi

# ---- 6. Firewall (UFW) ----
echo "[6/9] Настройка файрвола..."
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP
  ufw allow 443/tcp  # HTTPS
  ufw --force enable
  echo "UFW настроен (SSH, HTTP, HTTPS)."
else
  echo "UFW не найден, пропускаем."
fi

# ---- 7. Получение SSL-сертификата (первый раз) ----
echo "[7/9] SSL-сертификат..."

# SAN-сертификат: daibilet.ru + www + admin
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Получаем SSL-сертификат для $DOMAIN, www.$DOMAIN, $ADMIN_DOMAIN..."

  # Создаём временный nginx конфиг для HTTP-only
  mkdir -p /tmp/nginx-temp
  cat > /tmp/nginx-temp/default.conf << 'NGINX_TMP'
server {
    listen 80;
    server_name daibilet.ru www.daibilet.ru admin.daibilet.ru;

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

  sleep 3  # Ждём старт nginx

  # Certbot — SAN-сертификат для всех доменов
  docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
      --webroot -w /var/www/certbot \
      -d "$DOMAIN" -d "www.$DOMAIN" -d "$ADMIN_DOMAIN" \
      --email "admin@$DOMAIN" \
      --agree-tos \
      --non-interactive

  # Убираем временный nginx
  docker stop temp-nginx && docker rm temp-nginx
  rm -rf /tmp/nginx-temp

  echo "SSL-сертификат получен (SAN: $DOMAIN, www.$DOMAIN, $ADMIN_DOMAIN)."
else
  echo "SSL-сертификат уже существует."

  # Проверяем, включает ли сертификат admin-домен
  if ! openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -text -noout 2>/dev/null | grep -q "$ADMIN_DOMAIN"; then
    echo "ВНИМАНИЕ: Текущий сертификат не включает $ADMIN_DOMAIN."
    echo "Обновляем сертификат..."
    docker run --rm \
      -v /etc/letsencrypt:/etc/letsencrypt \
      -v /var/www/certbot:/var/www/certbot \
      certbot/certbot certonly \
        --webroot -w /var/www/certbot \
        -d "$DOMAIN" -d "www.$DOMAIN" -d "$ADMIN_DOMAIN" \
        --email "admin@$DOMAIN" \
        --agree-tos \
        --non-interactive \
        --expand
    echo "Сертификат обновлён с $ADMIN_DOMAIN."
  fi
fi

# ---- 8. Volume для staging (нужен nginx для будущего staging) ----
echo "[8/10] Подготовка volumes..."
docker volume create uploads_staging 2>/dev/null || true

# ---- 9. Сборка и запуск контейнеров ----
echo "[9/10] Сборка и запуск контейнеров..."
cd "$PROJECT_DIR"
docker compose -f "$COMPOSE_FILE" up -d --build

# Ждём пока backend будет готов
echo "Ожидание готовности backend..."
MAX_WAIT=60
WAITED=0
until docker exec daibilet-backend wget -qO- http://localhost:4000/api/v1/health > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "ВНИМАНИЕ: Backend не ответил за ${MAX_WAIT}с, продолжаем..."
    break
  fi
  sleep 5
  WAITED=$((WAITED + 5))
  echo "  ...ожидание (${WAITED}с)..."
done

# ---- 10. Миграции и seed ----
echo "[10/10] Применение миграций и seed..."
docker exec daibilet-backend npx prisma migrate deploy
echo "Миграции применены."

docker exec daibilet-backend npx prisma db seed
echo "Seed выполнен."

# ---- Настройка cron для SSL renewal ----
CRON_CMD="0 */12 * * * cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE run --rm certbot renew --quiet && docker compose -f $COMPOSE_FILE exec -T nginx nginx -s reload"
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Cron для SSL renewal добавлен."
fi

echo ""
echo "=========================================="
echo " Развёртывание завершено!"
echo "=========================================="
echo ""
echo " Публичный сайт: https://$DOMAIN"
echo " Админ-панель:   https://$ADMIN_DOMAIN"
echo " API Health:     https://$DOMAIN/api/v1/health"
echo ""
echo " Полезные команды:"
echo "   Логи:     docker compose -f $COMPOSE_FILE logs -f"
echo "   Backend:  docker compose -f $COMPOSE_FILE logs -f backend"
echo "   Стоп:     docker compose -f $COMPOSE_FILE down"
echo "   Рестарт:  docker compose -f $COMPOSE_FILE restart"
echo "   Ребилд:   docker compose -f $COMPOSE_FILE up -d --build"
echo "   Миграция: docker exec daibilet-backend npx prisma migrate deploy"
echo "   Seed:     docker exec daibilet-backend npx prisma db seed"
echo "   Бэкап БД: docker exec daibilet-postgres pg_dump -U daibilet daibilet > backup_\$(date +%Y%m%d).sql"
echo ""
