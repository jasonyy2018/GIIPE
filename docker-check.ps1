# Docker 诊断检查脚本 (PowerShell)
# 使用方法: .\docker-check.ps1

Write-Host "`n🐳 Docker 诊断检查工具`n" -ForegroundColor Cyan

# 检查 Docker 是否安装
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker 已安装: $(docker --version)" -ForegroundColor Green
Write-Host ""

# 1. Docker 服务状态
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "1. Docker 服务状态" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker 守护进程正在运行" -ForegroundColor Green
        $dockerInfo | Select-String -Pattern "Server Version|Operating System|Kernel Version|Total Memory" | Select-Object -First 4
    } else {
        Write-Host "❌ Docker 守护进程未运行" -ForegroundColor Red
        Write-Host "提示: 请启动 Docker Desktop 或 Docker 服务" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 无法连接到 Docker 守护进程" -ForegroundColor Red
}
Write-Host ""

# 2. 容器状态
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "2. 容器状态" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "所有容器:" -ForegroundColor Blue
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
Write-Host ""

Write-Host "运行中的容器:" -ForegroundColor Blue
$running = docker ps -q
if ($running) {
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    $runningCount = ($running | Measure-Object).Count
    Write-Host "✅ 有 $runningCount 个容器正在运行" -ForegroundColor Green
} else {
    Write-Host "⚠️  没有运行中的容器" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "已停止的容器:" -ForegroundColor Blue
$stopped = docker ps -a -f "status=exited" -q
if ($stopped) {
    docker ps -a -f "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    $stoppedCount = ($stopped | Measure-Object).Count
    Write-Host "⚠️  有 $stoppedCount 个容器已停止" -ForegroundColor Yellow
} else {
    Write-Host "✅ 没有已停止的容器" -ForegroundColor Green
}
Write-Host ""

# 3. 项目相关容器
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "3. GIIPE 项目容器" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$containers = @("conference_backend", "conference_frontend", "conference_postgres", "conference_redis")

foreach ($container in $containers) {
    $exists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^${container}$"
    if ($exists) {
        $status = docker ps -a --filter "name=^${container}$" --format "{{.Status}}"
        $isRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^${container}$"
        if ($isRunning) {
            Write-Host "✅ $container`: $status" -ForegroundColor Green
        } else {
            Write-Host "❌ $container`: $status (已停止)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  $container`: 容器不存在" -ForegroundColor Yellow
    }
}
Write-Host ""

# 4. 容器资源使用
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "4. 容器资源使用" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($running) {
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
} else {
    Write-Host "⚠️  没有运行中的容器" -ForegroundColor Yellow
}
Write-Host ""

# 5. 镜像列表
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "5. Docker 镜像" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$images = docker images -q
if ($images) {
    Write-Host "项目相关镜像:" -ForegroundColor Blue
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | Select-String -Pattern "REPOSITORY|conference|giipe"
    $imageCount = ($images | Measure-Object).Count
    Write-Host "✅ 共有 $imageCount 个镜像" -ForegroundColor Green
} else {
    Write-Host "⚠️  没有镜像" -ForegroundColor Yellow
}
Write-Host ""

# 6. 网络检查
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "6. Docker 网络" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$networks = docker network ls --format "{{.Name}}" | Select-String -Pattern "conference|giipe"
if ($networks) {
    Write-Host "项目相关网络:" -ForegroundColor Blue
    docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" | Select-String -Pattern "NETWORK|conference|giipe"
    Write-Host ""
    foreach ($net in $networks) {
        Write-Host "网络 $net 的容器:" -ForegroundColor Blue
        $netContainers = docker network inspect $net --format '{{range .Containers}}{{.Name}} {{end}}' 2>$null
        if ($netContainers) {
            Write-Host "  $netContainers"
        } else {
            Write-Host "  无"
        }
    }
} else {
    Write-Host "⚠️  未找到项目相关网络" -ForegroundColor Yellow
}
Write-Host ""

# 7. 数据卷
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "7. Docker 数据卷" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$volumes = docker volume ls --format "{{.Name}}" | Select-String -Pattern "postgres|redis|conference|giipe"
if ($volumes) {
    Write-Host "项目相关数据卷:" -ForegroundColor Blue
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" | Select-String -Pattern "VOLUME|postgres|redis|conference|giipe"
} else {
    Write-Host "⚠️  未找到项目相关数据卷" -ForegroundColor Yellow
}
Write-Host ""

# 8. 容器日志检查
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "8. 容器日志检查（最近错误）" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

foreach ($container in $containers) {
    $exists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^${container}$"
    if ($exists) {
        $errors = docker logs $container --tail 10 2>&1 | Select-String -Pattern "error|fail|exception" -CaseSensitive:$false | Select-Object -First 3
        if ($errors) {
            Write-Host "❌ $container 最近错误:" -ForegroundColor Red
            $errors | ForEach-Object { Write-Host "  $_" }
        } else {
            Write-Host "✅ $container`: 无最近错误" -ForegroundColor Green
        }
    }
}
Write-Host ""

# 9. 端口占用检查
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "9. 端口占用检查" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$ports = @(3000, 3001, 5432, 6379)
foreach ($port in $ports) {
    $container = docker ps --format "{{.Names}}\t{{.Ports}}" | Select-String -Pattern ":$port" | ForEach-Object { ($_ -split "`t")[0] } | Select-Object -First 1
    if ($container) {
        Write-Host "✅ 端口 $port`: 被容器 $container 使用" -ForegroundColor Green
    } else {
        Write-Host "⚠️  端口 $port`: 未被 Docker 容器使用" -ForegroundColor Yellow
    }
}
Write-Host ""

# 10. Docker Compose 状态
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "10. Docker Compose 状态" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ((Get-Command docker-compose -ErrorAction SilentlyContinue) -or (docker compose version 2>$null)) {
    if ((Test-Path "docker-compose.yml") -or (Test-Path "docker-compose.prod.yml")) {
        Write-Host "使用 docker-compose ps 检查:" -ForegroundColor Blue
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            docker-compose ps 2>$null
        } else {
            docker compose ps 2>$null
        }
    } else {
        Write-Host "⚠️  未找到 docker-compose.yml 文件" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Docker Compose 未安装" -ForegroundColor Yellow
}
Write-Host ""

# 总结
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "诊断总结" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$allRunning = $true
$runningCount = 0
foreach ($container in $containers) {
    $isRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^${container}$"
    if ($isRunning) {
        $runningCount++
    } elseif (docker ps -a --format "{{.Names}}" | Select-String -Pattern "^${container}$") {
        $allRunning = $false
    }
}

if ($allRunning -and $runningCount -ge 4) {
    Write-Host "✅ 所有项目容器运行正常！" -ForegroundColor Green
} else {
    Write-Host "⚠️  部分容器未运行，建议执行:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d" -ForegroundColor Blue
    Write-Host "  或" -ForegroundColor Blue
    Write-Host "  docker compose up -d" -ForegroundColor Blue
}

Write-Host ""

