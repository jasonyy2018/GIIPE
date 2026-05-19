#!/bin/bash
# Script to fix container recreation issues and deploy

set -e

echo "=== Fixing Container Issues ==="

# Stop and remove problematic containers
echo "Stopping and removing old containers..."
docker-compose -f docker-compose.prod.yml stop backend frontend 2>/dev/null || true
docker-compose -f docker-compose.prod.yml rm -f backend frontend 2>/dev/null || true

# Remove containers by name if they still exist
docker rm -f conference-backend-prod conference-frontend-prod 2>/dev/null || true

echo "=== Building Backend ==="
docker-compose -f docker-compose.prod.yml build --no-cache backend

echo "=== Starting Backend ==="
docker-compose -f docker-compose.prod.yml up -d backend

echo "=== Waiting for Backend to Start ==="
sleep 10

echo "=== Running Database Migrations ==="
docker exec conference-backend-prod npx prisma migrate deploy || {
    echo "Migration failed, but continuing..."
}

echo "=== Building Frontend ==="
docker-compose -f docker-compose.prod.yml build --no-cache frontend

echo "=== Starting Frontend ==="
docker-compose -f docker-compose.prod.yml up -d frontend

echo "=== Waiting for Services ==="
sleep 5

echo "=== Verifying Services ==="
docker-compose -f docker-compose.prod.yml ps

echo "=== Deployment Complete ==="

