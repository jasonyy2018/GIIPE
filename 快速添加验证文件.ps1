# 快速添加腾讯验证文件 - 无需重构 (PowerShell版本)
# 使用方法: .\快速添加验证文件.ps1 文件名.txt

param(
    [Parameter(Mandatory=$true)]
    [string]$FileName
)

$ContainerName = "conference-frontend-prod"

# 检查文件是否存在
if (-not (Test-Path $FileName)) {
    Write-Host "错误: 文件 $FileName 不存在" -ForegroundColor Red
    exit 1
}

Write-Host "正在将 $FileName 复制到容器..." -ForegroundColor Yellow
docker cp "$FileName" "${ContainerName}:/app/public/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 文件复制成功" -ForegroundColor Green
    Write-Host "正在重启前端容器..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml restart frontend
    Write-Host "✅ 完成！文件应该可以通过 https://giip.info/$FileName 访问" -ForegroundColor Green
} else {
    Write-Host "❌ 文件复制失败" -ForegroundColor Red
    exit 1
}

