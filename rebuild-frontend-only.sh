#!/bin/bash

# GIIPE Frontend-Only Rebuild Script (Zero Downtime)
# Rebuilds only the frontend container without affecting other services
# Usage: ./rebuild-frontend-only.sh [prod|dev]

set -e

ENVIRONMENT=${1:-prod}

if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER_NAME="conference_frontend"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    CONTAINER_NAME="conference-frontend-prod"
fi

echo "=== Rebuilding Frontend Container Only ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Build new image (old container keeps running)
echo "Building new frontend image..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend

# Update container with zero downtime
echo "Updating container (zero downtime)..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend

# Wait a moment for container to start
sleep 3

# Verify
echo ""
echo "Verifying new container..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✓ Container is running"
    echo ""
    echo "Container info:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "Verifying public directory mapping..."
    if docker exec "$CONTAINER_NAME" test -d /app/public; then
        echo "✓ Public directory mapped successfully"
        docker exec "$CONTAINER_NAME" ls -la /app/public | head -5
    else
        echo "⚠ Public directory not found"
    fi
else
    echo "✗ Container failed to start"
    echo "Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=30 frontend
    exit 1
fi

echo ""
echo "=== Rebuild Complete ==="

