#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"

cd "${PROJECT_DIR}"

docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging logs -f

