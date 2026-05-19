#!/bin/sh
# Script to run Prisma migrations in Docker container
# Usage: ./scripts/run-migration.sh

set -e

echo "🔄 Running Prisma migrations..."

# Check if running in Docker container
if [ -f /.dockerenv ]; then
    echo "✅ Running inside Docker container"
    cd /app
    npx prisma migrate deploy
    echo "✅ Migrations completed successfully"
else
    echo "❌ This script should be run inside the Docker container"
    echo "Please use: docker-compose -f docker-compose.prod.yml exec backend sh /app/scripts/run-migration.sh"
    exit 1
fi

