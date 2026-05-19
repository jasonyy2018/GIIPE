#!/bin/bash

# 验证首页HTML内容（确认链接是否存在）

set -e

echo "=========================================="
echo "🔍 验证首页HTML内容"
echo "=========================================="
echo ""

echo "[1/5] 获取首页HTML..."
echo "----------------------------------------"
echo "正在获取（最多等待10秒）..."
HTML=$(timeout 12 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT_ERROR")
HTML_LENGTH=${#HTML}

if [ "$HTML" = "TIMEOUT_ERROR" ] || [ $HTML_LENGTH -eq 0 ]; then
    echo "❌ HTML获取失败或超时"
    if [ "$HTML" = "TIMEOUT_ERROR" ]; then
        echo "   原因: 请求超时（虽然诊断显示有响应，但获取时超时）"
        echo "   这可能意味着："
        echo "   1. 响应很大，传输很慢"
        echo "   2. 连接问题"
        echo ""
        echo "   尝试使用head只获取前1000字符..."
        HTML=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=8 --max-redirect=0 http://127.0.0.1:3000/ 2>&1 | head -c 5000 || echo "TIMEOUT_ERROR")
        HTML_LENGTH=${#HTML}
        if [ "$HTML" != "TIMEOUT_ERROR" ] && [ $HTML_LENGTH -gt 0 ]; then
            echo "   ✅ 成功获取部分HTML（前5000字符）"
        else
            echo "   ❌ 仍然失败"
            exit 1
        fi
    else
        echo "   原因: 响应为空"
        exit 1
    fi
else
    echo "✅ 获取成功，HTML长度: $HTML_LENGTH 字符"
fi

echo ""
echo "[2/5] 检查关键内容..."
echo "----------------------------------------"
if echo "$HTML" | grep -q "UPCOMING EVENTS"; then
    echo "✅ 包含 'UPCOMING EVENTS' 文本"
    # 显示上下文
    echo "$HTML" | grep -A 2 -B 2 "UPCOMING EVENTS" | head -5
else
    echo "❌ 不包含 'UPCOMING EVENTS' 文本"
fi

echo ""
if echo "$HTML" | grep -q "CONTACT US"; then
    echo "✅ 包含 'CONTACT US' 文本"
else
    echo "❌ 不包含 'CONTACT US' 文本"
fi

echo ""
echo "[3/5] 检查链接元素..."
echo "----------------------------------------"
# 检查 /events 链接
EVENTS_LINKS=$(echo "$HTML" | grep -o 'href="/events"[^>]*' | head -5)
if [ -n "$EVENTS_LINKS" ]; then
    echo "✅ 找到 /events 链接:"
    echo "$EVENTS_LINKS" | head -3
else
    echo "❌ 未找到 /events 链接"
fi

echo ""
# 检查 /contact 链接
CONTACT_LINKS=$(echo "$HTML" | grep -o 'href="/contact"[^>]*' | head -5)
if [ -n "$CONTACT_LINKS" ]; then
    echo "✅ 找到 /contact 链接:"
    echo "$CONTACT_LINKS" | head -3
else
    echo "❌ 未找到 /contact 链接"
fi

echo ""
echo "[4/5] 检查Next.js客户端JavaScript..."
echo "----------------------------------------"
# 检查是否有Next.js的客户端JS引用
NEXT_JS=$(echo "$HTML" | grep -o '_next/static/chunks/[^"]*\.js' | head -5)
if [ -n "$NEXT_JS" ]; then
    echo "✅ 找到Next.js客户端JS文件:"
    echo "$NEXT_JS" | head -3
    echo ""
    echo "   检查这些文件是否可访问..."
    FIRST_JS=$(echo "$NEXT_JS" | head -1)
    if docker exec conference-frontend-prod test -f "/app/.next/static/chunks/$(basename $FIRST_JS 2>/dev/null)" 2>/dev/null; then
        echo "   ✅ JS文件存在于容器中"
    else
        echo "   ⚠️  JS文件路径可能不正确"
    fi
else
    echo "❌ 未找到Next.js客户端JS文件引用"
fi

echo ""
echo "[5/5] 检查HTML结构..."
echo "----------------------------------------"
if echo "$HTML" | grep -q "<!DOCTYPE html\|<html"; then
    echo "✅ 包含HTML文档结构"
else
    echo "❌ 不包含HTML文档结构"
fi

if echo "$HTML" | grep -q "<body"; then
    echo "✅ 包含body标签"
else
    echo "❌ 不包含body标签"
fi

if echo "$HTML" | grep -q "__next\|react-root"; then
    echo "✅ 包含Next.js hydration标记"
else
    echo "⚠️  未找到Next.js hydration标记"
fi

echo ""
echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
if echo "$HTML" | grep -q "UPCOMING EVENTS" && echo "$HTML" | grep -q 'href="/events"'; then
    echo "✅ 服务器端HTML正常，包含关键内容和链接"
    echo ""
    echo "如果浏览器中点击没反应，问题在客户端："
    echo "  1. 客户端JavaScript未加载"
    echo "  2. Next.js路由未初始化"
    echo "  3. 浏览器控制台有错误"
    echo ""
    echo "浏览器端诊断步骤："
    echo "  1. 打开首页"
    echo "  2. 打开开发者工具 (F12)"
    echo "  3. 查看Console标签 - 是否有错误？"
    echo "  4. 查看Network标签 - JS文件是否加载成功？"
    echo "  5. 尝试点击按钮 - 是否有网络请求？"
    echo "  6. 检查Elements标签 - 链接元素是否存在？"
else
    echo "⚠️  服务器端HTML可能不完整"
fi
echo ""

