#!/bin/bash

# 临时修复SSR卡住问题（不重构）

set -e

echo "=========================================="
echo "🔧 临时修复SSR卡住问题（不重构）"
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
    exit 1
fi

echo ""
echo "[2/5] 检查内存使用..."
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1 | awk '{print $4 " / " $6}')
echo "   当前内存使用: $MEMORY"

echo ""
echo "[3/5] 重启前端容器（清理SSR状态）..."
echo "   这将："
echo "   - 清理当前SSR缓存"
echo "   - 重启Next.js服务器"
echo "   - 可能暂时解决SSR卡住问题"
docker-compose -f docker-compose.prod.yml restart frontend

echo ""
echo "[4/5] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "[5/5] 验证修复..."
echo "   测试健康检查..."
for i in {1..6}; do
    if docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | grep -q "ok"; then
        echo "   ✅ 健康检查通过"
        break
    else
        if [ $i -eq 6 ]; then
            echo "   ⚠️  健康检查未通过"
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
        echo "   ✅ 临时修复成功"
        echo ""
        echo "   ⚠️  注意：这只是临时修复"
        echo "   问题可能会再次出现（通常几小时到几天后）"
        echo "   建议尽快应用代码修复（重构）以彻底解决"
    else
        echo "   ⚠️  首页有响应但不完整"
    fi
else
    echo "   ❌ 首页仍然超时"
    echo ""
    echo "   临时修复无效，需要代码修复（重构）"
    echo "   建议运行: bash 应用崩溃修复.sh"
fi

echo ""
echo "=========================================="
echo "临时修复完成"
echo "=========================================="
echo ""
echo "⚠️  重要提示:"
echo "   这只是临时修复，通过重启容器清理状态"
echo "   SSR卡住问题仍然存在，可能会再次出现"
echo ""
echo "   彻底解决方案:"
echo "   1. 应用代码修复（需要重构）: bash 应用崩溃修复.sh"
echo "   2. 或者设置定时重启（每天凌晨3点）: bash 设置定时重启-临时方案.sh"
echo ""

