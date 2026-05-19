#!/bin/bash

# Script to diagnose 503 errors in nginx
# This script checks nginx configuration, logs, and frontend service status

echo "=== Checking Nginx Configuration ==="
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

echo ""
echo "=== Checking Frontend Service Status ==="
docker-compose -f docker-compose.prod.yml ps frontend

echo ""
echo "=== Checking Frontend Health ==="
docker-compose -f docker-compose.prod.yml exec frontend wget -qO- http://127.0.0.1:3000/ | head -20

echo ""
echo "=== Checking Nginx Error Log (last 50 lines) ==="
docker-compose -f docker-compose.prod.yml exec nginx tail -50 /var/log/nginx/error.log

echo ""
echo "=== Checking Nginx Access Log for 503 errors (last 20 lines) ==="
docker-compose -f docker-compose.prod.yml exec nginx tail -20 /var/log/nginx/access.log | grep -E "503|_next"

echo ""
echo "=== Testing Frontend Connection from Nginx Container ==="
docker-compose -f docker-compose.prod.yml exec nginx wget -qO- --timeout=5 http://frontend:3000/ | head -20

echo ""
echo "=== Checking DNS Resolution ==="
docker-compose -f docker-compose.prod.yml exec nginx nslookup frontend

echo ""
echo "=== Checking Network Connectivity ==="
docker-compose -f docker-compose.prod.yml exec nginx ping -c 3 frontend

