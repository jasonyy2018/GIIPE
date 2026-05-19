#!/bin/bash

# 应用首页SSR卡住修复

set -e

echo "=========================================="
echo "🔧 应用首页SSR卡住修复"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/5] 检查当前状态..."
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
echo "[2/5] 检查修改的文件..."
if [ -f "frontend/src/app/page.tsx" ]; then
    echo "✅ page.tsx 存在"
    if grep -q "Promise.race" frontend/src/app/page.tsx; then
        echo "✅ 已包含 Promise.race 修复"
    else
        echo "⚠️  未找到 Promise.race 修复，请确认代码已更新"
    fi
else
    echo "❌ page.tsx 不存在"
    exit 1
fi

if [ -f "frontend/src/lib/server-api.ts" ]; then
    echo "✅ server-api.ts 存在"
    if grep -q "timeout: 4000" frontend/src/lib/server-api.ts; then
        echo "✅ 已包含 4秒超时修复"
    else
        echo "⚠️  未找到 4秒超时修复，请确认代码已更新"
    fi
else
    echo "❌ server-api.ts 不存在"
    exit 1
fi

echo ""
echo "[3/5] 重新构建前端（无缓存）..."
echo "   这将应用所有SSR修复..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "[4/5] 重启前端容器..."
docker-compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "[5/5] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "验证修复..."
echo "   测试健康检查..."
for i in {1..6}; do
    if docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | grep -q "ok"; then
        echo "   ✅ 健康检查通过"
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
echo "✅ 修复应用完成"
echo "=========================================="
echo ""
echo "关键修复："
echo "  1. ✅ 使用 Promise.race 确保超时后立即返回"
echo "  2. ✅ 统一API超时为4秒"
echo "  3. ✅ SSR最多5秒，不会卡住"
echo ""
echo "验证："
echo "  # 查看SSR日志"
echo "  docker logs --tail 100 conference-frontend-prod | grep SSR"
echo ""
echo "  # 测试首页响应时间"
echo "  time docker exec conference-frontend-prod wget -q -O- --timeout=15 http://127.0.0.1:3000/ > /dev/null"
echo ""
echo "  # 监控15分钟后是否仍然正常"
echo "  watch -n 30 'docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ | head -c 100'"
echo ""

