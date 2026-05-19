#!/bin/bash

# 修复 Next.js Hydration 错误的部署脚本
# 适用于 Ubuntu 24 Docker 部署

set -e  # 遇到错误立即退出

echo "=========================================="
echo "修复 Next.js Hydration 错误 - Docker 部署"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 docker-compose 是否可用
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: 未找到 docker-compose 命令"
    exit 1
fi

# 使用 docker compose (新版本) 或 docker-compose (旧版本)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "步骤 1: 停止现有容器..."
$DOCKER_COMPOSE -f docker-compose.prod.yml down

echo ""
echo "步骤 2: 清除前端构建缓存..."
cd frontend
if [ -d ".next" ]; then
    rm -rf .next
    echo "✓ 已清除 .next 目录"
fi
cd ..

echo ""
echo "步骤 3: 清除 Docker 构建缓存（可选，但推荐）..."
read -p "是否清除 Docker 构建缓存？这将使构建时间更长但确保干净构建 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "清除 Docker 构建缓存..."
    docker builder prune -f
    echo "✓ 已清除 Docker 构建缓存"
else
    echo "跳过清除 Docker 构建缓存"
fi

echo ""
echo "步骤 4: 重新构建前端镜像（包含 hydration 修复）..."
$DOCKER_COMPOSE -f docker-compose.prod.yml build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "错误: 前端镜像构建失败"
    exit 1
fi

echo ""
echo "步骤 5: 启动所有服务..."
$DOCKER_COMPOSE -f docker-compose.prod.yml up -d

echo ""
echo "步骤 6: 等待服务启动..."
echo "等待前端服务健康检查通过（最多等待 5 分钟）..."

# 等待前端容器健康
MAX_WAIT=300  # 5 分钟
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}" | grep -q "healthy"; then
        echo "✓ 前端服务已健康"
        break
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "  等待中... (${ELAPSED}s/${MAX_WAIT}s)"
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "警告: 前端服务健康检查超时，但容器可能仍在启动中"
    echo "请检查日志: docker logs conference-frontend-prod"
fi

echo ""
echo "步骤 7: 检查服务状态..."
$DOCKER_COMPOSE -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "修复内容:"
echo "  ✓ 在 PublicLayout.tsx 中添加了 suppressHydrationWarning"
echo "  ✓ 修复了年份显示导致的 hydration 不匹配错误"
echo ""
echo "验证步骤:"
echo "  1. 访问网站并检查浏览器控制台"
echo "  2. 确认不再有 hydration 错误"
echo "  3. 检查页脚年份显示是否正确"
echo ""
echo "查看日志:"
echo "  docker logs conference-frontend-prod"
echo ""
echo "重启服务:"
echo "  $DOCKER_COMPOSE -f docker-compose.prod.yml restart frontend"
echo ""

