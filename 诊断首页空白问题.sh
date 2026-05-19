#!/bin/bash

# 全面诊断首页空白问题

set -e

echo "=========================================="
echo "🔍 诊断首页空白问题"
echo "=========================================="
echo ""

FRONTEND_CONTAINER="conference-frontend-prod"
NGINX_CONTAINER="conference-nginx-prod"
BACKEND_CONTAINER="conference-backend-prod"

# 1. 检查容器状态
echo "[1/12] 检查容器状态..."
echo "前端容器:"
docker ps | grep "$FRONTEND_CONTAINER" || echo "❌ 前端容器未运行"
echo ""
echo "Nginx容器:"
docker ps | grep "$NGINX_CONTAINER" || echo "❌ Nginx容器未运行"
echo ""
echo "后端容器:"
docker ps | grep "$BACKEND_CONTAINER" || echo "❌ 后端容器未运行"
echo ""

# 2. 直接测试前端容器
echo "[2/12] 直接测试前端容器 (http://frontend:3000/)..."
FRONTEND_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$FRONTEND_CONTAINER" 2>/dev/null || echo "")
if [ -n "$FRONTEND_IP" ]; then
    echo "前端容器IP: $FRONTEND_IP"
    echo "测试根路径:"
    docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -20 || echo "❌ 无响应"
    echo ""
    echo "测试健康检查端点:"
    docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 || echo "❌ 无响应"
else
    echo "❌ 无法获取前端容器IP"
fi
echo ""

# 3. 测试从nginx访问前端
echo "[3/12] 测试从nginx访问前端..."
docker exec "$NGINX_CONTAINER" wget -q -O- --timeout=10 http://frontend:3000/ 2>&1 | head -20 || echo "❌ Nginx无法访问前端"
echo ""

# 4. 测试nginx对外服务
echo "[4/12] 测试nginx对外服务..."
NGINX_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$NGINX_CONTAINER" 2>/dev/null || echo "")
if [ -n "$NGINX_IP" ]; then
    echo "Nginx容器IP: $NGINX_IP"
    echo "测试根路径:"
    curl -s --max-time 10 "http://$NGINX_IP/" | head -30 || echo "❌ 无响应"
else
    echo "❌ 无法获取Nginx容器IP"
fi
echo ""

# 5. 检查前端日志（SSR相关）
echo "[5/12] 检查前端日志（SSR和错误）..."
docker logs --tail 100 "$FRONTEND_CONTAINER" 2>&1 | grep -E "SSR|Error|Failed|Exception|timeout|fetch" | tail -20 || echo "未发现明显错误"
echo ""

# 6. 检查后端连接
echo "[6/12] 检查后端API连接..."
BACKEND_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$BACKEND_CONTAINER" 2>/dev/null || echo "")
if [ -n "$BACKEND_IP" ]; then
    echo "后端容器IP: $BACKEND_IP"
    echo "测试后端健康检查:"
    docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://backend:3001/health 2>&1 || echo "❌ 后端无响应"
    echo ""
    echo "测试后端API:"
    docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 "http://backend:3001/api/events?status=PUBLISHED&limit=1" 2>&1 | head -5 || echo "❌ API无响应"
else
    echo "❌ 无法获取后端容器IP"
fi
echo ""

# 7. 检查静态资源
echo "[7/12] 检查静态资源..."
echo "测试CSS文件:"
docker exec "$FRONTEND_CONTAINER" ls -la /app/public/ 2>/dev/null | head -5 || echo "❌ public目录不存在"
echo ""
echo "测试图片:"
docker exec "$FRONTEND_CONTAINER" test -f /app/public/images/icons/giip-logo.png && echo "✅ Logo文件存在" || echo "❌ Logo文件不存在"
echo ""

# 8. 检查Next.js构建
echo "[8/12] 检查Next.js构建..."
docker exec "$FRONTEND_CONTAINER" ls -la /app/.next/static 2>/dev/null | head -5 || echo "❌ .next/static目录不存在"
echo ""
docker exec "$FRONTEND_CONTAINER" test -f /app/server.js && echo "✅ server.js存在" || echo "❌ server.js不存在"
echo ""

# 9. 检查环境变量
echo "[9/12] 检查关键环境变量..."
docker exec "$FRONTEND_CONTAINER" sh -c 'echo "NODE_ENV: $NODE_ENV"; echo "PORT: $PORT"; echo "HOSTNAME: $HOSTNAME"; echo "SERVER_API_URL: $SERVER_API_URL"' 2>/dev/null || echo "无法获取环境变量"
echo ""

# 10. 检查网络连接
echo "[10/12] 检查网络连接..."
echo "前端到后端:"
docker exec "$FRONTEND_CONTAINER" ping -c 2 backend 2>/dev/null | tail -2 || echo "❌ 无法ping通后端"
echo ""
echo "前端到nginx:"
docker exec "$FRONTEND_CONTAINER" ping -c 2 nginx 2>/dev/null | tail -2 || echo "❌ 无法ping通nginx"
echo ""

# 11. 检查nginx配置
echo "[11/12] 检查nginx配置..."
docker exec "$NGINX_CONTAINER" nginx -t 2>&1 || echo "❌ Nginx配置有错误"
echo ""

# 12. 获取实际HTML响应
echo "[12/12] 获取实际HTML响应..."
echo "从前端容器获取:"
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -50
echo ""
echo "从nginx获取:"
if [ -n "$NGINX_IP" ]; then
    curl -s --max-time 10 "http://$NGINX_IP/" | head -50
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "建议检查："
echo "1. 查看完整前端日志: docker logs --tail 200 $FRONTEND_CONTAINER"
echo "2. 查看nginx日志: docker logs --tail 100 $NGINX_CONTAINER"
echo "3. 在浏览器中打开开发者工具（F12）查看Console和Network标签"
echo "4. 检查是否有JavaScript错误或资源加载失败"

