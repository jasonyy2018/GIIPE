#!/bin/bash

# 最终诊断首页问题（使用wget）

set -e

echo "=========================================="
echo "🔍 最终诊断首页问题"
echo "=========================================="
echo ""

echo "[1/6] 测试首页响应时间..."
echo "----------------------------------------"
echo "正在获取首页响应..."
START_TIME=$(date +%s)
RESPONSE=$(docker exec conference-frontend-prod wget -q -O- --timeout=30 http://127.0.0.1:3000/ 2>&1)
END_TIME=$(date +%s)
RESPONSE_TIME=$((END_TIME - START_TIME))
RESPONSE_LENGTH=${#RESPONSE}

echo "响应时间: ${RESPONSE_TIME} 秒"
echo "响应长度: $RESPONSE_LENGTH 字符"

if [ $RESPONSE_LENGTH -eq 0 ]; then
    echo "❌ 响应为空"
    exit 1
fi

echo ""
echo "[2/6] 检查HTML结构..."
echo "----------------------------------------"
if echo "$RESPONSE" | grep -q "<!DOCTYPE html\|<html"; then
    echo "✅ 包含HTML文档结构"
    HTML_TITLE=$(echo "$RESPONSE" | grep -oE "<title>[^<]*</title>" | head -1 || echo "未找到")
    echo "   标题: $HTML_TITLE"
else
    echo "❌ 不包含HTML文档结构"
fi

echo ""
echo "[3/6] 检查关键内容..."
echo "----------------------------------------"
if echo "$RESPONSE" | grep -q "UPCOMING EVENTS"; then
    echo "✅ 包含 'UPCOMING EVENTS'"
else
    echo "❌ 不包含 'UPCOMING EVENTS'"
fi

if echo "$RESPONSE" | grep -q "CONTACT US"; then
    echo "✅ 包含 'CONTACT US'"
else
    echo "❌ 不包含 'CONTACT US'"
fi

if echo "$RESPONSE" | grep -q 'href="/events"'; then
    echo "✅ 包含 '/events' 链接"
    # 显示链接上下文
    echo "$RESPONSE" | grep -A 2 -B 2 'href="/events"' | head -5
else
    echo "❌ 不包含 '/events' 链接"
fi

if echo "$RESPONSE" | grep -q 'href="/contact"'; then
    echo "✅ 包含 '/contact' 链接"
else
    echo "❌ 不包含 '/contact' 链接"
fi

echo ""
echo "[4/6] 检查Next.js资源..."
echo "----------------------------------------"
if echo "$RESPONSE" | grep -q "_next/static"; then
    echo "✅ 包含Next.js静态资源引用"
    STATIC_COUNT=$(echo "$RESPONSE" | grep -o "_next/static[^\"]*" | sort -u | wc -l)
    echo "   静态资源数量: $STATIC_COUNT"
    echo "$RESPONSE" | grep -o "_next/static[^\"]*" | sort -u | head -5
else
    echo "❌ 不包含Next.js静态资源引用"
fi

echo ""
echo "[5/6] 检查SSR数据..."
echo "----------------------------------------"
# 检查是否有SSR数据（事件和会议）
if echo "$RESPONSE" | grep -q "events\|conferences\|event-card"; then
    echo "✅ 可能包含SSR数据"
else
    echo "⚠️  未找到明显的SSR数据标记"
fi

# 检查是否有客户端hydration标记
if echo "$RESPONSE" | grep -q "__next\|react-root\|hydration"; then
    echo "✅ 包含客户端hydration标记"
else
    echo "⚠️  未找到客户端hydration标记"
fi

echo ""
echo "[6/6] 显示HTML片段（包含链接的部分）..."
echo "----------------------------------------"
# 显示包含链接的HTML片段
echo "$RESPONSE" | grep -A 5 -B 5 'href="/events"\|href="/contact"' | head -20 || echo "未找到链接"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "总结:"
if [ $RESPONSE_LENGTH -gt 1000 ] && echo "$RESPONSE" | grep -q "UPCOMING EVENTS"; then
    echo "  ✅ 首页HTML正常，包含关键内容"
    echo "  ✅ 响应时间正常: ${RESPONSE_TIME} 秒"
    echo ""
    echo "  如果浏览器中点击没反应，可能是："
    echo "    1. 客户端JavaScript未加载"
    echo "    2. Next.js路由未初始化"
    echo "    3. 浏览器控制台有错误"
    echo ""
    echo "  建议："
    echo "    1. 在浏览器中打开首页"
    echo "    2. 打开开发者工具 (F12)"
    echo "    3. 查看Console标签是否有错误"
    echo "    4. 查看Network标签，检查JS文件是否加载"
    echo "    5. 尝试点击按钮，观察是否有网络请求"
elif [ $RESPONSE_LENGTH -gt 0 ]; then
    echo "  ⚠️  首页HTML存在但不完整"
    echo "  可能原因："
    echo "    1. SSR渲染不完整"
    echo "    2. 部分内容在客户端渲染"
    echo "    3. HTML被截断"
else
    echo "  ❌ 首页HTML为空或获取失败"
    echo "  需要检查服务器状态"
fi
echo ""

