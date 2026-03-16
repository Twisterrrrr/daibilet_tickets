#!/usr/bin/env bash
# ============================================
# Сборка образов backend, frontend, admin и пуш в registry.
# На staging затем только pull + up (без сборки, без 429 и без проблем monorepo).
# Запуск: из корня репо, после docker login в нужный registry.
#
#   export DOCKER_REGISTRY=ghcr.io/Twisterrrrr   # или docker.io/username
#   bash scripts/docker-build-push-staging.sh
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Registry без слэша в конце, тег образа
DOCKER_REGISTRY="${DOCKER_REGISTRY:?Set DOCKER_REGISTRY (e.g. ghcr.io/Twisterrrrr or docker.io/username)}"
DOCKER_IMAGE_TAG="${DOCKER_IMAGE_TAG:-staging}"

echo "=== Сборка и пуш образов (registry=$DOCKER_REGISTRY, tag=$DOCKER_IMAGE_TAG) ==="

for svc in backend frontend admin; do
  name="daibilet-$svc"
  full="$DOCKER_REGISTRY/$name:$DOCKER_IMAGE_TAG"
  echo "--- Build $name ---"
  docker build -t "$full" -f "Dockerfile.$svc" .
  echo "--- Push $full ---"
  docker push "$full"
done

echo ""
echo "Готово. На сервере задайте в .env:"
echo "  DOCKER_REGISTRY=$DOCKER_REGISTRY"
echo "  DOCKER_IMAGE_TAG=$DOCKER_IMAGE_TAG"
echo "и запустите deploy (будет pull, без build)."
