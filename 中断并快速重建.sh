#!/bin/bash

# 中断当前构建并快速重建
# 使用方法: bash 中断并快速重建.sh

echo "=========================================="
echo "⚡ 中断构建并快速重建（使用缓存）"
echo "=========================================="

cd "$(dirname "$0")"

echo ""
echo "⚠️  注意：此操作会中断当前构建进程"
echo "按 Ctrl+C 中断当前构建，然后运行此脚本"
read -p "按 Enter 继续，或 Ctrl+C 取消..."

echo ""
echo "🛑 步骤 1: 清理并停止所有容器..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# 不清理镜像，保留缓存层
echo ""
echo "📦 步骤 2: 保留 Docker 镜像缓存（加速重建）..."

echo ""
echo "🚀 步骤 3: 使用缓存快速重建..."
echo "这次会快得多，因为会复用已下载的依赖包..."

# 启用 BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 加载环境变量
set -a
[ -f .env.production ] && source .env.production
set +a

# 分步构建，不使用 --no-cache
echo ""
echo "📦 构建后端（使用缓存）..."
time docker compose -f docker-compose.prod.yml build backend 2>&1 | tee backend-build.log | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 后端构建成功"
else
    echo "❌ 后端构建失败，查看日志: tail -50 backend-build.log"
    exit 1
fi

echo ""
echo "📦 构建前端（使用缓存）..."
time docker compose -f docker-compose.prod.yml build frontend 2>&1 | tee frontend-build.log | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败，查看日志: tail -50 frontend-build.log"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 重建完成！"
echo "=========================================="
echo ""
echo "📊 镜像列表:"
docker images | grep conference
echo ""
echo "下一步："
echo "1. 启动服务: docker compose -f docker-compose.prod.yml up -d"
echo "2. 运行迁移: docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy"
echo ""

