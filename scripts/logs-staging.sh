#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${PROJECT_DIR}"

ENV_FILE="deploy/staging/.env"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"

docker compose -f deploy/staging/docker-compose.yml --env-file "$ENV_FILE" -p daibilet-staging logs -f

