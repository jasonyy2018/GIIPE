#!/bin/bash

# 修复前端健康检查问题

set -e

echo "=========================================="
echo "🔧 修复前端健康检查问题"
echo "=========================================="
echo ""

CONTAINER_NAME="conference-frontend-prod"

# 1. 检查当前健康状态
echo "[1/6] 检查当前健康状态..."
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
echo "健康状态: $HEALTH_STATUS"
echo ""

# 2. 测试不同的健康检查方法
echo "[2/6] 测试健康检查方法..."

echo "测试1: wget (健康检查端点)..."
docker exec "$CONTAINER_NAME" wget --no-verbose --tries=1 --spider --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | head -5 || echo "wget失败"

echo ""
echo "测试2: curl (健康检查端点)..."
docker exec "$CONTAINER_NAME" curl -f -s --max-time 5 http://127.0.0.1:3000/api/health >/dev/null 2>&1 && echo "curl成功" || echo "curl失败"

echo ""
echo "测试3: wget (根路径)..."
docker exec "$CONTAINER_NAME" wget --no-verbose --tries=1 --spider --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -5 || echo "wget失败"

echo ""
echo "测试4: curl (根路径)..."
docker exec "$CONTAINER_NAME" curl -f -s --max-time 5 http://127.0.0.1:3000/ >/dev/null 2>&1 && echo "curl成功" || echo "curl失败"

echo ""
echo "测试5: 检查进程..."
docker exec "$CONTAINER_NAME" pgrep -f 'node server.js' >/dev/null && echo "进程运行中" || echo "进程未运行"

echo ""

# 3. 测试健康检查端点
echo "[3/6] 测试健康检查端点..."
docker exec "$CONTAINER_NAME" curl -s --max-time 5 http://127.0.0.1:3000/api/health 2>&1 | head -5 || echo "健康检查端点无响应"
echo ""

# 4. 检查端口监听
echo "[4/6] 检查端口监听..."
docker exec "$CONTAINER_NAME" netstat -tlnp 2>/dev/null | grep :3000 || docker exec "$CONTAINER_NAME" ss -tlnp 2>/dev/null | grep :3000 || echo "端口未监听"
echo ""

# 5. 检查Next.js日志
echo "[5/6] 检查Next.js启动日志..."
docker logs "$CONTAINER_NAME" 2>&1 | grep -E "Ready|Starting|Error|Failed" | tail -10
echo ""

# 6. 测试从容器外访问
echo "[6/6] 测试从容器外访问..."
# 获取容器IP
CONTAINER_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME" 2>/dev/null || echo "")
if [ -n "$CONTAINER_IP" ]; then
    echo "容器IP: $CONTAINER_IP"
    curl -f -s --max-time 5 "http://$CONTAINER_IP:3000/" >/dev/null 2>&1 && echo "✅ 从容器外访问成功" || echo "❌ 从容器外访问失败"
else
    echo "无法获取容器IP"
fi
echo ""

# 7. 修复建议
echo "[7/7] 修复建议..."
echo ""
if [ "$HEALTH_STATUS" = "unhealthy" ]; then
    echo "⚠️  容器健康检查失败"
    echo ""
    echo "可能的原因："
    echo "1. Next.js服务器虽然启动但无法处理请求"
    echo "2. 健康检查命令过于严格"
    echo "3. 网络配置问题"
    echo ""
    echo "建议操作："
    echo "1. 重新构建前端（应用新的健康检查配置）"
    echo "   docker-compose -f docker-compose.prod.yml build --no-cache frontend"
    echo "   docker-compose -f docker-compose.prod.yml up -d frontend"
    echo ""
    echo "2. 或者临时禁用健康检查（不推荐）"
    echo "   在docker-compose.prod.yml中注释掉healthcheck部分"
    echo ""
    echo "3. 检查Next.js配置"
    echo "   docker exec $CONTAINER_NAME cat /app/package.json"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="

