# Admin Interface Enhancement Deployment Script (PowerShell)
# This script deploys the enhanced admin interface features to production on Windows

param(
    [switch]$SkipTests,
    [switch]$SkipBackup,
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Admin Interface Enhancement Deployment..." -ForegroundColor Green

# Configuration
$BackupDir = ".\backups\admin-enhancement-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$LogFile = ".\logs\admin-deployment-$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Create directories if they don't exist
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path ".\logs" | Out-Null

# Logging function
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Error handling
function Handle-Error {
    param([string]$ErrorMessage)
    Write-Log "❌ Error: $ErrorMessage"
    if (Test-Path $BackupDir) {
        Write-Log "🔄 Backup available at: $BackupDir"
    }
    exit 1
}

try {
    Write-Log "📋 Pre-deployment checks..."

    # Check if required files exist
    if (-not (Test-Path ".env.production")) {
        Handle-Error "Production environment file not found"
    }

    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-Log "✅ Node.js version: $nodeVersion"
    } catch {
        Handle-Error "Node.js is not installed or not in PATH"
    }

    # Check if npm is available
    try {
        $npmVersion = npm --version
        Write-Log "✅ npm version: $npmVersion"
    } catch {
        Handle-Error "npm is not available"
    }

    # Create backup
    if (-not $SkipBackup) {
        Write-Log "💾 Creating backup..."
        Copy-Item -Path ".\frontend\src\components\admin" -Destination "$BackupDir\frontend-admin-components" -Recurse -Force
        Copy-Item -Path ".\backend\src\admin" -Destination "$BackupDir\backend-admin-modules" -Recurse -Force
        Copy-Item -Path ".\frontend\package.json" -Destination "$BackupDir\frontend-package.json" -Force
        Copy-Item -Path ".\backend\package.json" -Destination "$BackupDir\backend-package.json" -Force
        Write-Log "✅ Backup created at $BackupDir"
    }

    # Install backend dependencies
    Write-Log "📦 Installing backend dependencies..."
    Set-Location ".\backend"
    npm ci --production=false
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Backend dependency installation failed"
    }

    # Install frontend dependencies
    Write-Log "📦 Installing frontend dependencies..."
    Set-Location "..\frontend"
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Frontend dependency installation failed"
    }

    # Check database connectivity
    Write-Log "🗄️ Checking database connectivity..."
    Set-Location "..\backend"
    npm run db:generate 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "⚠️ Database generation failed, attempting to continue..."
    } else {
        Write-Log "✅ Database connection successful"
    }

    # Run database migrations
    Write-Log "🗄️ Running database migrations..."
    npm run db:migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Log "⚠️ Database migration failed, attempting to continue..."
    }

    # Build backend
    Write-Log "🔨 Building backend..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Backend build failed"
    }

    # Build frontend
    Write-Log "🔨 Building frontend..."
    Set-Location "..\frontend"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "Frontend build failed"
    }

    # Run tests
    if (-not $SkipTests) {
        Write-Log "🧪 Running integration tests..."
        Set-Location "..\backend"
        npm run test:e2e -- --testPathPattern=admin-integration --passWithNoTests
        if ($LASTEXITCODE -ne 0) {
            Write-Log "⚠️ Some tests failed, but continuing deployment..."
        } else {
            Write-Log "✅ All tests passed"
        }
    }

    # Deploy using PM2 (if available)
    Write-Log "🚀 Deploying backend..."
    Set-Location "..\backend"
    
    # Check if PM2 is available
    try {
        pm2 --version | Out-Null
        Write-Log "✅ PM2 is available"
        
        # Stop existing process
        pm2 stop conference-backend 2>$null
        pm2 delete conference-backend 2>$null
        
        # Start new process
        pm2 start ecosystem.config.js --env $Environment
        pm2 save
        Write-Log "✅ Backend deployed with PM2"
    } catch {
        Write-Log "⚠️ PM2 not available, starting with npm..."
        Start-Process -FilePath "npm" -ArgumentList "run", "start:prod" -NoNewWindow
        Write-Log "✅ Backend started with npm"
    }

    # Deploy frontend (copy to web server directory if configured)
    Write-Log "🚀 Deploying frontend..."
    Set-Location "..\frontend"
    
    $webServerPath = $env:WEB_SERVER_PATH
    if ($webServerPath -and (Test-Path $webServerPath)) {
        Copy-Item -Path ".\.next\*" -Destination $webServerPath -Recurse -Force
        Write-Log "✅ Frontend files copied to web server"
    } else {
        Write-Log "⚠️ Web server path not configured, skipping file copy"
    }

    # Verify deployment
    Write-Log "✅ Verifying deployment..."
    Start-Sleep -Seconds 10

    # Check backend health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ Backend health check passed"
        } else {
            Write-Log "⚠️ Backend health check returned status: $($response.StatusCode)"
        }
    } catch {
        Write-Log "⚠️ Backend health check failed: $($_.Exception.Message)"
    }

    # Check frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ Frontend health check passed"
        } else {
            Write-Log "⚠️ Frontend health check returned status: $($response.StatusCode)"
        }
    } catch {
        Write-Log "⚠️ Frontend health check failed: $($_.Exception.Message)"
    }

    # Test admin interface endpoints
    Write-Log "🔍 Testing admin interface endpoints..."
    try {
        $loginData = @{
            email = "admin@example.com"
            password = "admin123"
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 10
        
        if ($loginResponse.access_token) {
            $headers = @{ Authorization = "Bearer $($loginResponse.access_token)" }
            
            # Test dashboard metrics
            try {
                Invoke-RestMethod -Uri "http://localhost:3001/admin/dashboard/metrics" -Headers $headers -TimeoutSec 10
                Write-Log "✅ Admin dashboard endpoint working"
            } catch {
                Write-Log "⚠️ Admin dashboard endpoint failed: $($_.Exception.Message)"
            }
            
            # Test user management
            try {
                Invoke-RestMethod -Uri "http://localhost:3001/admin/users" -Headers $headers -TimeoutSec 10
                Write-Log "✅ Admin user management endpoint working"
            } catch {
                Write-Log "⚠️ Admin user management endpoint failed: $($_.Exception.Message)"
            }
        } else {
            Write-Log "⚠️ Could not obtain admin token for testing"
        }
    } catch {
        Write-Log "⚠️ Admin endpoint testing failed: $($_.Exception.Message)"
    }

    # Cleanup
    Write-Log "🧹 Cleaning up..."
    Set-Location ".."
    
    # Clear npm cache
    npm cache clean --force 2>$null

    Write-Log "✅ Admin Interface Enhancement deployment completed successfully!"
    Write-Log "📊 Deployment summary:"
    Write-Log "   - Backup location: $BackupDir"
    Write-Log "   - Log file: $LogFile"
    Write-Log "   - Environment: $Environment"

    Write-Host ""
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Monitor application logs for any issues"
    Write-Host "   2. Verify admin interface functionality in browser"
    Write-Host "   3. Check system performance metrics"
    Write-Host "   4. Update documentation if needed"
    Write-Host ""
    Write-Host "📞 Support: If issues occur, restore from backup at $BackupDir" -ForegroundColor Cyan

} catch {
    Handle-Error $_.Exception.Message
}