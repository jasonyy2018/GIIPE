#!/bin/bash

# 优化构建脚本 - 不使用 --no-cache，利用缓存加速

echo "=========================================="
echo "🚀 优化构建 - 使用缓存加速"
echo "=========================================="

cd "$(dirname "$0")"

# 检查环境变量
if [ ! -f .env.production ]; then
    echo "❌ 错误: 未找到 .env.production 文件"
    exit 1
fi

echo ""
echo "📦 清理旧容器（保留镜像）..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo ""
echo "🔨 开始构建（使用缓存，不使用 --no-cache）..."
echo "这比 --no-cache 快得多，因为会复用已下载的依赖..."

# 启用 BuildKit 加速
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 分步构建，便于查看进度
echo ""
echo "📦 步骤 1/2: 构建后端镜像..."
docker compose -f docker-compose.prod.yml build backend --progress=plain 2>&1 | tee backend-build.log | grep -E "(Step|RUN|ERROR|npm)" || true

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 后端镜像构建成功"
else
    echo "❌ 后端镜像构建失败，查看日志: tail -100 backend-build.log"
    exit 1
fi

echo ""
echo "📦 步骤 2/2: 构建前端镜像..."
docker compose -f docker-compose.prod.yml build frontend --progress=plain 2>&1 | tee frontend-build.log | grep -E "(Step|RUN|ERROR|npm)" || true

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 前端镜像构建成功"
else
    echo "❌ 前端镜像构建失败，查看日志: tail -100 frontend-build.log"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ 构建完成！"
echo "=========================================="
echo ""
echo "📊 镜像列表:"
docker images | grep conference
echo ""
echo "下一步:"
echo "1. 启动服务: docker compose -f docker-compose.prod.yml up -d"
echo "2. 运行迁移: docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy"
echo ""

