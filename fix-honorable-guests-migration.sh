#!/bin/bash

# Script to fix the missing honorableGuests column in the events table
# This applies the pending migration that adds the column

set -e

echo "🔧 Fixing missing honorableGuests column in events table..."
echo ""

# Check if backend container is running
if ! docker ps --format "{{.Names}}" | grep -q "conference-backend-prod"; then
    echo "❌ Backend container is not running"
    echo "Please start the backend container first:"
    echo "  docker-compose -f docker-compose.prod.yml up -d backend"
    exit 1
fi

echo "✅ Backend container is running"
echo ""

# Method 1: Try to run Prisma migrate deploy
echo "📋 Attempting to apply pending migrations..."
if docker exec conference-backend-prod npx prisma migrate deploy 2>&1; then
    echo ""
    echo "✅ Migrations applied successfully"
else
    echo ""
    echo "⚠️  Migration deploy failed, trying direct SQL approach..."
    
    # Method 2: Apply the migration SQL directly
    echo "📋 Applying migration SQL directly..."
    if docker exec conference-backend-prod sh -c 'npx prisma db execute --stdin <<EOF
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;
EOF' 2>&1; then
        echo "✅ Column added successfully via direct SQL"
    else
        echo ""
        echo "⚠️  Direct SQL failed, trying alternative method..."
        
        # Method 3: Use psql directly
        echo "📋 Using psql to add column..."
        docker exec conference-postgres-prod psql -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_db}" -c 'ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "honorableGuests" JSONB;' 2>&1 && {
            echo "✅ Column added successfully via psql"
        } || {
            echo "❌ All methods failed"
            echo ""
            echo "Please try manually:"
            echo "  docker exec -it conference-postgres-prod psql -U conference_user -d conference_db"
            echo "  ALTER TABLE events ADD COLUMN IF NOT EXISTS \"honorableGuests\" JSONB;"
            exit 1
        }
    fi
fi

echo ""
echo "🔄 Regenerating Prisma Client..."
docker exec conference-backend-prod npx prisma generate 2>&1 || echo "⚠️  Prisma generate warning (may be okay)"

echo ""
echo "🔄 Restarting backend to apply changes..."
docker restart conference-backend-prod

echo ""
echo "⏳ Waiting for backend to restart..."
sleep 10

echo ""
echo "✅ Fix complete! The honorableGuests column should now be available."
echo ""
echo "You can verify by checking the backend logs:"
echo "  docker logs conference-backend-prod --tail 50"

