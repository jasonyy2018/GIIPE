#!/bin/bash

# 诊断首页客户端问题（SSR正常但页面不正常）

set -e

echo "=========================================="
echo "🔍 诊断首页客户端问题"
echo "=========================================="
echo ""

echo "[1/8] 检查首页HTML内容..."
echo "----------------------------------------"
HTML_CONTENT=$(docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")
HTML_LENGTH=${#HTML_CONTENT}

if [ "$HTML_CONTENT" = "TIMEOUT" ]; then
    echo "❌ 首页响应超时"
    exit 1
fi

echo "✅ 首页有响应（长度: $HTML_LENGTH 字符）"

# 检查关键内容
if echo "$HTML_CONTENT" | grep -q "UPCOMING EVENTS"; then
    echo "✅ 包含 'UPCOMING EVENTS'"
else
    echo "❌ 缺少 'UPCOMING EVENTS'"
fi

if echo "$HTML_CONTENT" | grep -q "FeaturedContentClient\|featured-content"; then
    echo "✅ 包含客户端组件标记"
else
    echo "⚠️  未找到客户端组件标记"
fi

# 检查JavaScript错误标记
if echo "$HTML_CONTENT" | grep -qi "error\|exception\|undefined"; then
    echo "⚠️  可能包含错误标记"
fi

echo ""
echo "[2/8] 检查JavaScript文件..."
echo "----------------------------------------"
# 检查是否有_next/static文件
JS_FILES=$(echo "$HTML_CONTENT" | grep -oE '_next/static/[^"]*\.js' | head -3 || echo "")
if [ -n "$JS_FILES" ]; then
    echo "✅ 找到JavaScript文件:"
    echo "$JS_FILES" | while read -r js_file; do
        echo "   - $js_file"
    done
else
    echo "⚠️  未找到JavaScript文件"
fi

echo ""
echo "[3/8] 检查SSR数据..."
echo "----------------------------------------"
SSR_DATA=$(echo "$HTML_CONTENT" | grep -oE 'eventsCount|conferencesCount' || echo "")
if [ -n "$SSR_DATA" ]; then
    echo "✅ 找到SSR数据标记"
else
    echo "⚠️  未找到SSR数据标记"
fi

# 检查是否有初始数据
if echo "$HTML_CONTENT" | grep -qE '"events":\[|"conferences":\['; then
    echo "✅ 可能包含初始数据"
else
    echo "⚠️  未找到初始数据JSON"
fi

echo ""
echo "[4/8] 检查最近的错误日志..."
echo "----------------------------------------"
ERROR_LOGS=$(docker logs --tail 200 conference-frontend-prod 2>&1 | grep -iE "error|Error|ERROR|exception|Exception|undefined|TypeError|ReferenceError" | tail -20 || echo "无错误日志")
if [ "$ERROR_LOGS" != "无错误日志" ] && [ -n "$ERROR_LOGS" ]; then
    echo "⚠️  发现错误日志:"
    echo "$ERROR_LOGS" | head -10
else
    echo "✅ 没有明显的错误日志"
fi

echo ""
echo "[5/8] 检查客户端组件日志..."
echo "----------------------------------------"
CLIENT_LOGS=$(docker logs --tail 200 conference-frontend-prod 2>&1 | grep -E "FeaturedContentClient|client|Client" | tail -10 || echo "无客户端日志")
if [ "$CLIENT_LOGS" != "无客户端日志" ] && [ -n "$CLIENT_LOGS" ]; then
    echo "客户端组件日志:"
    echo "$CLIENT_LOGS"
else
    echo "⚠️  没有客户端组件日志（可能组件未执行）"
fi

echo ""
echo "[6/8] 检查hydration相关日志..."
echo "----------------------------------------"
HYDRATION_LOGS=$(docker logs --tail 200 conference-frontend-prod 2>&1 | grep -iE "hydration|Hydration|mismatch|Mismatch" | tail -10 || echo "无hydration日志")
if [ "$HYDRATION_LOGS" != "无hydration日志" ] && [ -n "$HYDRATION_LOGS" ]; then
    echo "⚠️  发现hydration相关日志:"
    echo "$HYDRATION_LOGS"
else
    echo "✅ 没有hydration错误"
fi

echo ""
echo "[7/8] 检查useEffect依赖项问题..."
echo "----------------------------------------"
# 检查代码中是否有useEffect依赖项问题
if grep -q "initialEvents.length, initialConferences.length" frontend/src/components/public/FeaturedContentClient.tsx 2>/dev/null; then
    echo "✅ useEffect依赖项使用length（正确）"
else
    echo "⚠️  useEffect依赖项可能有问题"
fi

echo ""
echo "[8/8] 检查组件初始状态..."
echo "----------------------------------------"
# 检查组件是否正确设置初始状态
if grep -q "setEvents(initialEvents)" frontend/src/components/public/FeaturedContentClient.tsx 2>/dev/null; then
    echo "✅ 组件会设置初始状态"
else
    echo "⚠️  组件可能未设置初始状态"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "可能的问题："
echo "  1. 客户端JavaScript错误（检查浏览器控制台）"
echo "  2. Hydration错误（SSR和客户端渲染不匹配）"
echo "  3. useEffect依赖项导致无限循环"
echo "  4. 组件初始状态未正确设置"
echo ""
echo "建议："
echo "  1. 在浏览器中打开首页，查看控制台错误"
echo "  2. 检查网络标签，查看JavaScript文件是否加载"
echo "  3. 检查React DevTools，查看组件状态"
echo ""

