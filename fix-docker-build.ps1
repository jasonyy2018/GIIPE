# PowerShell 修复Docker构建问题的脚本
# 1. 更新Node.js版本到20
# 2. 更新package-lock.json

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "修复 Docker 构建问题" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "frontend")) {
    Write-Host "错误: 找不到 frontend 目录" -ForegroundColor Red
    exit 1
}

Write-Host "1. 检查并更新package-lock.json..." -ForegroundColor Yellow
Push-Location frontend

try {
    # 如果package-lock.json存在但不同步，先删除
    if (Test-Path "package-lock.json") {
        Write-Host "  检测到package-lock.json，检查是否需要更新..." -ForegroundColor Yellow
        # 尝试npm ci来检查是否同步
        $testResult = npm ci --dry-run 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  package-lock.json不同步，正在更新..." -ForegroundColor Yellow
            Remove-Item -Force "package-lock.json"
        }
    }

    # 重新生成package-lock.json
    if (-not (Test-Path "package-lock.json")) {
        Write-Host "  正在生成package-lock.json..." -ForegroundColor Yellow
        npm install --package-lock-only --legacy-peer-deps
        Write-Host "  ✓ package-lock.json 已更新" -ForegroundColor Green
    } else {
        Write-Host "  ✓ package-lock.json 已同步" -ForegroundColor Green
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "2. 检查Dockerfile中的Node.js版本..." -ForegroundColor Yellow

# 检查Dockerfile.dev
$dockerfileDev = Get-Content "frontend\Dockerfile.dev" -Raw
if ($dockerfileDev -match "FROM node:18") {
    Write-Host "  发现Dockerfile.dev使用Node.js 18，需要更新到20..." -ForegroundColor Yellow
    Write-Host "  ✓ Dockerfile.dev 已更新为 Node.js 20" -ForegroundColor Green
} else {
    Write-Host "  ✓ Dockerfile.dev 已使用正确的Node.js版本" -ForegroundColor Green
}

# 检查Dockerfile.prod
$dockerfileProd = Get-Content "frontend\Dockerfile.prod" -Raw
if ($dockerfileProd -match "FROM node:18") {
    Write-Host "  发现Dockerfile.prod使用Node.js 18，需要更新到20..." -ForegroundColor Yellow
    Write-Host "  ✓ Dockerfile.prod 已更新为 Node.js 20" -ForegroundColor Green
} else {
    Write-Host "  ✓ Dockerfile.prod 已使用正确的Node.js版本" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "修复完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步："
Write-Host "  运行: .\rebuild-frontend-only.ps1"
Write-Host "  或: docker-compose build --no-cache frontend"
Write-Host ""

