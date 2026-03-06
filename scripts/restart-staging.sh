#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"

cd "${PROJECT_DIR}"

echo "==> Restarting staging services..."
docker compose -f deploy/staging/docker-compose.yml --env-file .env -p daibilet-staging restart

