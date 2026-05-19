#!/bin/bash

# 诊断端口3000无响应问题

set -e

echo "=========================================="
echo "🔍 诊断端口3000无响应问题"
echo "=========================================="
echo ""

FRONTEND_CONTAINER="conference-frontend-prod"

# 1. 检查容器状态和端口映射
echo "[1/8] 检查容器状态和端口映射..."
docker ps | grep "$FRONTEND_CONTAINER"
echo ""

# 2. 检查端口监听（容器内）
echo "[2/8] 检查端口3000监听（容器内）..."
docker exec "$FRONTEND_CONTAINER" netstat -tlnp 2>/dev/null | grep :3000 || \
docker exec "$FRONTEND_CONTAINER" ss -tlnp 2>/dev/null | grep :3000 || \
echo "❌ 端口3000未监听"
echo ""

# 3. 检查进程
echo "[3/8] 检查Node.js进程..."
docker exec "$FRONTEND_CONTAINER" ps aux | grep -E "node|next" || echo "❌ 进程未运行"
echo ""

# 4. 测试容器内访问（localhost）
echo "[4/8] 测试容器内访问 (127.0.0.1:3000)..."
echo "尝试1: wget..."
docker exec "$FRONTEND_CONTAINER" timeout 10 wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -20 || echo "❌ wget超时或无响应"
echo ""

# 5. 测试容器内访问（0.0.0.0）
echo "[5/8] 测试容器内访问 (0.0.0.0:3000)..."
docker exec "$FRONTEND_CONTAINER" timeout 10 wget -q -O- --timeout=10 http://0.0.0.0:3000/ 2>&1 | head -20 || echo "❌ wget超时或无响应"
echo ""

# 6. 测试容器IP访问
echo "[6/8] 测试容器IP访问..."
FRONTEND_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$FRONTEND_CONTAINER" 2>/dev/null || echo "")
if [ -n "$FRONTEND_IP" ]; then
    echo "前端容器IP: $FRONTEND_IP"
    echo "从主机测试:"
    timeout 10 curl -v --max-time 10 "http://$FRONTEND_IP:3000/" 2>&1 | head -30 || echo "❌ curl超时或无响应"
else
    echo "❌ 无法获取容器IP"
fi
echo ""

# 7. 检查端口映射
echo "[7/8] 检查端口映射..."
docker port "$FRONTEND_CONTAINER" 2>/dev/null || echo "无法获取端口映射"
echo ""

# 8. 检查环境变量和配置
echo "[8/8] 检查环境变量..."
docker exec "$FRONTEND_CONTAINER" sh -c 'echo "HOSTNAME: $HOSTNAME"; echo "PORT: $PORT"; echo "NODE_ENV: $NODE_ENV"'
echo ""

# 9. 检查Next.js启动日志
echo "[9/9] 检查Next.js启动日志..."
docker logs "$FRONTEND_CONTAINER" 2>&1 | grep -E "Ready|Starting|Local|Network|listening" | tail -10
echo ""

# 10. 测试健康检查端点（对比）
echo "[10/10] 测试健康检查端点（对比）..."
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果健康检查端点可以访问但根路径不能："
echo "1. 可能是SSR渲染超时"
echo "2. 可能是API请求阻塞"
echo "3. 可能是Next.js配置问题"
echo ""
echo "检查完整日志: docker logs --tail 200 $FRONTEND_CONTAINER"

