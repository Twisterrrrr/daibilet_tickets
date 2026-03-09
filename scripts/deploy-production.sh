#!/usr/bin/env bash
set -euo pipefail

cd /opt/daibilet

docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging stop nginx 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

git fetch origin
git checkout main 2>/dev/null || git checkout master 2>/dev/null || true
git pull origin main || git pull origin master || git pull || true

docker compose -f deploy/production/docker-compose.yml --env-file deploy/production/.env -p daibilet-prod up -d --build

echo "Prod up. Next: bash scripts/migrate-production.sh"
