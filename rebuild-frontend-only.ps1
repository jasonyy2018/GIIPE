# PowerShell 一键重新构建前端脚本（仅构建修改的部分）
# 不影响数据库和后端数据

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "GIIP 前端重新构建脚本（仅修改部分）" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "frontend")) {
    Write-Host "错误: 找不到 frontend 目录" -ForegroundColor Red
    exit 1
}

# 检查是否使用Docker
$useDocker = $false
if (Test-Path "docker-compose.yml") {
    try {
        $dockerStatus = docker-compose ps 2>$null
        if ($dockerStatus -match "frontend") {
            $useDocker = $true
            Write-Host "检测到 Docker 环境" -ForegroundColor Blue
        }
    } catch {
        # Docker未运行或未安装
    }
}

Write-Host "修改的文件：" -ForegroundColor Yellow
Write-Host "  - frontend\src\app\speakers\page.tsx"
Write-Host "  - frontend\src\components\public\FeaturedContentClient.tsx"
Write-Host ""

if ($useDocker) {
    Write-Host "使用 Docker 方式构建..." -ForegroundColor Yellow
    Write-Host ""
    
    # 检查端口冲突
    Write-Host "0. 检查端口冲突..." -ForegroundColor Yellow
    $prodContainers = docker ps --format '{{.Names}}' | Select-String -Pattern "conference-redis-prod|conference-postgres-prod"
    if ($prodContainers) {
        Write-Host "  ⚠ 检测到生产环境容器可能占用端口" -ForegroundColor Yellow
        Write-Host "  如果遇到端口冲突，请检查生产环境容器" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ 未发现端口冲突" -ForegroundColor Green
    }
    Write-Host ""
    
    # Docker 方式：仅重新构建前端容器
    Write-Host "1. 更新package-lock.json（如果需要）..." -ForegroundColor Yellow
    if (Test-Path "frontend\package-lock.json") {
        Write-Host "  ✓ package-lock.json 已存在" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ package-lock.json 不存在，将在构建时自动生成" -ForegroundColor Yellow
    }
    Write-Host ""
    
    Write-Host "2. 重新构建前端容器（无缓存）..." -ForegroundColor Yellow
    docker-compose build --no-cache frontend
    
    Write-Host ""
    Write-Host "3. 停止前端容器（如果正在运行）..." -ForegroundColor Yellow
    docker-compose stop frontend 2>$null
    Write-Host "  ✓ 前端容器已停止" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "4. 重启前端容器（仅前端，不启动依赖服务）..." -ForegroundColor Yellow
    docker-compose up -d --no-deps frontend
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "前端容器重新构建完成！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "查看日志: docker-compose logs -f frontend"
    Write-Host "查看状态: docker-compose ps frontend"
    Write-Host ""
    
} else {
    Write-Host "使用本地方式构建..." -ForegroundColor Yellow
    Write-Host ""
    
    # 进入前端目录
    Push-Location frontend
    
    try {
        # 检查node_modules
        if (-not (Test-Path "node_modules")) {
            Write-Host "检测到缺少依赖，正在安装..." -ForegroundColor Yellow
            npm install
            Write-Host ""
        }
        
        # 清理构建缓存（仅清理.next目录，不影响node_modules）
        Write-Host "1. 清理之前的构建缓存..." -ForegroundColor Yellow
        if (Test-Path ".next") {
            Remove-Item -Recurse -Force ".next"
            Write-Host "  ✓ 已清理 .next 目录" -ForegroundColor Green
        } else {
            Write-Host "  ✓ 无需清理（.next 目录不存在）" -ForegroundColor Green
        }
        Write-Host ""
        
        # 重新构建
        Write-Host "2. 开始构建 Next.js 应用..." -ForegroundColor Yellow
        npm run build
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "前端重新构建完成！" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "构建输出: frontend\.next"
        Write-Host ""
        Write-Host "下一步："
        Write-Host "  - 开发模式: cd frontend; npm run dev"
        Write-Host "  - 生产模式: cd frontend; npm run start"
        Write-Host ""
        
    } finally {
        # 返回原目录
        Pop-Location
    }
}

Write-Host "注意：此操作仅重新构建前端，不影响数据库和后端数据" -ForegroundColor Blue
Write-Host ""

