#!/bin/bash

# 检查后端启动问题
echo "=========================================="
echo "🔍 检查后端启动问题"
echo "=========================================="

cd "$(dirname "$0")"

echo ""
echo "📋 步骤 1: 检查容器状态..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📋 步骤 2: 查看后端日志（最后50行）..."
docker compose -f docker-compose.prod.yml logs backend --tail 50

echo ""
echo "📋 步骤 3: 检查后端健康检查..."
docker compose -f docker-compose.prod.yml exec backend curl -f http://localhost:3001/api/health || echo "健康检查失败"

echo ""
echo "📋 步骤 4: 检查数据库连接..."
docker compose -f docker-compose.prod.yml exec backend npx prisma db pull || echo "数据库连接失败"

echo ""
echo "=========================================="
echo "✅ 检查完成"
echo "=========================================="

