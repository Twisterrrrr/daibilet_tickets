#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"

cd "${PROJECT_DIR}"

[ -x scripts/prepare-ports-staging.sh ] && bash scripts/prepare-ports-staging.sh || true

echo "==> Pulling latest code..."
git pull || true

echo "==> Building and starting staging stack..."
docker compose -f deploy/staging/docker-compose.yml --env-file .env -p daibilet-staging up -d --build

echo "Staging is up. To run migrations:"
echo "  ./scripts/migrate-staging.sh"

