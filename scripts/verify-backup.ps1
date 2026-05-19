# Backup Verification Script for Conference Management Platform (PowerShell)
# This script verifies the integrity and completeness of backups

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$BackupDirectory,
    
    [Parameter()]
    [switch]$TestIntegrity
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

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

# Verify backup directory exists
function Test-BackupDirectory {
    param([string]$BackupDir)
    
    if (-not (Test-Path $BackupDir)) {
        Write-Error "Backup directory does not exist: $BackupDir"
        exit 1
    }
    
    Write-Info "Verifying backup directory: $BackupDir"
}

# Verify backup info file
function Test-BackupInfo {
    param([string]$BackupDir)
    
    $infoFile = Join-Path $BackupDir "backup_info.txt"
    
    if (-not (Test-Path $infoFile)) {
        Write-Warning "Backup info file not found: $infoFile"
        return $false
    }
    
    Write-Info "Backup information:"
    Get-Content $infoFile | ForEach-Object { Write-Host $_ }
    Write-Success "Backup info file verified"
    return $true
}

# Verify database backup
function Test-DatabaseBackup {
    param([string]$BackupDir)
    
    $dbBackup = Join-Path $BackupDir "database.sql"
    
    if (-not (Test-Path $dbBackup)) {
        Write-Warning "Database backup file not found: $dbBackup"
        return $false
    }
    
    # Check if file is not empty
    $fileInfo = Get-Item $dbBackup
    if ($fileInfo.Length -eq 0) {
        Write-Error "Database backup file is empty"
        return $false
    }
    
    # Check if it's a valid SQL file
    $firstLines = Get-Content $dbBackup -TotalCount 10
    if (-not ($firstLines -join " " -match "PostgreSQL database dump")) {
        Write-Warning "Database backup may not be a valid PostgreSQL dump"
    }
    
    # Get file size
    $fileSize = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Info "Database backup size: $fileSize MB"
    
    # Check for common SQL patterns
    $content = Get-Content $dbBackup -Raw
    $tableCount = ([regex]::Matches($content, "CREATE TABLE")).Count
    $insertCount = ([regex]::Matches($content, "INSERT INTO")).Count
    
    Write-Info "Database backup contains:"
    Write-Info "  - Tables: $tableCount"
    Write-Info "  - Insert statements: $insertCount"
    
    if ($tableCount -eq 0) {
        Write-Warning "No CREATE TABLE statements found in backup"
    }
    
    Write-Success "Database backup verified"
    return $true
}

# Verify uploads backup
function Test-UploadsBackup {
    param([string]$BackupDir)
    
    $uploadsBackup = Join-Path $BackupDir "uploads"
    
    if (-not (Test-Path $uploadsBackup)) {
        Write-Warning "Uploads backup directory not found: $uploadsBackup"
        return $false
    }
    
    # Count files and get total size
    $files = Get-ChildItem -Path $uploadsBackup -Recurse -File
    $fileCount = $files.Count
    $totalSize = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    
    Write-Info "Uploads backup contains:"
    Write-Info "  - Files: $fileCount"
    Write-Info "  - Total size: $totalSize MB"
    
    # Check for common file types
    $imageCount = ($files | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|gif)$' }).Count
    $docCount = ($files | Where-Object { $_.Extension -match '\.(pdf|doc|docx)$' }).Count
    
    Write-Info "  - Images: $imageCount"
    Write-Info "  - Documents: $docCount"
    
    Write-Success "Uploads backup verified"
    return $true
}

# Verify environment backup
function Test-EnvironmentBackup {
    param([string]$BackupDir)
    
    $envBackup = Join-Path $BackupDir ".env.production"
    
    if (-not (Test-Path $envBackup)) {
        Write-Warning "Environment backup file not found: $envBackup"
        return $false
    }
    
    # Check if file contains expected environment variables
    $requiredVars = @("DATABASE_URL", "JWT_SECRET", "NODE_ENV")
    $content = Get-Content $envBackup
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not ($content | Where-Object { $_ -match "^$var=" })) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Warning "Missing environment variables: $($missingVars -join ', ')"
        return $false
    } else {
        Write-Success "Environment backup verified"
        return $true
    }
}

# Test database backup integrity
function Test-DatabaseIntegrity {
    param([string]$BackupDir)
    
    $dbBackup = Join-Path $BackupDir "database.sql"
    
    if (-not (Test-Path $dbBackup)) {
        Write-Warning "Skipping database integrity test - backup file not found"
        return $false
    }
    
    Write-Info "Testing database backup integrity..."
    
    # Create a temporary test database
    $testDb = "test_restore_$(Get-Date -Format 'yyyyMMddHHmmss')"
    $composeFile = Join-Path $ProjectRoot "docker-compose.prod.yml"
    
    # Check if PostgreSQL is running
    try {
        $postgresStatus = docker-compose -f $composeFile ps postgres 2>$null
        if (-not ($postgresStatus -match "Up")) {
            Write-Warning "PostgreSQL is not running - skipping integrity test"
            return $false
        }
    }
    catch {
        Write-Warning "Could not check PostgreSQL status - skipping integrity test"
        return $false
    }
    
    try {
        # Create test database
        $env:POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "conference_user" }
        
        $createResult = docker-compose -f $composeFile exec -T postgres createdb -U $env:POSTGRES_USER $testDb 2>$null
        Write-Info "Created test database: $testDb"
        
        # Try to restore backup to test database
        Get-Content $dbBackup | docker-compose -f $composeFile exec -T postgres psql -U $env:POSTGRES_USER -d $testDb 2>$null | Out-Null
        Write-Success "Database backup integrity test passed"
        
        # Get table count from restored database
        $tableCountQuery = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
        $restoredTables = docker-compose -f $composeFile exec -T postgres psql -U $env:POSTGRES_USER -d $testDb -t -c $tableCountQuery 2>$null
        $restoredTables = $restoredTables.Trim()
        Write-Info "Restored database contains $restoredTables tables"
        
        return $true
    }
    catch {
        Write-Error "Database backup integrity test failed: $_"
        return $false
    }
    finally {
        # Clean up test database
        try {
            docker-compose -f $composeFile exec -T postgres dropdb -U $env:POSTGRES_USER $testDb 2>$null | Out-Null
            Write-Info "Cleaned up test database"
        }
        catch {
            Write-Warning "Could not clean up test database: $testDb"
        }
    }
}

# Generate backup report
function New-VerificationReport {
    param([string]$BackupDir, [hashtable]$Results)
    
    $reportFile = Join-Path $BackupDir "verification_report.txt"
    
    Write-Info "Generating verification report..."
    
    $report = @"
Backup Verification Report
=========================
Verification Date: $(Get-Date)
Backup Directory: $BackupDir

Files Verified:
"@
    
    # Check each component
    if (Test-Path (Join-Path $BackupDir "backup_info.txt")) {
        $report += "`n✓ Backup info file present"
    } else {
        $report += "`n✗ Backup info file missing"
    }
    
    if (Test-Path (Join-Path $BackupDir "database.sql")) {
        $dbFile = Get-Item (Join-Path $BackupDir "database.sql")
        $dbSize = [math]::Round($dbFile.Length / 1MB, 2)
        $report += "`n✓ Database backup present ($dbSize MB)"
    } else {
        $report += "`n✗ Database backup missing"
    }
    
    if (Test-Path (Join-Path $BackupDir "uploads")) {
        $uploadsDir = Get-Item (Join-Path $BackupDir "uploads")
        $files = Get-ChildItem -Path $uploadsDir -Recurse -File
        $uploadsSize = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        $fileCount = $files.Count
        $report += "`n✓ Uploads backup present ($uploadsSize MB, $fileCount files)"
    } else {
        $report += "`n✗ Uploads backup missing"
    }
    
    if (Test-Path (Join-Path $BackupDir ".env.production")) {
        $report += "`n✓ Environment backup present"
    } else {
        $report += "`n✗ Environment backup missing"
    }
    
    $report += "`n`nVerification completed at: $(Get-Date)"
    
    $report | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-Success "Verification report saved to: $reportFile"
}

# Main verification function
function Start-BackupVerification {
    param([string]$BackupDir)
    
    Write-Info "Starting backup verification for: $BackupDir"
    Write-Info "Timestamp: $(Get-Date)"
    
    Test-BackupDirectory $BackupDir
    
    $verificationPassed = $true
    $results = @{}
    
    # Verify each component
    $results['BackupInfo'] = Test-BackupInfo $BackupDir
    $results['Database'] = Test-DatabaseBackup $BackupDir
    $results['Uploads'] = Test-UploadsBackup $BackupDir
    $results['Environment'] = Test-EnvironmentBackup $BackupDir
    
    if (-not $results['BackupInfo']) { $verificationPassed = $false }
    if (-not $results['Database']) { $verificationPassed = $false }
    if (-not $results['Uploads']) { $verificationPassed = $false }
    if (-not $results['Environment']) { $verificationPassed = $false }
    
    # Test database integrity if requested
    if ($TestIntegrity) {
        $results['Integrity'] = Test-DatabaseIntegrity $BackupDir
        if (-not $results['Integrity']) { $verificationPassed = $false }
    }
    
    # Generate report
    New-VerificationReport $BackupDir $results
    
    if ($verificationPassed) {
        Write-Success "Backup verification completed successfully!"
        exit 0
    } else {
        Write-Warning "Backup verification completed with warnings"
        Write-Info "Check the verification report for details"
        exit 1
    }
}

# Main script logic
try {
    # Handle relative paths
    if (-not [System.IO.Path]::IsPathRooted($BackupDirectory)) {
        $BackupDirectory = Join-Path $ProjectRoot $BackupDirectory
    }
    
    # Load environment variables if available
    $envFile = Join-Path $ProjectRoot ".env.production"
    if (Test-Path $envFile) {
        Get-Content $envFile | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    Start-BackupVerification $BackupDirectory
}
catch {
    Write-Error "Script failed: $_"
    exit 1
}