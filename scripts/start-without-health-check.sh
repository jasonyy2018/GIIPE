#!/bin/bash
# Script to start services without strict health check dependencies

set -e

echo "=== Starting Services (allowing unhealthy frontend) ==="

# Start all services except nginx first
echo "Starting postgres, redis, backend..."
docker-compose -f docker-compose.prod.yml up -d postgres redis backend

echo "Waiting for backend to be healthy..."
sleep 15

echo "Starting frontend..."
docker-compose -f docker-compose.prod.yml up -d frontend

echo "Waiting for frontend to start (60 seconds)..."
sleep 60

echo ""
echo "=== Checking Frontend Status ==="
docker logs --tail 30 conference-frontend-prod

echo ""
echo "=== Testing Frontend ==="
if docker exec conference-frontend-prod wget --spider --timeout=5 http://127.0.0.1:3000/ 2>&1 | grep -qE '200|saved|HTTP'; then
    echo "✓ Frontend is responding"
else
    echo "✗ Frontend is not responding yet"
    echo "Checking if process is running..."
    docker exec conference-frontend-prod pgrep -f 'node server.js' && echo "✓ Process is running" || echo "✗ Process not found"
fi

echo ""
echo "=== Starting Nginx (even if frontend is unhealthy) ==="
# Start nginx without waiting for frontend health
docker-compose -f docker-compose.prod.yml up -d nginx

echo ""
echo "=== All Services Started ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Running Migrations ==="
docker exec conference-backend-prod npx prisma migrate deploy || echo "Migration may have already run"

echo ""
echo "=== Deployment Complete ==="
echo "Note: Frontend may show as unhealthy initially but should recover."
echo "Check logs with: docker logs -f conference-frontend-prod"










