#!/bin/bash

# 快速修复前端无响应问题

set -e

echo "=========================================="
echo "🔧 快速修复前端无响应问题"
echo "=========================================="
echo ""

CONTAINER_NAME="conference-frontend-prod"

# 1. 检查当前状态
echo "[1/5] 检查当前状态..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ 容器正在运行"
    RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_NAME" 2>/dev/null || echo "0")
    echo "重启次数: $RESTART_COUNT"
    
    if [ "$RESTART_COUNT" -gt 10 ]; then
        echo "⚠️  重启次数过多，可能存在严重问题"
    fi
else
    echo "❌ 容器未运行，尝试启动..."
    docker-compose -f docker-compose.prod.yml up -d frontend
    sleep 10
fi
echo ""

# 2. 检查资源使用
echo "[2/5] 检查资源使用..."
docker stats --no-stream "$CONTAINER_NAME" 2>/dev/null || echo "无法获取资源使用情况"
echo ""

# 3. 检查端口
echo "[3/5] 检查端口3000..."
if docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    echo "✅ 端口3000正常响应"
else
    echo "❌ 端口3000无响应，尝试重启..."
    docker-compose -f docker-compose.prod.yml restart frontend
    echo "等待10秒..."
    sleep 10
    
    # 再次检查
    if docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://127.0.0.1:3000/ >/dev/null 2>&1; then
        echo "✅ 重启后端口3000正常响应"
    else
        echo "❌ 重启后仍然无响应，查看日志..."
        docker logs --tail 50 "$CONTAINER_NAME"
    fi
fi
echo ""

# 4. 检查最近的错误
echo "[4/5] 检查最近的错误..."
docker logs --tail 50 "$CONTAINER_NAME" 2>&1 | grep -iE "error|fatal|crash|killed|oom|memory|out of memory" | tail -10 || echo "未发现明显错误"
echo ""

# 5. 建议
echo "[5/5] 修复建议..."
echo ""
echo "如果问题持续存在，建议："
echo "1. 重新构建前端（应用内存限制和重启策略修复）"
echo "   docker-compose -f docker-compose.prod.yml build --no-cache frontend"
echo "   docker-compose -f docker-compose.prod.yml up -d frontend"
echo ""
echo "2. 检查服务器资源"
echo "   free -h"
echo "   df -h"
echo ""
echo "3. 查看详细日志"
echo "   docker-compose -f docker-compose.prod.yml logs frontend --tail 200"
echo ""

echo "=========================================="
echo "修复完成"
echo "=========================================="

