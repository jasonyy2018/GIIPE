#!/bin/bash

# Environment Setup Script for Conference Management Platform
# This script helps set up environment variables for different deployment environments

set -euo pipefail

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

# Generate secure random string
generate_secret() {
    local length=${1:-64}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Prompt for user input with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    echo -n "$prompt [$default]: "
    read input
    
    if [ -z "$input" ]; then
        eval "$var_name='$default'"
    else
        eval "$var_name='$input'"
    fi
}

# Setup production environment
setup_production() {
    log_info "Setting up production environment..."
    
    # Database configuration
    prompt_with_default "Database name" "conference_platform" "DB_NAME"
    prompt_with_default "Database user" "conference_user" "DB_USER"
    
    echo -n "Database password (leave empty to generate): "
    read -s DB_PASS
    echo
    if [ -z "$DB_PASS" ]; then
        DB_PASS=$(generate_secret 32)
        log_info "Generated database password"
    fi
    
    # Redis configuration
    echo -n "Redis password (leave empty to generate): "
    read -s REDIS_PASS
    echo
    if [ -z "$REDIS_PASS" ]; then
        REDIS_PASS=$(generate_secret 32)
        log_info "Generated Redis password"
    fi
    
    # JWT secrets
    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)
    CSRF_SECRET=$(generate_secret 32)
    NEXTAUTH_SECRET=$(generate_secret 32)
    log_info "Generated JWT, CSRF, and NextAuth secrets"
    
    # Domain configuration
    prompt_with_default "Domain name" "localhost" "DOMAIN"
    prompt_with_default "Site name" "Conference Platform" "SITE_NAME"
    
    # Email configuration
    prompt_with_default "SMTP host" "smtp.gmail.com" "EMAIL_HOST"
    prompt_with_default "SMTP port" "587" "EMAIL_PORT"
    prompt_with_default "Email user" "your-email@gmail.com" "EMAIL_USER"
    
    echo -n "Email password: "
    read -s EMAIL_PASS
    echo
    
    prompt_with_default "From email" "$SITE_NAME <noreply@$DOMAIN>" "EMAIL_FROM"
    
    # Storage configuration
    echo "Storage configuration:"
    echo "1) Local storage"
    echo "2) AWS S3"
    echo -n "Choose storage type [1]: "
    read storage_choice
    
    if [ "$storage_choice" = "2" ]; then
        STORAGE_TYPE="s3"
        prompt_with_default "AWS Access Key ID" "" "AWS_ACCESS_KEY_ID"
        prompt_with_default "AWS Secret Access Key" "" "AWS_SECRET_ACCESS_KEY"
        prompt_with_default "AWS Region" "us-east-1" "AWS_REGION"
        prompt_with_default "S3 Bucket name" "conference-platform-files" "AWS_S3_BUCKET"
    else
        STORAGE_TYPE="local"
        AWS_ACCESS_KEY_ID=""
        AWS_SECRET_ACCESS_KEY=""
        AWS_REGION=""
        AWS_S3_BUCKET=""
    fi
    
    # Create production environment file
    cat > .env.production << EOF
# Production Environment Configuration
# Generated on $(date)

# Database Configuration
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@postgres:5432/$DB_NAME

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASS
REDIS_URL=redis://:$REDIS_PASS@redis:6379

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CSRF Protection
CSRF_SECRET=$CSRF_SECRET

# Email Configuration
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
EMAIL_FROM=$EMAIL_FROM
EMAIL_SECURE=false

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
AWS_REGION=$AWS_REGION
AWS_S3_BUCKET=$AWS_S3_BUCKET

# Storage Configuration
STORAGE_TYPE=$STORAGE_TYPE
UPLOAD_MAX_SIZE=10485760

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5

# Application Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Frontend Configuration
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_SITE_NAME=$SITE_NAME
NEXT_PUBLIC_SITE_URL=https://$DOMAIN

# NextAuth Configuration
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# SSL Configuration
DOMAIN=$DOMAIN
EMAIL_LETSENCRYPT=admin@$DOMAIN
EOF
    
    log_success "Production environment file created: .env.production"
    log_warning "Please review and update the configuration as needed"
    log_warning "Keep the .env.production file secure and never commit it to version control"
}

# Setup development environment
setup_development() {
    log_info "Setting up development environment..."
    
    # Generate secrets for development
    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)
    CSRF_SECRET=$(generate_secret 32)
    
    cat > .env << EOF
# Development Environment Configuration
# Generated on $(date)

# Database Configuration
POSTGRES_DB=conference_platform_dev
POSTGRES_USER=conference_user
POSTGRES_PASSWORD=dev_password_123
DATABASE_URL=postgresql://conference_user:dev_password_123@localhost:5432/conference_platform_dev

# Redis Configuration
REDIS_PASSWORD=dev_redis_123
REDIS_URL=redis://:dev_redis_123@localhost:6379

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CSRF Protection
CSRF_SECRET=$CSRF_SECRET

# Email Configuration (using Ethereal for testing)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your-ethereal-user
EMAIL_PASS=your-ethereal-pass
EMAIL_FROM=Conference Platform <noreply@localhost>
EMAIL_SECURE=false

# Storage Configuration
STORAGE_TYPE=local
UPLOAD_MAX_SIZE=10485760

# Security Configuration
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
RATE_LIMIT_AUTH_MAX=10

# Application Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_NAME=Conference Platform (Dev)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
    
    log_success "Development environment file created: .env"
    log_info "You can now run: docker-compose up -d"
}

# Validate environment file
validate_env() {
    local env_file="$1"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    log_info "Validating environment file: $env_file"
    
    # Required variables
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "CSRF_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    # Check for weak secrets
    local jwt_secret=$(grep "^JWT_SECRET=" "$env_file" | cut -d'=' -f2)
    if [ ${#jwt_secret} -lt 32 ]; then
        log_warning "JWT_SECRET is shorter than recommended (32+ characters)"
    fi
    
    log_success "Environment validation passed"
}

# Main script logic
case "${1:-help}" in
    "production"|"prod")
        setup_production
        ;;
    "development"|"dev")
        setup_development
        ;;
    "validate")
        validate_env "${2:-.env.production}"
        ;;
    "help"|*)
        echo "Usage: $0 {production|development|validate}"
        echo "  production  - Set up production environment"
        echo "  development - Set up development environment"
        echo "  validate    - Validate environment file"
        echo ""
        echo "Examples:"
        echo "  $0 production"
        echo "  $0 development"
        echo "  $0 validate .env.production"
        exit 1
        ;;
esac