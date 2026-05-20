#!/bin/bash

# Production Deployment Script for Conference Management Platform
# This script handles the deployment process with proper error handling and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        log_info "Check logs for more details"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy .env.production template and configure it"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Backup database if running
    if docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "${POSTGRES_USER:-conference_user}" \
            -d "${POSTGRES_DB:-conference_platform}" \
            > "$backup_path/database.sql" || log_warning "Database backup failed"
    fi
    
    # Backup uploads directory
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        log_info "Backing up uploads..."
        cp -r "$PROJECT_ROOT/uploads" "$backup_path/" || log_warning "Uploads backup failed"
    fi
    
    # Backup environment file
    cp "$PROJECT_ROOT/$ENV_FILE" "$backup_path/" || log_warning "Environment backup failed"
    
    # Create backup info file
    cat > "$backup_path/backup_info.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "unknown")
EOF
    
    log_success "Backup created at $backup_path"
    echo "$backup_path" > "$PROJECT_ROOT/.last_backup"
}

# Build images
build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    log_info "Building backend image..."
    docker build -f backend/Dockerfile.prod -t conference-backend:latest backend/
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t conference-frontend:latest frontend/
    
    log_success "Images built successfully"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Pull external images
    log_info "Pulling external images..."
    docker compose -f "$COMPOSE_FILE" pull postgres redis nginx
    
    # Start services with rolling update
    log_info "Starting services..."
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
    
    log_success "Services deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_platform}" &> /dev/null; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Database failed to become ready"
        exit 1
    fi
    
    # Run Prisma migrations
    log_info "Running Prisma migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy
    
    log_success "Migrations completed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        # Check health via Nginx (port 8085 per docker-compose.prod.yml)
        if curl -f http://localhost:8085/api/health &> /dev/null; then
            log_success "Health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            return 1
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_success "All health checks passed"
}

# Cleanup old images and containers
cleanup_docker() {
    log_info "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    log_success "Docker cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment of Conference Management Platform"
    log_info "Timestamp: $(date)"

    # Load env vars early so backup/migration use correct defaults
    if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
      export $(grep -v '^#' "$PROJECT_ROOT/$ENV_FILE" | xargs)
    fi
    
    check_prerequisites
    create_backup
    build_images
    deploy_services
    run_migrations
    health_check
    cleanup_docker
    
    log_success "Deployment completed successfully!"
    log_info "Application is available at: http://localhost"
    log_info "API documentation: http://localhost/api/docs"
    
    # Show running services
    log_info "Running services:"
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" ps
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."
    
    if [ ! -f "$PROJECT_ROOT/.last_backup" ]; then
        log_error "No backup information found"
        exit 1
    fi
    
    local backup_path=$(cat "$PROJECT_ROOT/.last_backup")
    
    if [ ! -d "$backup_path" ]; then
        log_error "Backup directory not found: $backup_path"
        exit 1
    fi
    
    log_info "Restoring from backup: $backup_path"
    
    # Stop current services
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" down
    
    # Restore database
    if [ -f "$backup_path/database.sql" ]; then
        log_info "Restoring database..."
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" up -d postgres
        sleep 10
        docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" exec -T postgres psql \
            -U "${POSTGRES_USER:-conference_user}" \
            -d "${POSTGRES_DB:-conference_platform}" \
            < "$backup_path/database.sql"
    fi
    
    # Restore uploads
    if [ -d "$backup_path/uploads" ]; then
        log_info "Restoring uploads..."
        rm -rf "$PROJECT_ROOT/uploads"
        cp -r "$backup_path/uploads" "$PROJECT_ROOT/"
    fi
    
    # Restart services
    docker compose -f "$PROJECT_ROOT/$COMPOSE_FILE" up -d
    
    log_success "Rollback completed"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "backup")
        check_prerequisites
        create_backup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|backup}"
        echo "  deploy  - Deploy the application (default)"
        echo "  rollback - Rollback to the last backup"
        echo "  health  - Perform health checks"
        echo "  backup  - Create a backup only"
        exit 1
        ;;
esac