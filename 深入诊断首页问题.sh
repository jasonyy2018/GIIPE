#!/bin/bash

# 深入诊断首页问题

set -e

echo "=========================================="
echo "🔍 深入诊断首页问题"
echo "=========================================="
echo ""

echo "[1/10] 检查容器和进程状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 容器运行中"
    docker ps --filter "name=conference-frontend-prod" --format "状态: {{.Status}}"
else
    echo "❌ 容器未运行"
    exit 1
fi

echo ""
echo "[2/10] 检查Node.js进程..."
docker exec conference-frontend-prod ps aux | grep -E "node|next" | head -5

echo ""
echo "[3/10] 测试健康检查端点..."
HEALTH=$(docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1)
echo "健康检查响应: $HEALTH"

echo ""
echo "[4/10] 测试首页响应（使用wget，显示状态码）..."
echo "   正在测试（最多等待15秒）..."
STATUS=$(timeout 15 docker exec conference-frontend-prod wget -q -O- --spider --timeout=15 http://127.0.0.1:3000/ 2>&1 | grep -oE "HTTP/[0-9.]+ [0-9]+" | tail -1 | awk '{print $2}' || echo "UNKNOWN")
echo "HTTP状态码: $STATUS"

if [ "$STATUS" = "UNKNOWN" ]; then
    echo "⚠️  无法获取状态码，尝试直接测试..."
    # 直接测试响应
    TEST_RESPONSE=$(docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ 2>&1 | head -c 100)
    if [ ${#TEST_RESPONSE} -gt 0 ]; then
        echo "   ✅ 首页有响应（长度: ${#TEST_RESPONSE}+ 字符）"
        STATUS="200"
    else
        echo "   ❌ 首页无响应"
        STATUS="000"
    fi
elif [ "$STATUS" != "200" ] && [ "$STATUS" != "304" ]; then
    echo "⚠️  状态码异常: $STATUS"
fi

echo ""
echo "[5/10] 获取首页HTML（前1000字符）..."
echo "   正在获取（最多等待15秒）..."
HTML=$(timeout 20 docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT_ERROR")
HTML_LENGTH=${#HTML}
echo "HTML长度: $HTML_LENGTH 字符"

if [ "$HTML" = "TIMEOUT_ERROR" ] || [ $HTML_LENGTH -eq 0 ]; then
    echo "❌ HTML获取失败或为空"
    if [ "$HTML" = "TIMEOUT_ERROR" ]; then
        echo "   原因: 请求超时（SSR可能很慢或卡住）"
    else
        echo "   原因: 响应为空"
    fi
    echo ""
    echo "   检查最近的SSR日志..."
    docker logs --tail 50 conference-frontend-prod | grep -E "SSR|Homepage|timeout|Loaded data" | tail -10 || echo "   没有找到SSR相关日志"
else
    echo "✅ HTML获取成功"
    echo "HTML开头（前500字符）:"
    echo "$HTML" | head -c 500
    echo ""
    echo ""
fi

echo ""
echo "[6/10] 检查是否包含关键元素..."
if [ $HTML_LENGTH -gt 0 ]; then
    if echo "$HTML" | grep -q "UPCOMING EVENTS"; then
        echo "✅ 包含 'UPCOMING EVENTS'"
    else
        echo "❌ 不包含 'UPCOMING EVENTS'"
    fi
    
    if echo "$HTML" | grep -q "CONTACT US"; then
        echo "✅ 包含 'CONTACT US'"
    else
        echo "❌ 不包含 'CONTACT US'"
    fi
    
    if echo "$HTML" | grep -q 'href="/events"'; then
        echo "✅ 包含 '/events' 链接"
    else
        echo "❌ 不包含 '/events' 链接"
    fi
    
    if echo "$HTML" | grep -q 'href="/contact"'; then
        echo "✅ 包含 '/contact' 链接"
    else
        echo "❌ 不包含 '/contact' 链接"
    fi
    
    if echo "$HTML" | grep -q "<!DOCTYPE html\|<html"; then
        echo "✅ 包含HTML文档结构"
    else
        echo "❌ 不包含HTML文档结构"
    fi
    
    if echo "$HTML" | grep -q "_next/static"; then
        echo "✅ 包含Next.js静态资源引用"
        echo "   静态资源数量: $(echo "$HTML" | grep -o "_next/static[^\"]*" | sort -u | wc -l)"
    else
        echo "❌ 不包含Next.js静态资源引用"
    fi
fi

echo ""
echo "[7/10] 检查SSR日志（最近100行）..."
SSR_LOGS=$(docker logs --tail 100 conference-frontend-prod 2>&1 | grep -iE "SSR|Homepage|page|timeout|error" || echo "无相关日志")
if [ "$SSR_LOGS" != "无相关日志" ]; then
    echo "$SSR_LOGS" | head -20
else
    echo "⚠️  没有找到SSR相关日志"
    echo "   这可能意味着："
    echo "   1. SSR没有执行"
    echo "   2. 日志被过滤掉了"
    echo "   3. 首页使用了静态生成"
fi

echo ""
echo "[8/10] 检查所有日志（最近50行，不过滤）..."
echo "----------------------------------------"
docker logs --tail 50 conference-frontend-prod 2>&1 | tail -30

echo ""
echo "[9/10] 检查内存使用..."
docker stats --no-stream conference-frontend-prod | tail -1 | awk '{print "内存使用: " $4 " / " $6 " (" $7 ")"}'

echo ""
echo "[10/10] 检查Next.js构建文件..."
if docker exec conference-frontend-prod test -f /app/server.js; then
    echo "✅ server.js 存在"
    SERVER_SIZE=$(docker exec conference-frontend-prod stat -c%s /app/server.js 2>/dev/null || echo "未知")
    echo "   server.js 大小: $SERVER_SIZE 字节"
else
    echo "❌ server.js 不存在"
fi

if docker exec conference-frontend-prod test -d /app/.next; then
    echo "✅ .next 目录存在"
    NEXT_FILES=$(docker exec conference-frontend-prod find /app/.next -type f 2>/dev/null | wc -l)
    echo "   .next 文件数量: $NEXT_FILES"
else
    echo "❌ .next 目录不存在"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "关键发现："
if [ $HTML_LENGTH -eq 0 ]; then
    echo "  ❌ HTML响应为空 - 这是主要问题"
    echo "  建议："
    echo "    1. 检查SSR是否失败"
    echo "    2. 检查内存是否充足"
    echo "    3. 重启前端容器"
    echo "    4. 如果问题持续，重新构建"
elif [ "$STATUS" != "200" ] && [ "$STATUS" != "304" ]; then
    echo "  ⚠️  HTTP状态码异常: $STATUS"
    echo "  建议：检查服务器错误日志"
else
    echo "  ✅ HTTP响应正常"
    if echo "$HTML" | grep -q "UPCOMING EVENTS"; then
        echo "  ✅ HTML包含关键内容"
        echo "  如果浏览器中点击没反应，可能是客户端JS问题"
    else
        echo "  ❌ HTML不包含关键内容"
        echo "  可能是SSR渲染失败"
    fi
fi
echo ""

