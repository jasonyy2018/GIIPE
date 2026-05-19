#!/bin/bash

# 修复15分钟后首页打不开问题（不重构）

set -e

echo "=========================================="
echo "🔧 修复15分钟后首页打不开（不重构）"
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
    
    # 检查运行时间
    CONTAINER_START=$(docker inspect --format='{{.State.StartedAt}}' conference-frontend-prod 2>/dev/null || echo "")
    if [ -n "$CONTAINER_START" ]; then
        START_EPOCH=$(date -d "$CONTAINER_START" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        if [ $START_EPOCH -gt 0 ]; then
            UPTIME_SECONDS=$((NOW_EPOCH - START_EPOCH))
            UPTIME_MINUTES=$((UPTIME_SECONDS / 60))
            echo "   运行时间: ${UPTIME_MINUTES} 分钟"
            
            if [ $UPTIME_MINUTES -gt 15 ]; then
                echo "   ⚠️  运行超过15分钟，可能已经出现问题"
            fi
        fi
    fi
else
    echo "❌ 前端容器未运行"
    exit 1
fi

echo ""
echo "[2/6] 检查内存使用..."
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1)
MEMORY_USAGE=$(echo "$MEMORY" | awk '{print $4}')
MEMORY_LIMIT=$(echo "$MEMORY" | awk '{print $6}')
MEMORY_PERCENT=$(echo "$MEMORY" | awk '{print $7}' | sed 's/%//')
echo "   当前内存使用: $MEMORY_USAGE / $MEMORY_LIMIT ($MEMORY_PERCENT%)"

if [ -n "$MEMORY_PERCENT" ] && [ "$MEMORY_PERCENT" != "N/A" ]; then
    if (( $(echo "$MEMORY_PERCENT > 80" | bc -l 2>/dev/null || echo "0") )); then
        echo "   ⚠️  内存使用率超过80%，可能导致问题"
    fi
fi

echo ""
echo "[3/6] 检查进程数..."
PROCESS_COUNT=$(docker exec conference-frontend-prod ps aux | grep -c "node" || echo "0")
echo "   Node.js进程数: $PROCESS_COUNT"
if [ "$PROCESS_COUNT" -gt 10 ]; then
    echo "   ⚠️  进程数过多，可能有内存泄漏"
fi

echo ""
echo "[4/6] 重启前端容器（清理状态）..."
echo "   这将："
echo "   - 清理当前内存状态"
echo "   - 清理SSR缓存"
echo "   - 重启Next.js服务器"
echo "   - 可能暂时解决问题"
docker-compose -f docker-compose.prod.yml restart frontend

echo ""
echo "[5/6] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "[6/6] 验证修复..."
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
HOME_RESPONSE=$(timeout 12 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")

if [ "$HOME_RESPONSE" != "TIMEOUT" ] && [ ${#HOME_RESPONSE} -gt 1000 ]; then
    if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
        echo "   ✅ 首页响应正常，包含关键内容"
        echo "   ✅ 临时修复成功"
    else
        echo "   ⚠️  首页有响应但不完整"
    fi
else
    echo "   ❌ 首页仍然超时"
    echo "   需要应用代码修复（重构）"
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "⚠️  重要提示:"
echo "   这只是临时修复，通过重启容器清理状态"
echo "   问题可能会在15分钟后再次出现"
echo ""
echo "   彻底解决方案:"
echo "   1. 应用代码修复（需要重构）: bash 应用崩溃修复.sh"
echo "   2. 设置定时重启（每12小时）: bash 设置定时重启-临时方案.sh"
echo "   3. 增加内存限制（缓解）: 修改docker-compose.prod.yml，增加memory限制"
echo ""

