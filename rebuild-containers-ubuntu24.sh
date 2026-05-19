#!/bin/bash

# GIIPE Container Rebuild Script for Ubuntu 24
# This script rebuilds containers after updating docker-compose configuration
# Usage: ./rebuild-containers-ubuntu24.sh [dev|prod]

set -e  # Exit on error

ENVIRONMENT=${1:-prod}  # Default to production

echo "=== GIIPE Container Rebuild Script ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Determine which compose file to use
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo "Using development configuration"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "Using production configuration"
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found!"
    exit 1
fi

echo ""
echo "Step 1: Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down

echo ""
echo "Step 2: Removing old frontend container and image (if exists)..."
docker-compose -f "$COMPOSE_FILE" rm -f frontend 2>/dev/null || true
docker rmi conference-frontend:latest 2>/dev/null || true
docker rmi conference_frontend 2>/dev/null || true

echo ""
echo "Step 3: Building frontend image with updated configuration..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend

echo ""
echo "Step 4: Starting all services..."
docker-compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Step 5: Waiting for services to be ready..."
sleep 10

echo ""
echo "Step 6: Checking container status..."
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "Step 7: Checking frontend public directory mapping..."
if [ "$ENVIRONMENT" = "dev" ]; then
    CONTAINER_NAME="conference_frontend"
else
    CONTAINER_NAME="conference-frontend-prod"
fi

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
echo "=== Rebuild Complete ==="
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
echo "To verify public directory mapping:"
echo "  docker exec $CONTAINER_NAME ls -la /app/public"

