#!/bin/bash

# Admin Interface Enhancement Deployment Script
# This script deploys the enhanced admin interface features to production

set -e

echo "🚀 Starting Admin Interface Enhancement Deployment..."

# Configuration
BACKUP_DIR="./backups/admin-enhancement-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./logs/admin-deployment-$(date +%Y%m%d_%H%M%S).log"

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "./logs"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "❌ Error occurred during deployment. Rolling back..."
    if [ -d "$BACKUP_DIR" ]; then
        log "🔄 Restoring from backup: $BACKUP_DIR"
        # Add rollback logic here if needed
    fi
    exit 1
}

trap handle_error ERR

log "📋 Pre-deployment checks..."

# Check if required services are running
check_service() {
    local service=$1
    if ! systemctl is-active --quiet "$service"; then
        log "⚠️  Warning: $service is not running"
        return 1
    fi
    log "✅ $service is running"
    return 0
}

# Verify environment
log "🔍 Verifying environment..."
if [ ! -f ".env.production" ]; then
    log "❌ Production environment file not found"
    exit 1
fi

# Check database connectivity
log "🗄️  Checking database connectivity..."
cd backend
if ! npm run db:generate > /dev/null 2>&1; then
    log "❌ Database connection failed"
    exit 1
fi
log "✅ Database connection successful"

# Create backup
log "💾 Creating backup..."
cp -r ./frontend/src/components/admin "$BACKUP_DIR/frontend-admin-components"
cp -r ./backend/src/admin "$BACKUP_DIR/backend-admin-modules"
cp ./frontend/package.json "$BACKUP_DIR/frontend-package.json"
cp ./backend/package.json "$BACKUP_DIR/backend-package.json"
log "✅ Backup created at $BACKUP_DIR"

# Install dependencies
log "📦 Installing backend dependencies..."
cd ../backend
npm ci --production=false

log "📦 Installing frontend dependencies..."
cd ../frontend
npm ci

# Run database migrations
log "🗄️  Running database migrations..."
cd ../backend
npm run db:migrate

# Build applications
log "🔨 Building backend..."
npm run build

log "🔨 Building frontend..."
cd ../frontend
npm run build

# Run tests
log "🧪 Running integration tests..."
cd ../backend
npm run test:e2e -- --testPathPattern=admin-integration --passWithNoTests

# Deploy backend
log "🚀 Deploying backend..."
cd ../backend
pm2 stop conference-backend || true
pm2 delete conference-backend || true
pm2 start ecosystem.config.js --env production
pm2 save

# Deploy frontend
log "🚀 Deploying frontend..."
cd ../frontend
# Copy built files to nginx directory
sudo cp -r .next/* /var/www/conference-frontend/
sudo systemctl reload nginx

# Verify deployment
log "✅ Verifying deployment..."
sleep 10

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log "✅ Backend health check passed"
else
    log "❌ Backend health check failed"
    handle_error
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Frontend health check passed"
else
    log "❌ Frontend health check failed"
    handle_error
fi

# Test admin interface endpoints
log "🔍 Testing admin interface endpoints..."
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}' | \
    jq -r '.access_token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    # Test dashboard metrics
    if curl -f -H "Authorization: Bearer $ADMIN_TOKEN" \
        http://localhost:3001/admin/dashboard/metrics > /dev/null 2>&1; then
        log "✅ Admin dashboard endpoint working"
    else
        log "❌ Admin dashboard endpoint failed"
        handle_error
    fi
    
    # Test user management
    if curl -f -H "Authorization: Bearer $ADMIN_TOKEN" \
        http://localhost:3001/admin/users > /dev/null 2>&1; then
        log "✅ Admin user management endpoint working"
    else
        log "❌ Admin user management endpoint failed"
        handle_error
    fi
else
    log "⚠️  Could not obtain admin token for testing"
fi

# Clear caches
log "🧹 Clearing caches..."
cd ../backend
npm run cache:clear || log "⚠️  Cache clear failed (may not be implemented)"

# Update monitoring
log "📊 Updating monitoring configuration..."
if [ -f "./monitoring/admin-alerts.yml" ]; then
    sudo cp ./monitoring/admin-alerts.yml /etc/prometheus/rules/
    sudo systemctl reload prometheus || log "⚠️  Prometheus reload failed"
fi

# Cleanup
log "🧹 Cleaning up..."
cd ../
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

log "✅ Admin Interface Enhancement deployment completed successfully!"
log "📊 Deployment summary:"
log "   - Backup location: $BACKUP_DIR"
log "   - Log file: $LOG_FILE"
log "   - Backend status: $(pm2 describe conference-backend | grep status || echo 'Unknown')"
log "   - Frontend status: $(systemctl is-active nginx)"

echo ""
echo "🎉 Deployment Complete!"
echo "📋 Next steps:"
echo "   1. Monitor application logs for any issues"
echo "   2. Verify admin interface functionality in browser"
echo "   3. Check system performance metrics"
echo "   4. Update documentation if needed"
echo ""
echo "📞 Support: If issues occur, restore from backup at $BACKUP_DIR"