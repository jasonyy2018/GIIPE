#!/bin/bash

# Quick fix script to add the missing honorableGuests column
# This bypasses Prisma migrations and directly applies the SQL

set -e

echo "🔧 Adding honorableGuests column to events table..."
echo ""

# Get database credentials from environment or use defaults
POSTGRES_USER=${POSTGRES_USER:-conference_user}
POSTGRES_DB=${POSTGRES_DB:-conference_db}

# Check if postgres container is running
if ! docker ps --format "{{.Names}}" | grep -q "conference-postgres-prod"; then
    echo "❌ PostgreSQL container is not running"
    exit 1
fi

echo "✅ PostgreSQL container is running"
echo ""

# Add the column directly
echo "📋 Executing SQL to add column..."
docker exec conference-postgres-prod psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;' 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Column added successfully!"
    echo ""
    echo "🔄 Regenerating Prisma Client..."
    docker exec conference-backend-prod npx prisma generate 2>&1 | tail -5
    
    echo ""
    echo "🔄 Restarting backend..."
    docker restart conference-backend-prod
    
    echo ""
    echo "⏳ Waiting for backend to restart..."
    sleep 10
    
    echo ""
    echo "✅ Fix complete! The honorableGuests column has been added."
    echo ""
    echo "You can verify by checking the backend logs:"
    echo "  docker logs conference-backend-prod --tail 50"
else
    echo ""
    echo "❌ Failed to add column"
    exit 1
fi

