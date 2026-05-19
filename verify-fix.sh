#!/bin/bash
# 验证 honorableGuests 字段修复是否成功
# 使用方法: ./verify-fix.sh

set -e

echo "=== 验证修复 ==="
echo ""

# 检查字段是否存在
echo "步骤 1: 检查数据库字段..."
FIELD_CHECK=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d conference_db -tAc "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'honorableGuests';" 2>/dev/null || echo "")

if [ -n "$FIELD_CHECK" ]; then
    echo "✅ 数据库字段存在: $FIELD_CHECK"
else
    echo "❌ 数据库字段不存在"
    exit 1
fi

echo ""
echo "步骤 2: 检查后端服务状态..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "conference-backend-prod.*Up"; then
    echo "✅ 后端服务运行中"
else
    echo "❌ 后端服务未运行"
    exit 1
fi

echo ""
echo "步骤 3: 检查后端日志（最近 20 行）..."
echo "--- 后端日志 ---"
docker-compose -f docker-compose.prod.yml logs backend --tail=20 | grep -i "error\|exception\|honorableGuests" || echo "✅ 未发现相关错误"

echo ""
echo "步骤 4: 测试 API 端点..."
echo "测试事件列表 API..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/api/events?status=PUBLISHED&limit=1 || echo "000")

if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API 响应正常 (HTTP 200)"
elif [ "$API_RESPONSE" = "429" ]; then
    echo "⚠️  API 返回 429 (请求限制)，但这是正常的限流响应"
else
    echo "⚠️  API 响应: HTTP $API_RESPONSE"
    echo "   可以手动测试: curl http://localhost:8085/api/events?status=PUBLISHED&limit=1"
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "如果看到错误，请检查:"
echo "  docker-compose -f docker-compose.prod.yml logs backend --tail=50"










