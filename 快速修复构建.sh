#!/bin/bash

# 快速修复构建问题脚本
# 使用方法: bash 快速修复构建.sh

echo "=========================================="
echo "🔧 快速修复 Docker 构建问题"
echo "=========================================="

cd "$(dirname "$0")"

echo ""
echo "📦 步骤 1: 拉取最新代码（如果使用 Git）..."
if [ -d ".git" ]; then
    git pull || echo "Git pull 失败，继续使用现有代码"
fi

echo ""
echo "🔨 步骤 2: 清理旧的 Docker 镜像和容器..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker system prune -f

echo ""
echo "📦 步骤 3: 重新构建 Docker 镜像..."
echo "这可能需要 10-20 分钟，请耐心等待..."

# 加载环境变量
set -a
[ -f .env.production ] && source .env.production
set +a

# 单独构建，避免并发问题
echo ""
echo "构建后端镜像..."
docker compose -f docker-compose.prod.yml build backend

if [ $? -eq 0 ]; then
    echo "✅ 后端镜像构建成功"
else
    echo "❌ 后端镜像构建失败"
    exit 1
fi

echo ""
echo "构建前端镜像..."
docker compose -f docker-compose.prod.yml build frontend

if [ $? -eq 0 ]; then
    echo "✅ 前端镜像构建成功"
else
    echo "❌ 前端镜像构建失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 构建完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动服务: docker compose -f docker-compose.prod.yml up -d"
echo "2. 运行迁移: docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy"
echo "3. 检查状态: docker compose -f docker-compose.prod.yml ps"
echo ""

