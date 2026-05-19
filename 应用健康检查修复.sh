#!/bin/bash

# 应用健康检查修复 - 重新构建前端以使用新的健康检查端点

set -e

echo "=========================================="
echo "🔧 应用健康检查修复"
echo "=========================================="
echo ""

echo "此脚本将："
echo "1. 停止前端容器"
echo "2. 重新构建前端（包含新的健康检查端点）"
echo "3. 启动前端容器"
echo "4. 验证健康检查"
echo ""

read -p "是否继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 1
fi

echo ""
echo "[1/4] 停止前端容器..."
docker-compose -f docker-compose.prod.yml stop frontend
echo "✅ 前端容器已停止"
echo ""

echo "[2/4] 重新构建前端..."
echo "⚠️  这可能需要几分钟..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
    exit 1
fi
echo ""

echo "[3/4] 启动前端容器..."
docker-compose -f docker-compose.prod.yml up -d frontend
echo "✅ 前端容器已启动"
echo ""

echo "[4/4] 等待前端启动并验证健康检查..."
echo "等待30秒让Next.js完全启动..."
sleep 30

echo ""
echo "测试健康检查端点..."
for i in {1..6}; do
    echo "尝试 $i/6..."
    if docker exec conference-frontend-prod curl -f -s --max-time 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
        echo "✅ 健康检查端点响应正常"
        break
    else
        if [ $i -eq 6 ]; then
            echo "❌ 健康检查端点无响应"
        else
            echo "等待5秒后重试..."
            sleep 5
        fi
    fi
done

echo ""
echo "检查容器健康状态..."
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' conference-frontend-prod 2>/dev/null || echo "unknown")
echo "健康状态: $HEALTH_STATUS"

if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "starting" ]; then
    echo "✅ 容器健康状态正常"
else
    echo "⚠️  容器健康状态: $HEALTH_STATUS"
    echo "查看日志..."
    docker logs --tail 50 conference-frontend-prod
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "查看实时日志: docker-compose -f docker-compose.prod.yml logs -f frontend"
echo "检查健康状态: docker inspect --format='{{.State.Health.Status}}' conference-frontend-prod"

