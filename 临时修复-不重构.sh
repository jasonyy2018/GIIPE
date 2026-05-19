#!/bin/bash

# 临时修复运行一段时间后崩溃问题（不重构）

set -e

echo "=========================================="
echo "🔧 临时修复崩溃问题（不重构）"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/5] 检查前端容器状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    echo "   当前内存使用:"
    docker stats --no-stream conference-frontend-prod | tail -1 | awk '{print "   " $4 " / " $6}'
    
    echo ""
    echo "   当前进程状态:"
    docker exec conference-frontend-prod ps aux | grep -E "node|next" | head -3
else
    echo "❌ 前端容器未运行，无法修复"
    exit 1
fi

echo ""
echo "[2/5] 重启前端容器（清理内存）..."
echo "   这将清理当前内存状态，但问题可能会再次出现"
docker-compose -f docker-compose.prod.yml restart frontend

echo ""
echo "[3/5] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "[4/5] 检查容器健康状态..."
if docker ps | grep -q conference-frontend-prod; then
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' conference-frontend-prod 2>/dev/null || echo "unknown")
    echo "   健康状态: $HEALTH"
    
    if [ "$HEALTH" = "healthy" ]; then
        echo "   ✅ 容器健康"
    else
        echo "   ⚠️  容器不健康，等待中..."
        sleep 30
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' conference-frontend-prod 2>/dev/null || echo "unknown")
        echo "   当前健康状态: $HEALTH"
    fi
else
    echo "   ❌ 容器未运行"
    exit 1
fi

echo ""
echo "[5/5] 测试访问..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|304"; then
    echo "   ✅ 端口3000可访问"
else
    echo "   ⚠️  端口3000可能无法访问，请检查日志"
fi

echo ""
echo "=========================================="
echo "✅ 临时修复完成"
echo "=========================================="
echo ""
echo "⚠️  重要提示:"
echo "   这只是临时修复，通过重启容器清理内存"
echo "   内存泄漏问题仍然存在，可能会再次出现"
echo ""
echo "   建议:"
echo "   1. 监控内存使用: docker stats conference-frontend-prod"
echo "   2. 如果问题再次出现，需要重构应用修复"
echo "   3. 可以设置定时重启（cron）作为临时方案"
echo ""
echo "   设置定时重启（每天凌晨3点）:"
echo "   0 3 * * * cd ~/dockerdata/GIIPE && docker-compose -f docker-compose.prod.yml restart frontend"
echo ""

