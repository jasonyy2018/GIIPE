# Production Deployment Script for Conference Management Platform (PowerShell)
# This script handles the deployment process with proper error handling and rollback capabilities

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "rollback", "health", "backup")]
    [string]$Action = "deploy"
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectRoot "backups"
$ComposeFile = "docker-compose.prod.yml"
$EnvFile = ".env.production"

# Error handling
$ErrorActionPreference = "Stop"

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    try {
        $null = docker --version
    }
    catch {
        Write-Error "Docker is not installed or not in PATH"
        exit 1
    }
    
    try {
        $null = docker info 2>$null
    }
    catch {
        Write-Error "Docker is not running"
        exit 1
    }
    
    # Check if Docker Compose is available
    try {
        $null = docker-compose --version
    }
    catch {
        try {
            $null = docker compose version
        }
        catch {
            Write-Error "Docker Compose is not installed"
            exit 1
        }
    }
    
    # Check if environment file exists
    $envPath = Join-Path $ProjectRoot $EnvFile
    if (-not (Test-Path $envPath)) {
        Write-Error "Environment file $EnvFile not found"
        Write-Info "Please copy .env.production template and configure it"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Create backup
function New-Backup {
    Write-Info "Creating backup..."
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $backupPath = Join-Path $BackupDir $backupName
    
    # Create backup directory
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    # Backup database if running
    $composePath = Join-Path $ProjectRoot $ComposeFile
    $postgresStatus = docker-compose -f $composePath ps postgres 2>$null
    if ($postgresStatus -match "Up") {
        Write-Info "Backing up database..."
        try {
            $env:POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "conference_user" }
            $env:POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "conference_platform" }
            
            docker-compose -f $composePath exec -T postgres pg_dump -U $env:POSTGRES_USER -d $env:POSTGRES_DB | Out-File -FilePath (Join-Path $backupPath "database.sql") -Encoding UTF8
        }
        catch {
            Write-Warning "Database backup failed: $_"
        }
    }
    
    # Backup uploads directory
    $uploadsPath = Join-Path $ProjectRoot "uploads"
    if (Test-Path $uploadsPath) {
        Write-Info "Backing up uploads..."
        try {
            Copy-Item -Path $uploadsPath -Destination $backupPath -Recurse -Force
        }
        catch {
            Write-Warning "Uploads backup failed: $_"
        }
    }
    
    # Backup environment file
    $envPath = Join-Path $ProjectRoot $EnvFile
    try {
        Copy-Item -Path $envPath -Destination $backupPath -Force
    }
    catch {
        Write-Warning "Environment backup failed: $_"
    }
    
    # Create backup info file
    $gitCommit = try { git rev-parse HEAD 2>$null } catch { "unknown" }
    $gitBranch = try { git branch --show-current 2>$null } catch { "unknown" }
    
    $backupInfo = @"
Backup created: $(Get-Date)
Git commit: $gitCommit
Git branch: $gitBranch
"@
    
    $backupInfo | Out-File -FilePath (Join-Path $backupPath "backup_info.txt") -Encoding UTF8
    
    Write-Success "Backup created at $backupPath"
    $backupPath | Out-File -FilePath (Join-Path $ProjectRoot ".last_backup") -Encoding UTF8
}

# Build images
function Build-Images {
    Write-Info "Building Docker images..."
    
    Set-Location $ProjectRoot
    
    # Build backend image
    Write-Info "Building backend image..."
    docker build -f backend/Dockerfile.prod -t conference-backend:latest backend/
    
    # Build frontend image
    Write-Info "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t conference-frontend:latest frontend/
    
    Write-Success "Images built successfully"
}

# Deploy services
function Deploy-Services {
    Write-Info "Deploying services..."
    
    Set-Location $ProjectRoot
    
    # Load environment variables
    $envPath = Join-Path $ProjectRoot $EnvFile
    if (Test-Path $envPath) {
        Get-Content $envPath | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    # Pull external images
    Write-Info "Pulling external images..."
    docker-compose -f $ComposeFile pull postgres redis nginx
    
    # Start services with rolling update
    Write-Info "Starting services..."
    docker-compose -f $ComposeFile up -d --remove-orphans
    
    Write-Success "Services deployed"
}

# Run database migrations
function Invoke-Migrations {
    Write-Info "Running database migrations..."
    
    Set-Location $ProjectRoot
    
    # Wait for database to be ready
    Write-Info "Waiting for database to be ready..."
    $timeout = 60
    $env:POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "conference_user" }
    $env:POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "conference_platform" }
    
    while ($timeout -gt 0) {
        try {
            $null = docker-compose -f $ComposeFile exec -T postgres pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB 2>$null
            break
        }
        catch {
            Start-Sleep -Seconds 2
            $timeout -= 2
        }
    }
    
    if ($timeout -le 0) {
        Write-Error "Database failed to become ready"
        exit 1
    }
    
    # Run Prisma migrations
    Write-Info "Running Prisma migrations..."
    docker-compose -f $ComposeFile exec -T backend npx prisma migrate deploy
    
    Write-Success "Migrations completed"
}

# Health check
function Test-Health {
    Write-Info "Performing health checks..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        Write-Info "Health check attempt $attempt/$maxAttempts"
        
        # Check backend health
        try {
            $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend health check passed"
                break
            }
        }
        catch {
            if ($attempt -eq $maxAttempts) {
                Write-Error "Health check failed after $maxAttempts attempts"
                return $false
            }
        }
        
        Start-Sleep -Seconds 10
        $attempt++
    }
    
    Write-Success "All health checks passed"
    return $true
}

# Cleanup old images and containers
function Remove-UnusedDockerResources {
    Write-Info "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    Write-Success "Docker cleanup completed"
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting deployment of Conference Management Platform"
    Write-Info "Timestamp: $(Get-Date)"
    
    Test-Prerequisites
    New-Backup
    Build-Images
    Deploy-Services
    Invoke-Migrations
    
    if (Test-Health) {
        Remove-UnusedDockerResources
        
        Write-Success "Deployment completed successfully!"
        Write-Info "Application is available at: http://localhost"
        Write-Info "API documentation: http://localhost/api/docs"
        
        # Show running services
        Write-Info "Running services:"
        docker-compose -f (Join-Path $ProjectRoot $ComposeFile) ps
    }
    else {
        Write-Error "Deployment failed health checks"
        exit 1
    }
}

# Rollback function
function Start-Rollback {
    Write-Warning "Rolling back to previous version..."
    
    $lastBackupFile = Join-Path $ProjectRoot ".last_backup"
    if (-not (Test-Path $lastBackupFile)) {
        Write-Error "No backup information found"
        exit 1
    }
    
    $backupPath = Get-Content $lastBackupFile -Raw | ForEach-Object { $_.Trim() }
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "Backup directory not found: $backupPath"
        exit 1
    }
    
    Write-Info "Restoring from backup: $backupPath"
    
    # Stop current services
    $composePath = Join-Path $ProjectRoot $ComposeFile
    docker-compose -f $composePath down
    
    # Restore database
    $databaseBackup = Join-Path $backupPath "database.sql"
    if (Test-Path $databaseBackup) {
        Write-Info "Restoring database..."
        docker-compose -f $composePath up -d postgres
        Start-Sleep -Seconds 10
        
        $env:POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "conference_user" }
        $env:POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "conference_platform" }
        
        Get-Content $databaseBackup | docker-compose -f $composePath exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
    }
    
    # Restore uploads
    $uploadsBackup = Join-Path $backupPath "uploads"
    if (Test-Path $uploadsBackup) {
        Write-Info "Restoring uploads..."
        $uploadsPath = Join-Path $ProjectRoot "uploads"
        if (Test-Path $uploadsPath) {
            Remove-Item -Path $uploadsPath -Recurse -Force
        }
        Copy-Item -Path $uploadsBackup -Destination $ProjectRoot -Recurse -Force
    }
    
    # Restart services
    docker-compose -f $composePath up -d
    
    Write-Success "Rollback completed"
}

# Main script logic
try {
    switch ($Action) {
        "deploy" {
            Start-Deployment
        }
        "rollback" {
            Start-Rollback
        }
        "health" {
            Test-Health
        }
        "backup" {
            Test-Prerequisites
            New-Backup
        }
        default {
            Write-Host "Usage: .\deploy.ps1 {deploy|rollback|health|backup}"
            Write-Host "  deploy   - Deploy the application (default)"
            Write-Host "  rollback - Rollback to the last backup"
            Write-Host "  health   - Perform health checks"
            Write-Host "  backup   - Create a backup only"
            exit 1
        }
    }
}
catch {
    Write-Error "Script failed: $_"
    exit 1
}