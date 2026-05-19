#!/bin/bash

# Backup Verification Script for Conference Management Platform
# This script verifies the integrity and completeness of backups

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Usage function
usage() {
    echo "Usage: $0 <backup_directory>"
    echo "Example: $0 backups/backup_20231201_020000"
    exit 1
}

# Verify backup directory exists
verify_backup_directory() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory does not exist: $backup_dir"
        exit 1
    fi
    
    log_info "Verifying backup directory: $backup_dir"
}

# Verify backup info file
verify_backup_info() {
    local backup_dir="$1"
    local info_file="$backup_dir/backup_info.txt"
    
    if [ ! -f "$info_file" ]; then
        log_warning "Backup info file not found: $info_file"
        return 1
    fi
    
    log_info "Backup information:"
    cat "$info_file"
    log_success "Backup info file verified"
}

# Verify database backup
verify_database_backup() {
    local backup_dir="$1"
    local db_backup="$backup_dir/database.sql"
    
    if [ ! -f "$db_backup" ]; then
        log_warning "Database backup file not found: $db_backup"
        return 1
    fi
    
    # Check if file is not empty
    if [ ! -s "$db_backup" ]; then
        log_error "Database backup file is empty"
        return 1
    fi
    
    # Check if it's a valid SQL file
    if ! head -n 10 "$db_backup" | grep -q "PostgreSQL database dump"; then
        log_warning "Database backup may not be a valid PostgreSQL dump"
    fi
    
    # Get file size
    local file_size=$(du -h "$db_backup" | cut -f1)
    log_info "Database backup size: $file_size"
    
    # Check for common SQL patterns
    local table_count=$(grep -c "CREATE TABLE" "$db_backup" || echo "0")
    local insert_count=$(grep -c "INSERT INTO" "$db_backup" || echo "0")
    
    log_info "Database backup contains:"
    log_info "  - Tables: $table_count"
    log_info "  - Insert statements: $insert_count"
    
    if [ "$table_count" -eq 0 ]; then
        log_warning "No CREATE TABLE statements found in backup"
    fi
    
    log_success "Database backup verified"
}

# Verify uploads backup
verify_uploads_backup() {
    local backup_dir="$1"
    local uploads_backup="$backup_dir/uploads"
    
    if [ ! -d "$uploads_backup" ]; then
        log_warning "Uploads backup directory not found: $uploads_backup"
        return 1
    fi
    
    # Count files and get total size
    local file_count=$(find "$uploads_backup" -type f | wc -l)
    local total_size=$(du -sh "$uploads_backup" | cut -f1)
    
    log_info "Uploads backup contains:"
    log_info "  - Files: $file_count"
    log_info "  - Total size: $total_size"
    
    # Check for common file types
    local image_count=$(find "$uploads_backup" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" \) | wc -l)
    local doc_count=$(find "$uploads_backup" -type f \( -name "*.pdf" -o -name "*.doc" -o -name "*.docx" \) | wc -l)
    
    log_info "  - Images: $image_count"
    log_info "  - Documents: $doc_count"
    
    log_success "Uploads backup verified"
}

# Verify environment backup
verify_environment_backup() {
    local backup_dir="$1"
    local env_backup="$backup_dir/.env.production"
    
    if [ ! -f "$env_backup" ]; then
        log_warning "Environment backup file not found: $env_backup"
        return 1
    fi
    
    # Check if file contains expected environment variables
    local required_vars=("DATABASE_URL" "JWT_SECRET" "NODE_ENV")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_backup"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Missing environment variables: ${missing_vars[*]}"
    else
        log_success "Environment backup verified"
    fi
}

# Test database backup integrity
test_database_integrity() {
    local backup_dir="$1"
    local db_backup="$backup_dir/database.sql"
    
    if [ ! -f "$db_backup" ]; then
        log_warning "Skipping database integrity test - backup file not found"
        return 1
    fi
    
    log_info "Testing database backup integrity..."
    
    # Create a temporary test database
    local test_db="test_restore_$(date +%s)"
    local compose_file="$PROJECT_ROOT/docker-compose.prod.yml"
    
    # Check if PostgreSQL is running
    if ! docker-compose -f "$compose_file" ps postgres | grep -q "Up"; then
        log_warning "PostgreSQL is not running - skipping integrity test"
        return 1
    fi
    
    # Create test database
    if docker-compose -f "$compose_file" exec -T postgres createdb -U "${POSTGRES_USER:-conference_user}" "$test_db" 2>/dev/null; then
        log_info "Created test database: $test_db"
        
        # Try to restore backup to test database
        if docker-compose -f "$compose_file" exec -T postgres psql -U "${POSTGRES_USER:-conference_user}" -d "$test_db" < "$db_backup" >/dev/null 2>&1; then
            log_success "Database backup integrity test passed"
            
            # Get table count from restored database
            local restored_tables=$(docker-compose -f "$compose_file" exec -T postgres psql -U "${POSTGRES_USER:-conference_user}" -d "$test_db" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
            log_info "Restored database contains $restored_tables tables"
        else
            log_error "Database backup integrity test failed"
        fi
        
        # Clean up test database
        docker-compose -f "$compose_file" exec -T postgres dropdb -U "${POSTGRES_USER:-conference_user}" "$test_db" 2>/dev/null || true
        log_info "Cleaned up test database"
    else
        log_warning "Could not create test database - skipping integrity test"
    fi
}

# Generate backup report
generate_report() {
    local backup_dir="$1"
    local report_file="$backup_dir/verification_report.txt"
    
    log_info "Generating verification report..."
    
    cat > "$report_file" << EOF
Backup Verification Report
=========================
Verification Date: $(date)
Backup Directory: $backup_dir

Files Verified:
EOF
    
    # Check each component
    if [ -f "$backup_dir/backup_info.txt" ]; then
        echo "✓ Backup info file present" >> "$report_file"
    else
        echo "✗ Backup info file missing" >> "$report_file"
    fi
    
    if [ -f "$backup_dir/database.sql" ]; then
        local db_size=$(du -h "$backup_dir/database.sql" | cut -f1)
        echo "✓ Database backup present ($db_size)" >> "$report_file"
    else
        echo "✗ Database backup missing" >> "$report_file"
    fi
    
    if [ -d "$backup_dir/uploads" ]; then
        local uploads_size=$(du -sh "$backup_dir/uploads" | cut -f1)
        local file_count=$(find "$backup_dir/uploads" -type f | wc -l)
        echo "✓ Uploads backup present ($uploads_size, $file_count files)" >> "$report_file"
    else
        echo "✗ Uploads backup missing" >> "$report_file"
    fi
    
    if [ -f "$backup_dir/.env.production" ]; then
        echo "✓ Environment backup present" >> "$report_file"
    else
        echo "✗ Environment backup missing" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "Verification completed at: $(date)" >> "$report_file"
    
    log_success "Verification report saved to: $report_file"
}

# Main verification function
main() {
    local backup_dir="$1"
    
    log_info "Starting backup verification for: $backup_dir"
    log_info "Timestamp: $(date)"
    
    verify_backup_directory "$backup_dir"
    
    local verification_passed=true
    
    # Verify each component
    verify_backup_info "$backup_dir" || verification_passed=false
    verify_database_backup "$backup_dir" || verification_passed=false
    verify_uploads_backup "$backup_dir" || verification_passed=false
    verify_environment_backup "$backup_dir" || verification_passed=false
    
    # Test database integrity if requested
    if [ "${TEST_INTEGRITY:-false}" = "true" ]; then
        test_database_integrity "$backup_dir" || verification_passed=false
    fi
    
    # Generate report
    generate_report "$backup_dir"
    
    if [ "$verification_passed" = true ]; then
        log_success "Backup verification completed successfully!"
        exit 0
    else
        log_warning "Backup verification completed with warnings"
        log_info "Check the verification report for details"
        exit 1
    fi
}

# Check command line arguments
if [ $# -eq 0 ]; then
    usage
fi

BACKUP_DIR="$1"

# Handle relative paths
if [[ ! "$BACKUP_DIR" = /* ]]; then
    BACKUP_DIR="$PROJECT_ROOT/$BACKUP_DIR"
fi

# Load environment variables if available
ENV_FILE="$PROJECT_ROOT/.env.production"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

main "$BACKUP_DIR"