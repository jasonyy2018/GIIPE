# GIIPE Local Development Environment Startup Script
# Usage: .\start-dev.ps1

Write-Host "=== GIIPE Local Development Environment Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "1. Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Warning: Docker Desktop is not running" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop first, then run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Or press Enter to continue (if database is already running locally)..." -ForegroundColor Yellow
    Read-Host
} else {
    Write-Host "   Docker is running" -ForegroundColor Green
    
    # Start database services
    Write-Host ""
    Write-Host "2. Starting database services (PostgreSQL + Redis)..." -ForegroundColor Yellow
    docker-compose up postgres redis -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Database services started" -ForegroundColor Green
        Write-Host "   Waiting for database to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } else {
        Write-Host "   Warning: Database service startup failed, continuing to start application..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "3. Starting backend service..." -ForegroundColor Yellow
$backendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        $cmdLine -like "*nest*start*"
    } catch {
        $false
    }
} | Select-Object -First 1

if ($backendProcess) {
    Write-Host "   Warning: Backend process is already running (PID: $($backendProcess.Id))" -ForegroundColor Yellow
} else {
    Write-Host "   Starting backend (port 3001)..." -ForegroundColor Cyan
    $backendPath = Join-Path $PWD "backend"
    $backendCommand = "cd '$backendPath'; npm run start:dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Host "   Backend startup command executed" -ForegroundColor Green
}

Write-Host ""
Write-Host "4. Starting frontend service..." -ForegroundColor Yellow
$frontendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        $cmdLine -like "*next*dev*"
    } catch {
        $false
    }
} | Select-Object -First 1

if ($frontendProcess) {
    Write-Host "   Warning: Frontend process is already running (PID: $($frontendProcess.Id))" -ForegroundColor Yellow
} else {
    Write-Host "   Starting frontend (port 3000)..." -ForegroundColor Cyan
    $frontendPath = Join-Path $PWD "frontend"
    $frontendCommand = "cd '$frontendPath'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Host "   Frontend startup command executed" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Startup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  - Frontend and backend will run in new PowerShell windows" -ForegroundColor White
Write-Host "  - First startup may take a few minutes for compilation" -ForegroundColor White
Write-Host "  - If backend cannot connect, ensure Docker and database services are started" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host
