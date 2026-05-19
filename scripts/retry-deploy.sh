#!/bin/bash
# Script to retry deployment with network error handling

set -e

echo "=== Checking for Cached Images ==="

# Check if images exist locally
if docker images | grep -q "conference-backend.*latest"; then
    echo "Backend image found in cache"
    USE_CACHE="--no-cache"
else
    echo "Backend image not in cache, will pull from registry"
    USE_CACHE=""
fi

if docker images | grep -q "conference-frontend.*latest"; then
    echo "Frontend image found in cache"
else
    echo "Frontend image not in cache, will pull from registry"
fi

echo ""
echo "=== Attempting Build with Retry Logic ==="

# Function to retry a command
retry_build() {
    local service=$1
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts: Building $service..."
        if docker-compose -f docker-compose.prod.yml build $USE_CACHE $service; then
            echo "✓ Successfully built $service"
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                echo "✗ Build failed, waiting 10 seconds before retry..."
                sleep 10
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    echo "✗ Failed to build $service after $max_attempts attempts"
    return 1
}

# Try to build backend
if ! retry_build backend; then
    echo ""
    echo "=== Network Error: Cannot pull base images ==="
    echo "Possible solutions:"
    echo "1. Check your internet connection"
    echo "2. Check if Docker registry is accessible:"
    echo "   docker pull node:18-alpine"
    echo "3. Use cached images if available:"
    echo "   docker-compose -f docker-compose.prod.yml build backend frontend"
    echo ""
    exit 1
fi

# Try to build frontend
if ! retry_build frontend; then
    echo ""
    echo "Frontend build failed, but backend is ready"
    echo "You can start backend services:"
    echo "  docker-compose -f docker-compose.prod.yml up -d postgres redis backend"
    exit 1
fi

echo ""
echo "=== Starting All Services ==="
docker-compose -f docker-compose.prod.yml up -d

echo "=== Waiting for Services to Start ==="
sleep 15

echo "=== Running Database Migrations ==="
if docker exec conference-backend-prod npx prisma migrate deploy 2>/dev/null; then
    echo "✓ Migrations completed"
else
    echo "⚠ Migration failed, retrying..."
    sleep 5
    docker exec conference-backend-prod npx prisma migrate deploy
fi

echo ""
echo "=== Verifying Services ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Deployment Complete ==="










