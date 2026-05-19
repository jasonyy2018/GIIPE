#!/bin/bash

# 诊断首页点击没反应问题

set -e

echo "=========================================="
echo "🔍 诊断首页点击没反应问题"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/8] 检查前端容器状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    CONTAINER_STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}")
    echo "   状态: $CONTAINER_STATUS"
else
    echo "❌ 前端容器未运行"
    exit 1
fi

echo ""
echo "[2/8] 检查Next.js服务器进程..."
if docker exec conference-frontend-prod ps aux | grep -q "node server.js"; then
    echo "✅ Next.js服务器进程运行中"
else
    echo "❌ Next.js服务器进程未运行"
    exit 1
fi

echo ""
echo "[3/8] 检查端口3000监听..."
if docker exec conference-frontend-prod netstat -tlnp 2>/dev/null | grep -q ":3000" || \
   docker exec conference-frontend-prod ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ 端口3000正在监听"
else
    echo "❌ 端口3000未监听"
fi

echo ""
echo "[4/8] 测试首页HTML响应..."
RESPONSE=$(docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 | head -100)
if echo "$RESPONSE" | grep -q "UPCOMING EVENTS\|CONTACT US"; then
    echo "✅ 首页HTML包含链接按钮"
    if echo "$RESPONSE" | grep -q 'href="/events"'; then
        echo "   ✅ 找到 /events 链接"
    else
        echo "   ⚠️  未找到 /events 链接"
    fi
    if echo "$RESPONSE" | grep -q 'href="/contact"'; then
        echo "   ✅ 找到 /contact 链接"
    else
        echo "   ⚠️  未找到 /contact 链接"
    fi
else
    echo "❌ 首页HTML响应异常"
    echo "$RESPONSE" | head -20
fi

echo ""
echo "[5/8] 检查Next.js客户端JS文件..."
# 检查_next/static目录
if docker exec conference-frontend-prod ls -la /app/.next/static 2>/dev/null | head -5; then
    echo "✅ Next.js静态文件目录存在"
else
    echo "❌ Next.js静态文件目录不存在或无法访问"
fi

echo ""
echo "[6/8] 检查最近的错误日志..."
echo "   最近50行日志（包含error/warn）:"
docker logs --tail 50 conference-frontend-prod 2>&1 | grep -iE "error|warn|hydration|mismatch" | head -10 || echo "   没有找到相关错误"

echo ""
echo "[7/8] 测试健康检查端点..."
if docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | grep -q "ok"; then
    echo "✅ 健康检查端点正常"
else
    echo "❌ 健康检查端点异常"
fi

echo ""
echo "[8/8] 检查Link组件代码..."
if grep -q 'from.*next/link' frontend/src/app/page.tsx; then
    echo "✅ 正确导入Link组件"
    if grep -q '<Link' frontend/src/app/page.tsx; then
        echo "✅ 使用了Link组件"
        echo "   链接数量: $(grep -c 'href=' frontend/src/app/page.tsx || echo 0)"
    else
        echo "❌ 未找到Link组件使用"
    fi
else
    echo "❌ 未正确导入Link组件"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "下一步检查:"
echo "  1. 在浏览器中打开首页"
echo "  2. 打开开发者工具 (F12)"
echo "  3. 查看Console标签是否有错误"
echo "  4. 查看Network标签，检查JS文件是否加载"
echo "  5. 尝试点击按钮，观察是否有网络请求"
echo ""
echo "如果控制台有hydration错误:"
echo "  - 可能是SSR和客户端渲染不一致"
echo "  - 检查是否有客户端特定的代码在SSR中运行"
echo ""
echo "如果JS文件未加载:"
echo "  - 检查Next.js构建是否成功"
echo "  - 检查是否有CSP阻止JS执行"
echo "  - 检查网络连接"
echo ""

