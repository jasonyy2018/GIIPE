#!/bin/sh
set -e

# Fix permissions for uploads directory on container startup
# This script runs as root initially, fixes permissions, then switches to nestjs user

echo "🔧 Fixing permissions for uploads directory..."

# Ensure directories exist
mkdir -p /app/uploads/images /app/uploads/documents /app/uploads/pdfs /app/uploads/avatars

# Fix ownership and permissions (we're running as root initially)
chown -R nestjs:nodejs /app/uploads
chmod -R 755 /app/uploads
# Ensure images directory is writable
chmod 777 /app/uploads/images

echo "✅ Permissions fixed"
echo "📋 Uploads directory permissions:"
ls -la /app/uploads | head -5

# Run database migrations (as nestjs user so app can start with correct schema)
echo "🔄 Running database migrations..."
MIGRATE_OUTPUT=$(su-exec nestjs sh -c "cd /app && pnpm prisma migrate deploy 2>&1") || true
if echo "$MIGRATE_OUTPUT" | grep -q "P3009"; then
  echo "⚠️ Prisma P3009: Failed migrations detected. New migrations will not be applied."
  echo "   To fix: connect to backend container and run:"
  echo "   pnpm prisma migrate resolve --applied <migration_name>   # if migration was applied"
  echo "   or: pnpm prisma migrate resolve --rolled-back <migration_name>   # then re-run deploy"
  echo "   Then restart the backend container."
elif echo "$MIGRATE_OUTPUT" | grep -q "Applied"; then
  echo "✅ Migrations complete"
else
  echo "⚠️ Migrate deploy failed (non-fatal if DB already up to date)"
fi

# Switch to nestjs user and start the application
echo "🔄 Switching to nestjs user and starting application..."
exec su-exec nestjs "$@"

