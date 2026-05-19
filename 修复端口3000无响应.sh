#!/bin/bash

# 修复端口3000无响应问题

set -e

echo "=========================================="
echo "🔧 修复端口3000无响应问题"
echo "=========================================="
echo ""

FRONTEND_CONTAINER="conference-frontend-prod"

# 1. 检查当前端口映射
echo "[1/6] 检查当前端口映射..."
docker port "$FRONTEND_CONTAINER" 2>/dev/null || echo "⚠️  无法获取端口映射信息"
echo ""

# 2. 检查容器内端口监听
echo "[2/6] 检查容器内端口监听..."
docker exec "$FRONTEND_CONTAINER" netstat -tlnp 2>/dev/null | grep :3000 || \
docker exec "$FRONTEND_CONTAINER" ss -tlnp 2>/dev/null | grep :3000 || \
echo "❌ 端口3000未监听"
echo ""

# 3. 测试容器内访问（带超时）
echo "[3/6] 测试容器内访问（10秒超时）..."
timeout 10 docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -30 || {
    echo "❌ 请求超时或无响应"
    echo "这可能是SSR渲染卡住了"
}
echo ""

# 4. 检查SSR相关日志
echo "[4/6] 检查SSR相关日志..."
docker logs --tail 50 "$FRONTEND_CONTAINER" 2>&1 | grep -E "SSR|Homepage|fetching|timeout|Error" | tail -15 || echo "未发现SSR相关日志"
echo ""

# 5. 测试简单端点（对比）
echo "[5/6] 测试简单端点（对比）..."
echo "健康检查端点:"
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1
echo ""
echo "如果健康检查可以访问但根路径不能，说明SSR渲染有问题"
echo ""

# 6. 修复建议
echo "[6/6] 修复建议..."
echo ""
echo "如果端口映射缺失，需要："
echo "1. 停止前端容器"
echo "2. 更新docker-compose.prod.yml添加ports配置"
echo "3. 重新启动: docker-compose -f docker-compose.prod.yml up -d frontend"
echo ""
echo "如果SSR渲染超时，需要："
echo "1. 检查后端API响应时间"
echo "2. 增加SSR超时时间"
echo "3. 或者禁用SSR，使用客户端渲染"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="

