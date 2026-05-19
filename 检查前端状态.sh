#!/bin/bash

# 快速检查前端状态

CONTAINER_NAME="conference-frontend-prod"

echo "=========================================="
echo "前端容器状态检查"
echo "=========================================="
echo ""

# 检查容器状态
echo "容器状态:"
docker ps -a | grep "$CONTAINER_NAME" || echo "容器不存在"
echo ""

# 检查资源使用
echo "资源使用情况:"
docker stats --no-stream "$CONTAINER_NAME" 2>/dev/null || echo "无法获取资源使用情况"
echo ""

# 检查最近的日志
echo "最近的日志（最后20行）:"
docker logs --tail 20 "$CONTAINER_NAME" 2>&1
echo ""

# 检查重启次数
RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
echo "容器重启次数: $RESTART_COUNT"
echo ""

# 测试端口
echo "测试端口3000:"
docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -3 || echo "❌ 端口无响应"
echo ""

