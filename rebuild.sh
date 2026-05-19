#!/bin/bash

# GIIPE Production Rebuild Script
# Uses pnpm + node:22-alpine for all services
# Run with: bash rebuild.sh  (from GIIPE repo root, or from parent dir that contains GIIPE)
# On Windows use WSL or Git Bash.

set -e

# Ensure we run from GIIPE repo root (where docker-compose.prod.yml and .env.production live)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "${SCRIPT_DIR}/docker-compose.prod.yml" ]; then
  ROOT="${SCRIPT_DIR}"
elif [ -f "${SCRIPT_DIR}/GIIPE/docker-compose.prod.yml" ]; then
  ROOT="${SCRIPT_DIR}/GIIPE"
else
  echo "❌ docker-compose.prod.yml not found. Run this script from GIIPE root or from its parent directory."
  exit 1
fi
cd "$ROOT"
echo "📂 Working directory: $(pwd)"

echo "🚀 Starting GIIPE System Rebuild..."

# Prefer Docker Compose V2 (docker compose) if available
if docker compose version &>/dev/null; then
  DCO="docker compose"
else
  DCO="docker-compose"
fi

# 1. Pull latest code (only if this is a git repo)
#    Skip with: SKIP_GIT_PULL=1 ./rebuild.sh  (e.g. CI artifact deploy or you already pulled)
if git rev-parse --git-dir &>/dev/null; then
  if [ -n "${SKIP_GIT_PULL}" ]; then
    echo "📦 SKIP_GIT_PULL=1: skipping git pull."
  else
    echo "📦 Pulling latest changes from git..."
    git pull --ff-only || { echo "❌ git pull --ff-only failed (merge/conflict?). Fix git state or use SKIP_GIT_PULL=1."; exit 1; }
  fi
else
  echo "⚠️ Not a git repo, skipping git pull."
fi

# 2. Clean up host artifacts (optional)
# Default: DO NOT remove node_modules/lockfiles to keep docker build cache effective.
# Use CLEAN_HOST=1 to enable.
if [ -n "${CLEAN_HOST}" ]; then
  echo "🧹 CLEAN_HOST=1: Cleaning old node_modules and lockfiles on host..."
  find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
  find . -name "package-lock.json" -not -path "./.git/*" -delete 2>/dev/null || true
else
  echo "🧹 CLEAN_HOST not set: skipping host node_modules cleanup (faster rebuild)."
fi

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo "🧩 Using compose file: ${COMPOSE_FILE}"
echo "🧩 Using env file    : ${ENV_FILE}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "❌ ${ENV_FILE} not found. Please create it based on backend/.env.production.example and frontend/.env.production.example."
  exit 1
fi

# When server cannot reach Docker Hub (e.g. no route to host), use a mirror:
#   USE_DOCKER_MIRROR=1 ./rebuild.sh
# Or configure Docker daemon: /etc/docker/daemon.json "registry-mirrors": ["https://docker.m.daocloud.io"]
BUILD_ARGS=""
if [ -n "${USE_DOCKER_MIRROR}" ]; then
  echo "🌐 Using Docker Hub mirror for base image (USE_DOCKER_MIRROR=1)..."
  BUILD_ARGS="--build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine"
fi

echo "🛠️ Rebuilding Docker containers (production, pnpm + node:22-alpine)..."
BUILD_FLAGS=""
if [ -n "${USE_NO_CACHE}" ]; then
  echo "🧊 USE_NO_CACHE=1: disabling build cache."
  BUILD_FLAGS="--no-cache"
fi
$DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build $BUILD_FLAGS $BUILD_ARGS

echo "🔄 Restarting services (production stack)..."
$DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down
$DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

# 3. Wait for backend to accept traffic (reduces flaky migrate right after up)
echo "⏳ Waiting for backend health (http://localhost:3001/health inside container)..."
BACKEND_READY=0
for _i in $(seq 1 45); do
  if $DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T backend curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 2
done
if [ "$BACKEND_READY" -eq 1 ]; then
  echo "✅ Backend health OK."
else
  echo "⚠️ Backend not healthy within ~90s; migration step may fail — check: $DCO --env-file ${ENV_FILE} -f ${COMPOSE_FILE} logs backend"
fi

# 4. Run database migrations (entrypoint also runs this; doing it here ensures one-shot fix)
echo "🔄 Running database migrations..."
if $DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T backend pnpm prisma migrate deploy; then
  echo "✅ Migrations applied (or already up to date)."
else
  echo "⚠️ Migrate deploy failed or backend not ready; check output above. Entrypoint will retry on next backend start."
fi

# 5. Check status
echo "🔍 Checking container status..."
$DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "📝 Recent Backend Logs (Checking for Environment Errors):"
$DCO --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail=20 backend

echo "✨ Rebuild Complete! Please visit https://www.giip.info (via nginx) or http://localhost:3000 (direct) to verify."
echo "If you see errors above, double-check ${ENV_FILE} for missing or incorrect variables (especially SERVER_API_URL, NEXT_PUBLIC_API_URL, DB/REDIS settings)."
echo "If you added DB schema changes (e.g. feeCents), run: $DCO --env-file ${ENV_FILE} -f ${COMPOSE_FILE} exec backend pnpm prisma migrate deploy"
echo "If backend logs show Prisma P3009 (failed migrations), run: $DCO --env-file ${ENV_FILE} -f ${COMPOSE_FILE} exec backend pnpm prisma migrate resolve --applied <migration_name> then restart backend."
