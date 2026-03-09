#!/usr/bin/env bash
# VPS bootstrap для staging — Ubuntu 22.04/24.04 (Timeweb Cloud)
# Запуск: ssh root@213.171.7.16 'bash -s' < scripts/setup-vps.sh

set -euo pipefail

PROJECT_DIR="/opt/daibilet"

echo "==> [1/5] Installing Docker, docker-compose-plugin, git, curl, ca-certificates..."
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
apt-get install -y git curl

echo "==> [2/5] Enabling Docker..."
systemctl enable docker
systemctl start docker

echo "==> [3/5] Creating directory structure..."
mkdir -p "${PROJECT_DIR}"
mkdir -p "${PROJECT_DIR}/backups"
mkdir -p "${PROJECT_DIR}/deploy/nginx/certbot/www"
mkdir -p "${PROJECT_DIR}/deploy/nginx/certbot/conf"

echo "==> [4/5] Adding current user to docker group (if not root)..."
if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER" 2>/dev/null || true
fi

echo "==> [5/5] Done."
echo ""
echo "Next steps:"
echo "  1. cd ${PROJECT_DIR} && git clone <repo_url> .  # or git pull if exists"
echo "  2. git checkout staging"
echo "  3. cp deploy/staging/.env.example deploy/staging/.env && edit deploy/staging/.env (TC_API_TOKEN, TC_WIDGET_TOKEN from local .env)"
echo "  4. bash scripts/bootstrap-staging.sh"
echo ""
