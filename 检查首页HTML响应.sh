#!/bin/bash

# 详细检查首页HTML响应

set -e

echo "=========================================="
echo "🔍 详细检查首页HTML响应"
echo "=========================================="
echo ""

echo "[1/5] 测试首页响应（完整输出）..."
echo "----------------------------------------"
echo "正在获取响应..."
RESPONSE=$(docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "ERROR: wget failed")
RESPONSE_LENGTH=${#RESPONSE}
echo "响应长度: $RESPONSE_LENGTH 字符"

if [ $RESPONSE_LENGTH -eq 0 ] || echo "$RESPONSE" | grep -q "ERROR"; then
    echo "❌ 响应为空或获取失败"
    echo "尝试使用curl..."
    RESPONSE=$(docker exec conference-frontend-prod curl -s --max-time 10 http://127.0.0.1:3000/ 2>&1 || echo "ERROR: curl failed")
    RESPONSE_LENGTH=${#RESPONSE}
    echo "curl响应长度: $RESPONSE_LENGTH 字符"
    if [ $RESPONSE_LENGTH -eq 0 ] || echo "$RESPONSE" | grep -q "ERROR"; then
        echo "❌ 两种方法都失败，检查服务器状态"
        docker exec conference-frontend-prod ps aux | grep node
        exit 1
    fi
fi

echo ""
echo "[2/5] 检查响应开头（前500字符）..."
echo "----------------------------------------"
echo "$RESPONSE" | head -c 500
echo ""
echo ""

echo ""
echo "[3/5] 检查是否包含关键元素..."
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
else
    echo "❌ 不包含 '/events' 链接"
fi

if echo "$RESPONSE" | grep -q 'href="/contact"'; then
    echo "✅ 包含 '/contact' 链接"
else
    echo "❌ 不包含 '/contact' 链接"
fi

if echo "$RESPONSE" | grep -q "<!DOCTYPE html\|<html"; then
    echo "✅ 包含HTML文档结构"
else
    echo "❌ 不包含HTML文档结构"
fi

if echo "$RESPONSE" | grep -q "_next/static"; then
    echo "✅ 包含Next.js静态资源引用"
else
    echo "❌ 不包含Next.js静态资源引用"
fi

echo ""
echo "[4/5] 检查响应状态码..."
echo "----------------------------------------"
STATUS=$(docker exec conference-frontend-prod wget -q -O- --spider --timeout=10 http://127.0.0.1:3000/ 2>&1 | grep -oE "HTTP/[0-9.]+ [0-9]+" | tail -1 || echo "未知")
echo "状态码: $STATUS"

echo ""
echo "[5/5] 检查响应末尾（最后200字符）..."
echo "----------------------------------------"
echo "$RESPONSE" | tail -c 200
echo ""

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "如果响应为空或不包含关键元素，可能原因："
echo "  1. SSR渲染超时或失败"
echo "  2. Next.js服务器未正确启动"
echo "  3. 内存不足导致渲染失败"
echo "  4. 构建问题导致HTML不完整"
echo ""

