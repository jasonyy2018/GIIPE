#!/bin/bash

# 快速验证首页链接（只检查关键部分）

set -e

echo "=========================================="
echo "🔍 快速验证首页链接"
echo "=========================================="
echo ""

echo "[1/3] 获取首页HTML开头（前10000字符，快速）..."
echo "----------------------------------------"
echo "正在获取（最多等待8秒）..."
HTML_HEAD=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=8 http://127.0.0.1:3000/ 2>&1 | head -c 10000 || echo "TIMEOUT")

if [ "$HTML_HEAD" = "TIMEOUT" ] || [ ${#HTML_HEAD} -eq 0 ]; then
    echo "❌ 获取失败"
    exit 1
fi

echo "✅ 获取成功，长度: ${#HTML_HEAD} 字符"

echo ""
echo "[2/3] 检查关键内容..."
echo "----------------------------------------"
if echo "$HTML_HEAD" | grep -q "UPCOMING EVENTS"; then
    echo "✅ 包含 'UPCOMING EVENTS'"
    # 显示包含链接的上下文
    echo ""
    echo "   包含UPCOMING EVENTS的HTML片段:"
    echo "$HTML_HEAD" | grep -A 3 -B 3 "UPCOMING EVENTS" | head -10
else
    echo "❌ 不包含 'UPCOMING EVENTS'"
fi

echo ""
if echo "$HTML_HEAD" | grep -q 'href="/events"'; then
    echo "✅ 包含 '/events' 链接"
    echo ""
    echo "   链接HTML:"
    echo "$HTML_HEAD" | grep -o 'href="/events"[^>]*>.*</a>' | head -3
else
    echo "❌ 不包含 '/events' 链接"
    echo ""
    echo "   搜索所有包含'events'的内容:"
    echo "$HTML_HEAD" | grep -i "events" | head -5
fi

echo ""
if echo "$HTML_HEAD" | grep -q 'href="/contact"'; then
    echo "✅ 包含 '/contact' 链接"
else
    echo "❌ 不包含 '/contact' 链接"
fi

echo ""
echo "[3/3] 检查Next.js客户端JS引用..."
echo "----------------------------------------"
if echo "$HTML_HEAD" | grep -q "_next/static"; then
    echo "✅ 包含Next.js静态资源引用"
    JS_FILES=$(echo "$HTML_HEAD" | grep -o '_next/static/chunks/[^"]*\.js' | head -3)
    if [ -n "$JS_FILES" ]; then
        echo "   找到的JS文件:"
        echo "$JS_FILES"
    fi
else
    echo "❌ 不包含Next.js静态资源引用"
fi

echo ""
echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
if echo "$HTML_HEAD" | grep -q "UPCOMING EVENTS" && echo "$HTML_HEAD" | grep -q 'href="/events"'; then
    echo "✅ 服务器端HTML正常，包含关键内容和链接"
    echo ""
    echo "如果浏览器中点击没反应，问题在客户端："
    echo "  1. 打开浏览器开发者工具 (F12)"
    echo "  2. 查看Console标签 - 是否有错误？"
    echo "  3. 查看Network标签 - JS文件是否加载？"
    echo "  4. 在Console中运行:"
    echo "     document.querySelector('a[href=\"/events\"]')?.click()"
else
    echo "⚠️  需要检查完整HTML"
    echo "   运行: bash 验证首页HTML内容.sh"
fi
echo ""

