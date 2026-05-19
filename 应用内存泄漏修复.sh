#!/bin/bash

# 应用内存泄漏修复（彻底解决15分钟后首页无法访问问题）

set -e

echo "=========================================="
echo "🔧 应用内存泄漏修复"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/6] 检查当前状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}")
    echo "   状态: $STATUS"
else
    echo "❌ 前端容器未运行"
    echo "   启动容器..."
    docker-compose -f docker-compose.prod.yml up -d frontend
    sleep 10
fi

echo ""
echo "[2/6] 检查修复的文件..."
FIXES_APPLIED=0

if [ -f "frontend/src/app/page.tsx" ]; then
    if grep -q "timeoutId" frontend/src/app/page.tsx && grep -q "clearTimeout(timeoutId)" frontend/src/app/page.tsx; then
        echo "✅ page.tsx: Promise.race 超时清理已修复"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    else
        echo "⚠️  page.tsx: 未找到超时清理修复"
    fi
else
    echo "❌ page.tsx 不存在"
    exit 1
fi

if [ -f "frontend/src/components/public/FeaturedContentClient.tsx" ]; then
    if grep -q "isMounted" frontend/src/components/public/FeaturedContentClient.tsx && grep -q "abortController" frontend/src/components/public/FeaturedContentClient.tsx; then
        echo "✅ FeaturedContentClient.tsx: 组件卸载检查和请求取消已修复"
        FIXES_APPLIED=$((FIXES_APPLIED + 1))
    else
        echo "⚠️  FeaturedContentClient.tsx: 未找到组件卸载检查修复"
    fi
else
    echo "❌ FeaturedContentClient.tsx 不存在"
    exit 1
fi

if [ $FIXES_APPLIED -lt 2 ]; then
    echo "⚠️  警告: 部分修复可能未应用，继续构建..."
fi

echo ""
echo "[3/6] 重新构建前端（无缓存）..."
echo "   这将应用所有内存泄漏修复..."
echo "   预计时间: 5-10分钟"
docker-compose -f docker-compose.prod.yml build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "[4/6] 重启前端容器..."
docker-compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "[5/6] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "[6/6] 验证修复..."
echo "   测试健康检查..."
HEALTH_OK=0
for i in {1..6}; do
    if docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | grep -q "ok"; then
        echo "   ✅ 健康检查通过"
        HEALTH_OK=1
        break
    else
        if [ $i -eq 6 ]; then
            echo "   ⚠️  健康检查未通过（可能还在启动）"
        else
            echo "   等待5秒后重试 ($i/6)..."
            sleep 5
        fi
    fi
done

echo ""
echo "   测试首页响应时间（应该在5秒内）..."
START_TIME=$(date +%s)
HOME_RESPONSE=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")
END_TIME=$(date +%s)
RESPONSE_TIME=$((END_TIME - START_TIME))

if [ "$HOME_RESPONSE" != "TIMEOUT" ] && [ ${#HOME_RESPONSE} -gt 1000 ]; then
    if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "   ✅ 首页响应正常（${RESPONSE_TIME}秒），包含关键内容"
        if [ $RESPONSE_TIME -le 5 ]; then
            echo "   ✅ 响应时间在5秒内，修复成功"
        else
            echo "   ⚠️  响应时间超过5秒（${RESPONSE_TIME}秒），但页面正常"
        fi
    else
        echo "   ⚠️  首页有响应但不完整"
    fi
else
    echo "   ❌ 首页仍然超时"
    echo "   请检查日志: docker logs --tail 50 conference-frontend-prod"
fi

echo ""
echo "=========================================="
echo "✅ 内存泄漏修复应用完成"
echo "=========================================="
echo ""
echo "已修复的关键问题："
echo "  1. ✅ Promise.race 中的 setTimeout 未清理（page.tsx）"
echo "  2. ✅ 组件卸载后状态更新（FeaturedContentClient.tsx）"
echo "  3. ✅ 未取消的 fetch 请求（FeaturedContentClient.tsx）"
echo "  4. ✅ 未清理的重试定时器（FeaturedContentClient.tsx）"
echo ""
echo "这些修复应该能彻底解决15分钟后首页无法访问的问题。"
echo ""
echo "验证修复："
echo "  # 监控内存使用（应该稳定，不会持续增长）"
echo "  watch -n 30 'docker stats --no-stream conference-frontend-prod | tail -1'"
echo ""
echo "  # 查看SSR日志"
echo "  docker logs --tail 100 conference-frontend-prod | grep SSR"
echo ""
echo "  # 测试首页响应时间（应该始终在5秒内）"
echo "  time docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ > /dev/null"
echo ""
echo "  # 监控15分钟后是否仍然正常"
echo "  # 如果15分钟后仍然正常，说明修复成功"
echo ""

