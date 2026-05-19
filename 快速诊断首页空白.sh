#!/bin/bash

# 快速诊断首页空白问题

echo "=========================================="
echo "🔍 快速诊断首页空白问题"
echo "=========================================="
echo ""

FRONTEND_CONTAINER="conference-frontend-prod"

# 1. 检查容器状态
echo "[1/5] 检查容器状态..."
docker ps | grep "$FRONTEND_CONTAINER" || echo "❌ 容器未运行"
echo ""

# 2. 测试健康检查端点
echo "[2/5] 测试健康检查端点..."
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | head -3
echo ""

# 3. 获取首页HTML（前100行）
echo "[3/5] 获取首页HTML（前100行）..."
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -100
echo ""

# 4. 检查最近的错误日志
echo "[4/5] 检查最近的错误日志..."
docker logs --tail 50 "$FRONTEND_CONTAINER" 2>&1 | grep -iE "error|failed|exception|crash|blank|empty" | tail -10 || echo "未发现明显错误"
echo ""

# 5. 检查SSR相关日志
echo "[5/5] 检查SSR相关日志..."
docker logs --tail 100 "$FRONTEND_CONTAINER" 2>&1 | grep -E "SSR|Homepage|fetching|events|conferences" | tail -10
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "如果HTML为空或只有基本结构，可能是："
echo "1. SSR渲染失败"
echo "2. API请求超时"
echo "3. 组件渲染错误"
echo ""
echo "查看完整日志: docker logs --tail 200 $FRONTEND_CONTAINER"

