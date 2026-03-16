#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/daibilet}"
cd "${PROJECT_DIR}"

echo "==> Checking docker containers"
docker compose -f deploy/staging/docker-compose.yml -p daibilet-staging ps

required_services=(
  "daibilet-staging-backend"
  "daibilet-staging-frontend"
  "daibilet-staging-admin"
  "daibilet-staging-postgres"
  "daibilet-staging-redis"
  "daibilet-staging-nginx"
)

for name in "${required_services[@]}"; do
  if ! docker inspect -f '{{.State.Running}}' "${name}" >/dev/null 2>&1; then
    echo "[ERROR] container ${name} not running"
    exit 1
  fi
done

echo "==> Checking docker network"
if ! docker network inspect daibilet-staging-net >/dev/null 2>&1; then
  echo "[ERROR] docker network daibilet-staging-net not found"
  exit 1
fi

echo "==> Checking ports"

check_port_host() {
  local host="$1"
  local port="$2"
  local label="$3"

  if ! nc -z "${host}" "${port}" >/dev/null 2>&1; then
    echo "[ERROR] port check failed for ${label} (${host}:${port})"
    exit 1
  fi
}

# nginx published ports on host
check_port_host "127.0.0.1" 80 "nginx:80"
check_port_host "127.0.0.1" 443 "nginx:443"

# backend / postgres / redis inside their containers
if ! docker exec daibilet-staging-backend sh -c "command -v nc >/dev/null 2>&1 || apk add --no-cache netcat-openbsd >/dev/null 2>&1; nc -z localhost 4000" >/dev/null 2>&1; then
  echo "[ERROR] backend port 4000 not accepting connections in container"
  exit 1
fi

if ! docker exec daibilet-staging-postgres sh -c "pg_isready" >/dev/null 2>&1; then
  echo "[ERROR] postgres readiness check failed (port 5432)"
  exit 1
fi

if ! docker exec daibilet-staging-redis sh -c "redis-cli ping" >/dev/null 2>&1; then
  echo "[ERROR] redis ping failed (port 6379)"
  exit 1
fi

echo "==> Checking HTTP endpoints (public)"

check_http() {
  local url="$1"
  local expect_api="$2" # "api" or "ui"

  code=$(curl -sfk -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || echo "000")
  echo "  ${url} -> ${code}"

  if [ "${expect_api}" = "api" ]; then
    if [ "${code}" != "200" ]; then
      echo "[ERROR] API health endpoint ${url} returned ${code}, expected 200"
      exit 1
    fi
  else
    case "${code}" in
      2*|3*) ;;
      *)
        echo "[ERROR] UI endpoint ${url} returned ${code}, expected 2xx/3xx"
        exit 1
        ;;
    esac
  fi
}

check_http "https://staging.daibilet.ru" "ui"
check_http "https://admin-staging.daibilet.ru" "ui"
check_http "https://api-staging.daibilet.ru/api/v1/health" "api"

echo "==> Checking backend health inside docker network"

backend_health=$(docker exec daibilet-staging-backend sh -c "apk add --no-cache curl >/dev/null 2>&1 || true; curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/api/v1/health" 2>/dev/null || echo "000")
echo "  backend internal health -> ${backend_health}"
if [ "${backend_health}" != "200" ]; then
  echo "[ERROR] backend internal health returned ${backend_health}, expected 200"
  exit 1
fi

echo "==> Checking Postgres (pg_isready)"
if ! docker exec daibilet-staging-postgres pg_isready >/dev/null 2>&1; then
  echo "[ERROR] pg_isready failed for daibilet-staging-postgres"
  exit 1
fi

echo "==> Checking Redis (redis-cli ping)"
if ! docker exec daibilet-staging-redis redis-cli ping | grep -q "PONG"; then
  echo "[ERROR] redis-cli ping did not return PONG"
  exit 1
fi

echo "All staging health checks passed"

