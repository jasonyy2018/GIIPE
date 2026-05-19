#!/bin/bash

# 诊断首页卡住问题

set -e

echo "=========================================="
echo "🔍 诊断首页卡住问题"
echo "=========================================="
echo ""

echo "[1/6] 检查健康检查端点（应该很快）..."
echo "----------------------------------------"
HEALTH_TIME_START=$(date +%s)
HEALTH=$(docker exec conference-frontend-prod wget -q -O- --timeout=3 http://127.0.0.1:3000/api/health 2>&1)
HEALTH_TIME_END=$(date +%s)
HEALTH_TIME=$((HEALTH_TIME_END - HEALTH_TIME_START))
echo "健康检查响应时间: ${HEALTH_TIME} 秒"
echo "响应: $HEALTH"

if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ 健康检查正常（响应很快）"
else
    echo "❌ 健康检查异常"
fi

echo ""
echo "[2/6] 测试其他路由（/api/health 已测试，测试 /about）..."
echo "----------------------------------------"
ABOUT_RESPONSE=$(timeout 5 docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/about 2>&1 || echo "TIMEOUT")
if [ "$ABOUT_RESPONSE" != "TIMEOUT" ] && [ ${#ABOUT_RESPONSE} -gt 100 ]; then
    echo "✅ /about 路由正常（响应长度: ${#ABOUT_RESPONSE} 字符）"
else
    echo "⚠️  /about 路由也超时或异常"
fi

echo ""
echo "[3/6] 检查首页路由是否卡住..."
echo "----------------------------------------"
echo "尝试访问首页（10秒超时）..."
HOME_RESPONSE=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")

if [ "$HOME_RESPONSE" = "TIMEOUT" ]; then
    echo "❌ 首页响应超时（超过10秒）"
    echo ""
    echo "这说明首页SSR渲染卡住或很慢"
else
    echo "✅ 首页有响应（响应长度: ${#HOME_RESPONSE} 字符）"
    if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "✅ 包含关键内容"
    fi
fi

echo ""
echo "[4/6] 检查SSR日志（查找超时或错误）..."
echo "----------------------------------------"
SSR_LOGS=$(docker logs --tail 100 conference-frontend-prod 2>&1 | grep -iE "SSR|Homepage|timeout|Loaded data|Error" | tail -10 || echo "无SSR日志")
if [ "$SSR_LOGS" != "无SSR日志" ]; then
    echo "$SSR_LOGS"
else
    echo "⚠️  没有找到SSR相关日志"
    echo "   这可能意味着SSR没有执行，或者日志被抑制"
fi

echo ""
echo "[5/6] 检查最近的API请求日志..."
echo "----------------------------------------"
API_LOGS=$(docker logs --tail 50 conference-frontend-prod 2>&1 | grep -E "Server API|Fetching|Successfully" | tail -10)
if [ -n "$API_LOGS" ]; then
    echo "$API_LOGS"
    echo ""
    echo "✅ API请求日志正常，说明后端连接正常"
else
    echo "⚠️  没有找到API请求日志"
fi

echo ""
echo "[6/6] 检查内存和进程状态..."
echo "----------------------------------------"
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1 | awk '{print $4 " / " $6 " (" $7 ")"}')
echo "内存使用: $MEMORY"

PROCESSES=$(docker exec conference-frontend-prod ps aux | grep -E "node|next" | wc -l)
echo "Node.js进程数: $PROCESSES"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "关键发现："
if [ "$HOME_RESPONSE" = "TIMEOUT" ]; then
    echo "  ❌ 首页响应超时（超过10秒）"
    echo ""
    echo "  可能原因："
    echo "    1. SSR渲染卡住或死锁"
    echo "    2. API请求很慢（虽然日志显示成功）"
    echo "    3. Next.js路由处理问题"
    echo ""
    echo "  建议修复："
    echo "    1. 重启前端容器: docker-compose -f docker-compose.prod.yml restart frontend"
    echo "    2. 如果问题持续，检查SSR代码是否有死锁"
    echo "    3. 考虑增加SSR超时时间或优化API响应"
elif [ ${#HOME_RESPONSE} -gt 0 ]; then
    echo "  ✅ 首页有响应"
    if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "  ✅ 包含关键内容"
        echo ""
        echo "  如果浏览器中点击没反应，问题在客户端："
        echo "    1. 客户端JavaScript未加载"
        echo "    2. Next.js路由未初始化"
    else
        echo "  ⚠️  响应不完整"
    fi
fi
echo ""

