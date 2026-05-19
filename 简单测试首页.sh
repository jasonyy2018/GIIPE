#!/bin/bash

# 简单测试首页（不使用bc，避免卡住）

set -e

echo "=========================================="
echo "🔍 简单测试首页"
echo "=========================================="
echo ""

echo "[1/4] 测试首页响应..."
echo "----------------------------------------"
echo "正在获取首页HTML..."
RESPONSE=$(docker exec conference-frontend-prod wget -q -O- --timeout=30 http://127.0.0.1:3000/ 2>&1)
RESPONSE_LENGTH=${#RESPONSE}

echo "响应长度: $RESPONSE_LENGTH 字符"

if [ $RESPONSE_LENGTH -eq 0 ]; then
    echo "❌ 响应为空"
    exit 1
fi

echo ""
echo "[2/4] 检查关键内容..."
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
    echo ""
    echo "链接上下文:"
    echo "$RESPONSE" | grep -A 3 -B 3 'href="/events"' | head -10
else
    echo "❌ 不包含 '/events' 链接"
fi

if echo "$RESPONSE" | grep -q 'href="/contact"'; then
    echo "✅ 包含 '/contact' 链接"
else
    echo "❌ 不包含 '/contact' 链接"
fi

echo ""
echo "[3/4] 检查HTML结构..."
echo "----------------------------------------"
if echo "$RESPONSE" | grep -q "<!DOCTYPE html\|<html"; then
    echo "✅ 包含HTML文档结构"
else
    echo "❌ 不包含HTML文档结构"
fi

if echo "$RESPONSE" | grep -q "_next/static"; then
    echo "✅ 包含Next.js静态资源引用"
    STATIC_COUNT=$(echo "$RESPONSE" | grep -o "_next/static[^\"]*" | sort -u | wc -l)
    echo "   静态资源数量: $STATIC_COUNT"
else
    echo "❌ 不包含Next.js静态资源引用"
fi

echo ""
echo "[4/4] 显示HTML片段（包含按钮的部分）..."
echo "----------------------------------------"
# 显示包含按钮的HTML片段
echo "$RESPONSE" | grep -A 10 -B 10 'UPCOMING EVENTS\|CONTACT US' | head -30 || echo "未找到按钮"

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
if [ $RESPONSE_LENGTH -gt 1000 ] && echo "$RESPONSE" | grep -q "UPCOMING EVENTS"; then
    echo "✅ 首页HTML正常，包含关键内容和链接"
    echo ""
    echo "如果浏览器中点击没反应，问题在客户端："
    echo "  1. 打开浏览器开发者工具 (F12)"
    echo "  2. 查看Console标签是否有错误"
    echo "  3. 查看Network标签，检查JS文件是否加载"
    echo "  4. 检查Next.js路由是否初始化"
else
    echo "⚠️  首页HTML可能不完整"
    echo "  需要进一步检查"
fi
echo ""

