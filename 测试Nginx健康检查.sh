#!/bin/bash

# 测试 Nginx 健康检查

echo "=========================================="
echo "🧪 测试 Nginx 健康检查"
echo "=========================================="
echo ""

echo "[1/4] 测试 Nginx 健康检查端点（从容器内）..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    wget -q -O- --timeout=5 http://127.0.0.1/health 2>&1 || \
    wget -q -O- --timeout=5 http://localhost/health 2>&1 || \
    curl -s --max-time 5 http://localhost/health || \
    echo '所有方法都失败'
"

echo ""
echo "[2/4] 测试从外部访问 Nginx（端口 8085）..."
curl -s --max-time 5 http://localhost:8085/health || echo "❌ 无法访问"

echo ""
echo "[3/4] 测试通过 Nginx 访问后端 API..."
curl -s --max-time 5 http://localhost:8085/api/health || echo "❌ 无法访问后端"

echo ""
echo "[4/4] 检查 Nginx 访问日志..."
docker compose -f docker-compose.prod.yml logs nginx --tail 20 | grep -E "health|/api/health" || echo "没有相关日志"

echo ""
echo "=========================================="
echo "📋 如果健康检查失败，但 Nginx 正常工作："
echo "=========================================="
echo "可以修改 docker-compose.prod.yml 中的健康检查命令"
echo "或者暂时禁用健康检查（将 condition 改为 service_started）"
echo ""

