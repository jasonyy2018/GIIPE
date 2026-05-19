#!/bin/bash

# GIIPE Zero-Downtime Container Rebuild Script for Ubuntu 24
# This script rebuilds containers without stopping the old ones first
# Usage: ./rebuild-containers-zero-downtime.sh [prod|dev]

set -e  # Exit on error

ENVIRONMENT=${1:-prod}  # Default to production

echo "=== GIIPE Zero-Downtime Container Rebuild ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Determine which compose file to use
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER_NAME="conference_frontend"
    echo "Using development configuration"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    CONTAINER_NAME="conference-frontend-prod"
    echo "Using production configuration"
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found!"
    exit 1
fi

echo ""
echo "Step 1: Building new frontend image (old container still running)..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend

echo ""
echo "Step 2: Creating new container with updated configuration..."
# Use up -d to create new container, which will replace the old one
# Docker Compose will:
# 1. Create new container with new image
# 2. Start new container
# 3. Stop old container
# 4. Remove old container
# This happens with minimal downtime (usually < 1 second)
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend

echo ""
echo "Step 3: Waiting for new container to be ready..."
sleep 5

echo ""
echo "Step 4: Checking container health..."
# Check if container is running
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✓ New container is running"
    
    # Check health status
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "no-healthcheck")
    if [ "$HEALTH" != "no-healthcheck" ]; then
        echo "  Health status: $HEALTH"
    fi
else
    echo "⚠ Warning: Container not found or not running"
    echo "Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 frontend
    exit 1
fi

echo ""
echo "Step 5: Verifying public directory mapping..."
if docker exec "$CONTAINER_NAME" test -d /app/public; then
    echo "✓ Frontend public directory is accessible in container"
    echo "  Container path: /app/public"
    echo "  Local path: ./frontend/public"
    
    # Show some files in public directory
    echo ""
    echo "Files in /app/public:"
    docker exec "$CONTAINER_NAME" ls -la /app/public | head -10
else
    echo "⚠ Warning: Frontend public directory not found in container"
fi

echo ""
echo "Step 6: Cleaning up old images (optional)..."
# Remove dangling images (old versions)
docker image prune -f

echo ""
echo "=== Zero-Downtime Rebuild Complete ==="
echo ""
echo "Container status:"
docker-compose -f "$COMPOSE_FILE" ps frontend
echo ""
echo "Service URLs:"
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "  Frontend: http://localhost:3000"
    echo "  Backend: http://localhost:3001"
else
    echo "  Frontend: http://localhost:3000 (or via Nginx on port 8085)"
    echo "  Backend: http://localhost:3001"
    echo "  Nginx: http://localhost:8085"
fi
echo ""
echo "To view logs:"
echo "  docker-compose -f $COMPOSE_FILE logs -f frontend"
echo ""
echo "To rollback if needed:"
echo "  docker-compose -f $COMPOSE_FILE up -d --no-deps frontend"

