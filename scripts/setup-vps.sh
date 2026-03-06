#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/daibilet"

echo "==> Installing Docker, docker-compose, git, curl..."
apt update
apt install -y docker.io docker-compose-plugin git curl

echo "==> Enabling Docker service..."
systemctl enable docker
systemctl start docker

echo "==> Creating project directory ${PROJECT_DIR} if not exists..."
mkdir -p "${PROJECT_DIR}"

echo ""
echo "Project directory ready at ${PROJECT_DIR}."
echo "Clone repo (if not yet):"
echo "  cd ${PROJECT_DIR} && git clone <repo_url> ."

