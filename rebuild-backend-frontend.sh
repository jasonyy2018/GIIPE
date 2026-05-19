#!/bin/bash

# GIIPE Backend + Frontend Rebuild Script (Zero Downtime)
# Rebuilds both backend and frontend containers
# Usage: ./rebuild-backend-frontend.sh [prod|dev]

set -e

ENVIRONMENT=${1:-prod}

if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    BACKEND_CONTAINER="conference_backend"
    FRONTEND_CONTAINER="conference_frontend"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    BACKEND_CONTAINER="conference-backend-prod"
    FRONTEND_CONTAINER="conference-frontend-prod"
fi

echo "=== Rebuilding Backend and Frontend ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Build backend
echo "Building backend..."
docker-compose -f "$COMPOSE_FILE" build --no-cache backend

# Step 2: Update backend (zero downtime)
echo "Updating backend container..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend

# Wait for backend
echo "Waiting for backend to be ready..."
sleep 5

# Step 3: Run database migration
echo "Running database migration..."
docker exec "$BACKEND_CONTAINER" npx prisma migrate deploy || {
    echo "⚠ Migration may have failed, check logs"
}

# Step 4: Build frontend
echo "Building frontend..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend

# Step 5: Update frontend (zero downtime)
echo "Updating frontend container..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend

# Wait for frontend
echo "Waiting for frontend to be ready..."
sleep 5

# Verify
echo ""
echo "Verifying containers..."
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "=== Rebuild Complete ==="

