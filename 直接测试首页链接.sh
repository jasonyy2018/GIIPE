#!/bin/bash

# 直接测试首页链接（最简单的方法）

set -e

echo "=========================================="
echo "🔍 直接测试首页链接"
echo "=========================================="
echo ""

echo "方法1: 使用wget获取HTML并检查链接（5秒超时）..."
echo "----------------------------------------"
RESPONSE=$(timeout 5 docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")

if [ "$RESPONSE" != "TIMEOUT" ] && [ ${#RESPONSE} -gt 0 ]; then
    echo "✅ 获取成功"
    echo ""
    echo "检查链接:"
    if echo "$RESPONSE" | grep -q 'href="/events"'; then
        echo "  ✅ 找到 /events 链接"
        echo "$RESPONSE" | grep 'href="/events"' | head -1
    else
        echo "  ❌ 未找到 /events 链接"
    fi
    
    if echo "$RESPONSE" | grep -q 'href="/contact"'; then
        echo "  ✅ 找到 /contact 链接"
        echo "$RESPONSE" | grep 'href="/contact"' | head -1
    else
        echo "  ❌ 未找到 /contact 链接"
    fi
    
    if echo "$RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "  ✅ 找到 'UPCOMING EVENTS' 文本"
    else
        echo "  ❌ 未找到 'UPCOMING EVENTS' 文本"
    fi
else
    echo "❌ 获取失败或超时"
    echo ""
    echo "尝试方法2: 检查健康检查端点..."
    HEALTH=$(docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1)
    echo "健康检查: $HEALTH"
    
    if echo "$HEALTH" | grep -q "ok"; then
        echo "✅ 服务器运行正常，但首页响应很慢或卡住"
        echo ""
        echo "可能原因："
        echo "  1. SSR渲染很慢（超过5秒）"
        echo "  2. SSR卡住或死锁"
        echo "  3. 内存不足"
        echo ""
        echo "建议："
        echo "  1. 检查内存使用: docker stats --no-stream conference-frontend-prod"
        echo "  2. 查看日志: docker logs --tail 50 conference-frontend-prod"
        echo "  3. 重启容器: docker-compose -f docker-compose.prod.yml restart frontend"
    else
        echo "❌ 服务器可能有问题"
    fi
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""

