#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/opt/daibilet"

cd "${PROJECT_DIR}"

export DEPLOY_BRANCH="staging"
export STAGING_BACKUP_BEFORE_DEPLOY="1"

bash scripts/remote-deploy-staging.sh

