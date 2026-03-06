#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"

cd "${PROJECT_DIR}"

echo "==> Running Prisma migrations on staging..."
docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging exec backend npx prisma migrate deploy

