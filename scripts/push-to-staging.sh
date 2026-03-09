#!/usr/bin/env bash
# ============================================
# Push-to-Staging: rsync + удалённый деплой
# Локально: ssh-agent, проверка .env, sync, deploy
# ============================================
set -e

STAGING_SERVER="${STAGING_SERVER:-root@213.171.7.16}"
REMOTE_PATH="/opt/daibilet"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- 0. SSH-agent и ключ (Git Bash на Windows) ---
if [ -z "$SSH_AUTH_SOCK" ] || ! ssh-add -l &>/dev/null; then
  eval $(ssh-agent -s) 2>/dev/null || true
  ssh-add ~/.ssh/id_rsa 2>/dev/null || ssh-add ~/.ssh/id_ed25519 2>/dev/null || true
fi

# --- 1. Локальная проверка ---
if [[ ! -f "$REPO_ROOT/deploy/staging/.env" ]]; then
  echo "Ошибка: deploy/staging/.env не найден."
  echo "Скопируйте deploy/staging/.env.example в deploy/staging/.env и заполните значения."
  exit 1
fi

# --- 2. Проверка SSH ---
echo "=== Проверка SSH: $STAGING_SERVER ==="
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$STAGING_SERVER" "echo OK" &>/dev/null; then
  echo "Ошибка: SSH не подключен. Проверьте ключи: ssh-add -l"
  echo "Тест: ssh $STAGING_SERVER"
  exit 1
fi

# --- 3. Синхронизация (rsync или tar+ssh fallback) ---
cd "$REPO_ROOT"
if command -v rsync &>/dev/null; then
  echo "=== Rsync на $STAGING_SERVER:$REMOTE_PATH ==="
  rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='.pnpm-store' \
    --include='deploy/staging/.env' \
    --exclude='.env' \
    --exclude='.env.*' \
    ./ "$STAGING_SERVER:$REMOTE_PATH/"
else
  echo "=== Tar+SSH (rsync не найден) на $STAGING_SERVER:$REMOTE_PATH ==="
  ssh "$STAGING_SERVER" "mkdir -p $REMOTE_PATH"
  tar -cf - \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='.pnpm-store' \
    --exclude='.env' \
    --exclude='.env.*' \
    . | ssh "$STAGING_SERVER" "cd $REMOTE_PATH && tar -xf -"
  # deploy/staging/.env — отдельно (исключён из tar)
  scp deploy/staging/.env "$STAGING_SERVER:$REMOTE_PATH/deploy/staging/.env"
fi

# --- 4. Исправление CRLF→LF (Windows) на сервере ---
ssh "$STAGING_SERVER" "sed -i 's/\\r$//' $REMOTE_PATH/deploy/staging/deploy.sh 2>/dev/null || true"

# --- 5. Удалённое выполнение: docker compose down -> up -d --build -> migrate -> ps ---
echo ""
echo "=== Запуск deploy на сервере ==="
ssh "$STAGING_SERVER" "cd $REMOTE_PATH && bash deploy/staging/deploy.sh"

echo ""
echo "Деплой завершён."
