#!/bin/bash

# Diagnostic script for backend connection issues

echo "=========================================="
echo "🔍 Backend Connection Diagnostic"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found. Please run from project root."
    exit 1
fi

echo "📋 Step 1: Check all container statuses..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📋 Step 2: Check backend container specifically..."
docker-compose -f docker-compose.prod.yml ps backend

echo ""
echo "📋 Step 3: Check backend logs (last 50 lines)..."
docker-compose -f docker-compose.prod.yml logs backend --tail 50

echo ""
echo "📋 Step 4: Test backend health from inside container..."
if docker-compose -f docker-compose.prod.yml exec -T backend curl -f http://localhost:3001/health 2>/dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

echo ""
echo "📋 Step 5: Test backend from frontend container..."
if docker-compose -f docker-compose.prod.yml exec -T frontend curl -f http://backend:3001/health 2>/dev/null; then
    echo "✅ Frontend can reach backend via service name 'backend'"
else
    echo "❌ Frontend cannot reach backend via service name 'backend'"
fi

echo ""
echo "📋 Step 6: Check network connectivity..."
docker-compose -f docker-compose.prod.yml exec -T frontend ping -c 2 backend 2>/dev/null && echo "✅ Network connectivity OK" || echo "❌ Network connectivity failed"

echo ""
echo "📋 Step 7: Check environment variables in frontend..."
docker-compose -f docker-compose.prod.yml exec -T frontend env | grep -E "SERVER_API_URL|BACKEND" || echo "No SERVER_API_URL found"

echo ""
echo "=========================================="
echo "✅ Diagnostic complete"
echo "=========================================="

