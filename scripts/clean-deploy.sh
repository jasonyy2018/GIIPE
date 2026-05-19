#!/bin/bash
# Script to clean up all containers and deploy fresh

set -e

echo "=== Cleaning Up All Containers ==="

# Stop all services
echo "Stopping all services..."
docker-compose -f docker-compose.prod.yml stop 2>/dev/null || true

# Remove all containers
echo "Removing all containers..."
docker-compose -f docker-compose.prod.yml rm -f 2>/dev/null || true

# Force remove containers by name if they still exist
echo "Force removing containers by name..."
docker rm -f conference-backend-prod conference-frontend-prod conference-postgres-prod conference-redis-prod conference-nginx-prod 2>/dev/null || true

# Remove any orphaned containers with similar names
docker ps -a --filter "name=conference-" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true

echo "=== Building Backend ==="
docker-compose -f docker-compose.prod.yml build --no-cache backend

echo "=== Building Frontend ==="
docker-compose -f docker-compose.prod.yml build --no-cache frontend

echo "=== Starting All Services ==="
docker-compose -f docker-compose.prod.yml up -d

echo "=== Waiting for Services to Start ==="
sleep 15

echo "=== Running Database Migrations ==="
docker exec conference-backend-prod npx prisma migrate deploy || {
    echo "Migration failed, but continuing..."
    sleep 5
    docker exec conference-backend-prod npx prisma migrate deploy
}

echo "=== Verifying Services ==="
docker-compose -f docker-compose.prod.yml ps

echo "=== Checking Service Health ==="
echo "Backend health:"
docker exec conference-backend-prod curl -f http://localhost:3001/api/health || echo "Backend health check failed"

echo ""
echo "=== Deployment Complete ==="
echo "Services should be running. Check logs with:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"

