#!/bin/bash

# 快速测试首页（带超时保护）

set -e

echo "=========================================="
echo "🔍 快速测试首页（带超时保护）"
echo "=========================================="
echo ""

echo "[1/3] 测试首页响应（10秒超时）..."
echo "----------------------------------------"
echo "正在获取首页HTML（最多等待10秒）..."

# 使用timeout命令保护，最多等待10秒
RESPONSE=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=8 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT_OR_ERROR")
RESPONSE_LENGTH=${#RESPONSE}

if [ "$RESPONSE" = "TIMEOUT_OR_ERROR" ] || [ $RESPONSE_LENGTH -eq 0 ]; then
    echo "❌ 获取失败或超时"
    echo ""
    echo "可能原因："
    echo "  1. 首页响应很慢（超过10秒）"
    echo "  2. SSR渲染卡住"
    echo "  3. 服务器问题"
    echo ""
    echo "检查服务器状态..."
    docker exec conference-frontend-prod ps aux | grep node | head -3
    echo ""
    echo "检查最近日志..."
    docker logs --tail 20 conference-frontend-prod | tail -10
    exit 1
fi

echo "✅ 获取成功，响应长度: $RESPONSE_LENGTH 字符"

echo ""
echo "[2/3] 检查关键内容..."
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
    echo "   链接HTML片段:"
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
echo "[3/3] 检查HTML结构..."
echo "----------------------------------------"
if echo "$RESPONSE" | grep -q "<!DOCTYPE html\|<html"; then
    echo "✅ 包含HTML文档结构"
    HTML_TITLE=$(echo "$RESPONSE" | grep -oE "<title>[^<]*</title>" | head -1 || echo "未找到")
    echo "   标题: $HTML_TITLE"
else
    echo "❌ 不包含HTML文档结构"
fi

if echo "$RESPONSE" | grep -q "_next/static"; then
    echo "✅ 包含Next.js静态资源引用"
else
    echo "❌ 不包含Next.js静态资源引用"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
if echo "$RESPONSE" | grep -q "UPCOMING EVENTS" && echo "$RESPONSE" | grep -q 'href="/events"'; then
    echo "✅ 首页HTML正常，包含关键内容和链接"
    echo ""
    echo "如果浏览器中点击没反应，问题在客户端："
    echo "  1. 客户端JavaScript未加载"
    echo "  2. Next.js路由未初始化"
    echo "  3. 浏览器控制台有错误"
    echo ""
    echo "建议："
    echo "  1. 在浏览器中打开首页"
    echo "  2. 打开开发者工具 (F12)"
    echo "  3. 查看Console标签是否有错误"
    echo "  4. 查看Network标签，检查JS文件是否加载"
else
    echo "⚠️  首页HTML可能不完整"
    echo "  需要进一步检查"
fi
echo ""

