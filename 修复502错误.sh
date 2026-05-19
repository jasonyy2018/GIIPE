#!/bin/bash

# 修复 502 Bad Gateway 错误

echo "=========================================="
echo "🔧 修复 502 Bad Gateway 错误"
echo "=========================================="
echo ""

echo "[1/5] 检查 Nginx 错误日志..."
docker compose -f docker-compose.prod.yml logs nginx --tail 50 | grep -iE "error|502|upstream|connect|failed" | head -20

echo ""
echo "[2/5] 测试 Nginx 到后端的连接..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    wget -q -O- --timeout=5 http://backend:3001/api/health 2>&1 | head -5 || echo '❌ 无法连接到后端'
"

echo ""
echo "[3/5] 检查 Nginx 配置中的 upstream..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    grep -A 3 'upstream backend' /etc/nginx/conf.d/default.conf 2>/dev/null || echo '无法读取配置'
"

echo ""
echo "[4/5] 临时修复：移除 Nginx 对前端的依赖（如果前端有问题）..."
echo "⚠️  注意：这需要修改 docker-compose.prod.yml"
echo "   将 depends_on 中的 frontend 条件改为 service_started 或移除"

echo ""
echo "[5/5] 快速修复：重启 Nginx..."
docker compose -f docker-compose.prod.yml restart nginx
sleep 3
docker compose -f docker-compose.prod.yml ps nginx

echo ""
echo "=========================================="
echo "📋 如果问题仍然存在："
echo "=========================================="
echo "1. 检查前端服务状态："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""
echo "2. 临时禁用前端依赖（编辑 docker-compose.prod.yml）："
echo "   将 depends_on 中的 frontend 条件改为 service_started"
echo ""
echo "3. 或者直接访问后端（绕过 Nginx）："
echo "   http://your-server-ip:3001/api/health"
echo ""

