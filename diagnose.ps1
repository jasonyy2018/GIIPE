# PowerShell 诊断脚本 (Windows)
# 使用方法: .\diagnose.ps1

Write-Host "`n🔍 GIIPE 前后端诊断工具`n" -ForegroundColor Cyan

function Test-Port {
    param([int]$Port, [string]$ServiceName)
    
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    
    if ($connection) {
        Write-Host "✅ $ServiceName (端口 $Port): 正在运行" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $ServiceName (端口 $Port): 未运行" -ForegroundColor Red
        return $false
    }
}

function Test-ApiEndpoint {
    param([string]$Url, [string]$Name)
    
    Write-Host "ℹ️  检查 $Name..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ $Name`: 可访问 (状态码: $($response.StatusCode))" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $Name`: 不可访问 - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-DockerContainer {
    param([string]$ContainerName)
    
    try {
        $container = docker ps --filter "name=$ContainerName" --format "{{.Names}}\t{{.Status}}" 2>$null
        if ($container -and $container.Contains($ContainerName)) {
            $status = ($container -split "`t")[1]
            Write-Host "✅ Docker 容器 $ContainerName`: $status" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Docker 容器 $ContainerName`: 未运行" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "⚠️  无法检查 Docker 容器 $ContainerName (Docker 可能未安装或未运行)" -ForegroundColor Yellow
        return $false
    }
}

function Test-EnvFile {
    param([string]$FilePath, [string[]]$RequiredVars = @())
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ 环境变量文件不存在: $FilePath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ 环境变量文件存在: $FilePath" -ForegroundColor Green
    
    if ($RequiredVars.Count -gt 0) {
        $content = Get-Content $FilePath -Raw
        $missing = $RequiredVars | Where-Object { $content -notmatch $_ }
        if ($missing.Count -gt 0) {
            Write-Host "⚠️  缺少环境变量: $($missing -join ', ')" -ForegroundColor Yellow
        } else {
            Write-Host "✅ 必需的环境变量都已配置" -ForegroundColor Green
        }
    }
    
    return $true
}

# 1. 端口检查
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "1. 端口检查" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$portResults = @{
    Frontend = Test-Port -Port 3000 -ServiceName "前端服务"
    Backend = Test-Port -Port 3001 -ServiceName "后端服务"
    Postgres = Test-Port -Port 5432 -ServiceName "PostgreSQL 数据库"
    Redis = Test-Port -Port 6379 -ServiceName "Redis 缓存"
}

# 2. Docker 容器检查
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "2. Docker 容器检查" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$dockerAvailable = Test-DockerContainer -ContainerName "conference_backend"
if ($dockerAvailable) {
    Test-DockerContainer -ContainerName "conference_frontend"
    Test-DockerContainer -ContainerName "conference_postgres"
    Test-DockerContainer -ContainerName "conference_redis"
}

# 3. API 端点检查
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "3. API 端点检查" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$apiResults = @{
    BackendHealth = Test-ApiEndpoint -Url "http://localhost:3001/api/health" -Name "后端健康检查"
    Frontend = Test-ApiEndpoint -Url "http://localhost:3000" -Name "前端首页"
    BackendApi = Test-ApiEndpoint -Url "http://localhost:3001/api/events" -Name "后端 Events API"
}

# 4. 环境变量文件检查
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "4. 环境变量文件检查" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$envResults = @{
    Backend = Test-EnvFile -FilePath "backend\.env" -RequiredVars @("DATABASE_URL", "JWT_SECRET", "REDIS_HOST")
    Frontend = Test-EnvFile -FilePath "frontend\.env.local" -RequiredVars @("NEXT_PUBLIC_API_URL", "NEXTAUTH_SECRET")
}

# 5. 环境信息
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "5. 环境信息" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Write-Host "ℹ️  Node.js 版本: $(node --version)" -ForegroundColor Blue
Write-Host "ℹ️  平台: $($env:OS) $($env:PROCESSOR_ARCHITECTURE)" -ForegroundColor Blue

# 6. 总结
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "诊断总结" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$allPortsOk = ($portResults.Values | Where-Object { $_ -eq $true }).Count -eq $portResults.Count
$allApisOk = ($apiResults.Values | Where-Object { $_ -eq $true }).Count -eq $apiResults.Count

if ($allPortsOk -and $allApisOk) {
    Write-Host "✅ 所有服务运行正常！" -ForegroundColor Green
} else {
    Write-Host "❌ 发现问题，请检查上述错误信息" -ForegroundColor Red
    
    if (-not $portResults.Backend) {
        Write-Host "ℹ️  建议: 运行 cd backend; npm run start:dev" -ForegroundColor Blue
    }
    if (-not $portResults.Frontend) {
        Write-Host "ℹ️  建议: 运行 cd frontend; npm run dev" -ForegroundColor Blue
    }
    if (-not $portResults.Postgres -and -not $dockerAvailable) {
        Write-Host "ℹ️  建议: 启动 PostgreSQL 数据库或使用 Docker Compose" -ForegroundColor Blue
    }
}

Write-Host "`n"

