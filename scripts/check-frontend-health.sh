#!/bin/bash
# Script to check frontend container health and logs

echo "=== Checking Frontend Container Status ==="
docker ps -a | grep conference-frontend-prod

echo ""
echo "=== Frontend Container Health Status ==="
docker inspect --format='{{.State.Health.Status}}' conference-frontend-prod 2>/dev/null || echo "No health check configured"

echo ""
echo "=== Recent Frontend Logs (last 50 lines) ==="
docker logs --tail 50 conference-frontend-prod 2>&1

echo ""
echo "=== Testing Frontend Endpoints ==="
echo "Testing http://127.0.0.1:3000/ ..."
docker exec conference-frontend-prod wget --spider --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -5 || echo "Failed to connect"

echo ""
echo "Testing http://127.0.0.1:3000/api/health ..."
docker exec conference-frontend-prod wget --spider --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | head -5 || echo "Failed to connect"

echo ""
echo "=== Checking if Node.js process is running ==="
docker exec conference-frontend-prod pgrep -f 'node server.js' && echo "✓ Node.js process found" || echo "✗ Node.js process not found"

echo ""
echo "=== Container Resource Usage ==="
docker stats --no-stream conference-frontend-prod 2>/dev/null || echo "Cannot get stats"










