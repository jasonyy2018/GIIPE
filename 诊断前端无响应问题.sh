#!/bin/bash

# 诊断前端3000端口无响应问题

set -e

echo "=========================================="
echo "🔍 诊断前端无响应问题"
echo "=========================================="
echo ""

CONTAINER_NAME="conference-frontend-prod"

# 1. 检查容器状态
echo "[1/8] 检查容器状态..."
docker ps -a | grep "$CONTAINER_NAME" || echo "容器不存在"
echo ""

# 2. 检查容器是否在运行
echo "[2/8] 检查容器运行状态..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ 容器正在运行"
else
    echo "❌ 容器未运行"
    echo "检查容器日志..."
    docker logs --tail 50 "$CONTAINER_NAME"
fi
echo ""

# 3. 检查资源使用情况
echo "[3/8] 检查资源使用情况..."
docker stats --no-stream "$CONTAINER_NAME" 2>/dev/null || echo "无法获取资源使用情况"
echo ""

# 4. 检查内存使用
echo "[4/8] 检查内存使用..."
MEMORY_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" "$CONTAINER_NAME" 2>/dev/null | awk '{print $1}' || echo "N/A")
echo "内存使用: $MEMORY_USAGE"
echo "内存限制: 2G"
echo ""

# 5. 检查端口监听
echo "[5/8] 检查端口3000是否监听..."
docker exec "$CONTAINER_NAME" sh -c "netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000" 2>/dev/null || echo "端口3000未监听"
echo ""

# 6. 检查进程
echo "[6/8] 检查Node.js进程..."
docker exec "$CONTAINER_NAME" ps aux | grep -E "node|next" || echo "Node.js进程未运行"
echo ""

# 7. 检查最近的日志（错误）
echo "[7/8] 检查最近的错误日志..."
docker logs --tail 100 "$CONTAINER_NAME" 2>&1 | grep -iE "error|fatal|crash|killed|oom|memory" | tail -20 || echo "未发现明显错误"
echo ""

# 8. 检查容器重启次数
echo "[8/8] 检查容器重启次数..."
RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
echo "容器重启次数: $RESTART_COUNT"
echo ""

# 9. 测试容器内访问
echo "[9/9] 测试容器内访问..."
docker exec "$CONTAINER_NAME" wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -5 || echo "❌ 容器内无法访问"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="

