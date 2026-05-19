#!/bin/bash

# 修复首页卡住问题

set -e

echo "=========================================="
echo "🔧 修复首页卡住问题"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/4] 检查当前状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}")
    echo "   状态: $STATUS"
else
    echo "❌ 前端容器未运行"
    exit 1
fi

echo ""
echo "[2/4] 检查内存使用..."
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1 | awk '{print $4 " / " $6}')
echo "   当前内存使用: $MEMORY"

echo ""
echo "[3/4] 重启前端容器（清理状态）..."
echo "   这将："
echo "   - 清理当前内存状态"
echo "   - 重启Next.js服务器"
echo "   - 可能解决SSR卡住问题"
docker-compose -f docker-compose.prod.yml restart frontend

echo ""
echo "[4/4] 等待容器启动并验证..."
echo "   等待30秒让Next.js完全启动..."
sleep 30

echo ""
echo "   测试健康检查..."
for i in {1..6}; do
    if docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | grep -q "ok"; then
        echo "   ✅ 健康检查通过"
        break
    else
        if [ $i -eq 6 ]; then
            echo "   ⚠️  健康检查未通过，但继续测试"
        else
            echo "   等待5秒后重试 ($i/6)..."
            sleep 5
        fi
    fi
done

echo ""
echo "   测试首页响应（10秒超时）..."
HOME_RESPONSE=$(timeout 10 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")

if [ "$HOME_RESPONSE" != "TIMEOUT" ] && [ ${#HOME_RESPONSE} -gt 1000 ]; then
    if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "   ✅ 首页响应正常，包含关键内容"
        echo "   ✅ 修复成功"
    else
        echo "   ⚠️  首页有响应但不完整"
        echo "   建议运行: bash 诊断首页卡住问题.sh"
    fi
else
    echo "   ❌ 首页仍然超时或响应异常"
    echo "   建议："
    echo "     1. 运行详细诊断: bash 诊断首页卡住问题.sh"
    echo "     2. 检查SSR代码是否有问题"
    echo "     3. 考虑应用所有修复: bash 应用崩溃修复.sh"
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "如果问题仍然存在："
echo "  1. 运行详细诊断: bash 诊断首页卡住问题.sh"
echo "  2. 检查SSR日志: docker logs --tail 100 conference-frontend-prod | grep SSR"
echo "  3. 应用所有修复: bash 应用崩溃修复.sh"
echo ""

