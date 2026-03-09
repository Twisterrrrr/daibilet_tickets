#!/usr/bin/env bash
set -euo pipefail
cd /opt/daibilet
docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod exec backend npx prisma migrate deploy
