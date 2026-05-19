#!/bin/bash

# GIIPE Honorable Guests Feature Rebuild Script
# This script rebuilds both backend and frontend for the honorable guests feature update
# Includes database migration
# Usage: ./rebuild-honorable-guests-feature.sh [prod|dev]

set -e  # Exit on error

ENVIRONMENT=${1:-prod}  # Default to production

echo "=== GIIPE Honorable Guests Feature Rebuild ==="
echo "Environment: $ENVIRONMENT"
echo ""
echo "This update includes:"
echo "  - Database schema change (String[] -> Json)"
echo "  - Backend DTO and service updates"
echo "  - Frontend component updates (filename parsing)"
echo ""

# Determine which compose file to use
if [ "$ENVIRONMENT" = "dev" ]; then
    COMPOSE_FILE="docker-compose.yml"
    BACKEND_CONTAINER="conference_backend"
    FRONTEND_CONTAINER="conference_frontend"
    echo "Using development configuration"
else
    COMPOSE_FILE="docker-compose.prod.yml"
    BACKEND_CONTAINER="conference-backend-prod"
    FRONTEND_CONTAINER="conference-frontend-prod"
    echo "Using production configuration"
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found!"
    exit 1
fi

echo ""
echo "Step 1: Running database migration..."
echo "  This updates the honorableGuests column from TEXT[] to JSONB"
# Run migration inside backend container
if docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "  Running migration in existing backend container..."
    docker exec "$BACKEND_CONTAINER" npx prisma migrate deploy || {
        echo "  Migration failed, trying alternative method..."
        # Alternative: run migration from host if prisma is available
        cd backend && npx prisma migrate deploy && cd .. || {
            echo "  ⚠ Warning: Could not run migration automatically"
            echo "  Please run manually: cd backend && npx prisma migrate deploy"
        }
    }
else
    echo "  Backend container not running, will run migration after backend starts"
    MIGRATION_PENDING=true
fi

echo ""
echo "Step 2: Building backend with updated DTOs and services..."
docker-compose -f "$COMPOSE_FILE" build --no-cache backend

echo ""
echo "Step 3: Updating backend container (zero downtime)..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps backend

echo ""
echo "Step 4: Waiting for backend to be ready..."
sleep 5

# Run migration if backend was not running before
if [ "$MIGRATION_PENDING" = true ]; then
    echo "  Running database migration now..."
    sleep 3  # Give backend more time to start
    docker exec "$BACKEND_CONTAINER" npx prisma migrate deploy || {
        echo "  ⚠ Warning: Migration may have failed"
        echo "  Check backend logs: docker-compose -f $COMPOSE_FILE logs backend"
    }
fi

echo ""
echo "Step 5: Verifying backend health..."
if docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "  ✓ Backend container is running"
    # Check health if available
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$BACKEND_CONTAINER" 2>/dev/null || echo "no-healthcheck")
    if [ "$HEALTH" != "no-healthcheck" ]; then
        echo "  Health status: $HEALTH"
    fi
else
    echo "  ✗ Backend container failed to start"
    echo "  Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 backend
    exit 1
fi

echo ""
echo "Step 6: Building frontend with updated components..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend

echo ""
echo "Step 7: Updating frontend container (zero downtime)..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend

echo ""
echo "Step 8: Waiting for frontend to be ready..."
sleep 5

echo ""
echo "Step 9: Verifying frontend health..."
if docker ps | grep -q "$FRONTEND_CONTAINER"; then
    echo "  ✓ Frontend container is running"
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$FRONTEND_CONTAINER" 2>/dev/null || echo "no-healthcheck")
    if [ "$HEALTH" != "no-healthcheck" ]; then
        echo "  Health status: $HEALTH"
    fi
else
    echo "  ✗ Frontend container failed to start"
    echo "  Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 frontend
    exit 1
fi

echo ""
echo "Step 10: Verifying public directory mapping..."
if docker exec "$FRONTEND_CONTAINER" test -d /app/public; then
    echo "  ✓ Frontend public directory is accessible"
    docker exec "$FRONTEND_CONTAINER" ls -la /app/public | head -5
else
    echo "  ⚠ Warning: Frontend public directory not found"
fi

echo ""
echo "Step 11: Verifying database schema..."
# Check if migration was applied
if docker exec "$BACKEND_CONTAINER" npx prisma db execute --stdin <<< "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'honorableGuests';" 2>/dev/null | grep -q "jsonb"; then
    echo "  ✓ Database schema updated (honorableGuests is JSONB)"
else
    echo "  ⚠ Warning: Could not verify database schema"
    echo "  Please verify manually that honorableGuests column is JSONB type"
fi

echo ""
echo "=== Rebuild Complete ==="
echo ""
echo "Container status:"
docker-compose -f "$COMPOSE_FILE" ps
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
echo "  Backend: docker-compose -f $COMPOSE_FILE logs -f backend"
echo "  Frontend: docker-compose -f $COMPOSE_FILE logs -f frontend"
echo ""
echo "To verify the feature:"
echo "  1. Log into admin panel"
echo "  2. Create or edit an event"
echo "  3. Upload guest photos with filenames like 'John Doe - Professor.jpg'"
echo "  4. Verify that name and title are auto-filled from filename"
echo "  5. Check event details page to see names and titles under photos"

