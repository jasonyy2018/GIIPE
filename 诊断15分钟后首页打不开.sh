#!/bin/bash

# 诊断前端运行15分钟后首页打不开的问题

set -e

echo "=========================================="
echo "🔍 诊断15分钟后首页打不开问题"
echo "=========================================="
echo ""

echo "[1/8] 检查容器运行时间..."
echo "----------------------------------------"
CONTAINER_START=$(docker inspect --format='{{.State.StartedAt}}' conference-frontend-prod 2>/dev/null || echo "unknown")
CONTAINER_UPTIME=$(docker inspect --format='{{.State.Status}}' conference-frontend-prod 2>/dev/null || echo "unknown")
echo "容器启动时间: $CONTAINER_START"
echo "容器状态: $CONTAINER_UPTIME"

# 计算运行时间
if [ "$CONTAINER_START" != "unknown" ]; then
    START_EPOCH=$(date -d "$CONTAINER_START" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    if [ $START_EPOCH -gt 0 ]; then
        UPTIME_SECONDS=$((NOW_EPOCH - START_EPOCH))
        UPTIME_MINUTES=$((UPTIME_SECONDS / 60))
        echo "运行时间: ${UPTIME_MINUTES} 分钟"
        
        if [ $UPTIME_MINUTES -gt 15 ]; then
            echo "⚠️  容器运行超过15分钟，可能已经出现问题"
        fi
    fi
fi

echo ""
echo "[2/8] 检查容器状态..."
echo "----------------------------------------"
if docker ps | grep -q conference-frontend-prod; then
    STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}")
    echo "容器状态: $STATUS"
    
    if echo "$STATUS" | grep -q "unhealthy"; then
        echo "❌ 容器不健康"
    elif echo "$STATUS" | grep -q "healthy"; then
        echo "✅ 容器健康"
    else
        echo "⚠️  容器状态未知"
    fi
else
    echo "❌ 容器未运行"
    exit 1
fi

echo ""
echo "[3/8] 检查内存使用..."
echo "----------------------------------------"
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1)
echo "$MEMORY" | awk '{print "内存使用: " $4 " / " $6 " (" $7 ")"}'
MEMORY_PERCENT=$(echo "$MEMORY" | awk '{print $7}' | sed 's/%//')
if [ -n "$MEMORY_PERCENT" ] && [ "$MEMORY_PERCENT" != "N/A" ]; then
    if (( $(echo "$MEMORY_PERCENT > 80" | bc -l 2>/dev/null || echo "0") )); then
        echo "⚠️  内存使用率超过80%，可能导致问题"
    fi
fi

echo ""
echo "[4/8] 检查Node.js进程..."
echo "----------------------------------------"
PROCESSES=$(docker exec conference-frontend-prod ps aux | grep -E "node|next" || echo "无进程")
if echo "$PROCESSES" | grep -q "node"; then
    echo "✅ Node.js进程运行中"
    echo "$PROCESSES" | head -5
    PROCESS_COUNT=$(echo "$PROCESSES" | grep -c "node" || echo "0")
    echo "进程数: $PROCESS_COUNT"
    
    if [ "$PROCESS_COUNT" -gt 10 ]; then
        echo "⚠️  进程数过多，可能有内存泄漏"
    fi
else
    echo "❌ Node.js进程未运行"
fi

echo ""
echo "[5/8] 测试健康检查端点..."
echo "----------------------------------------"
HEALTH=$(timeout 5 docker exec conference-frontend-prod wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 || echo "TIMEOUT")
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ 健康检查端点正常"
else
    echo "❌ 健康检查端点异常: $HEALTH"
fi

echo ""
echo "[6/8] 测试首页响应（10秒超时）..."
echo "----------------------------------------"
HOME_RESPONSE=$(timeout 12 docker exec conference-frontend-prod wget -q -O- --timeout=10 http://127.0.0.1:3000/ 2>&1 || echo "TIMEOUT")
if [ "$HOME_RESPONSE" = "TIMEOUT" ]; then
    echo "❌ 首页响应超时（超过10秒）"
    echo "   这说明SSR可能卡住或很慢"
else
    RESPONSE_LENGTH=${#HOME_RESPONSE}
    if [ $RESPONSE_LENGTH -gt 1000 ]; then
        echo "✅ 首页有响应（长度: $RESPONSE_LENGTH 字符）"
        if echo "$HOME_RESPONSE" | grep -q "UPCOMING EVENTS"; then
            echo "✅ 包含关键内容"
        fi
    else
        echo "⚠️  首页响应异常（长度: $RESPONSE_LENGTH 字符）"
    fi
fi

echo ""
echo "[7/8] 检查最近的错误日志..."
echo "----------------------------------------"
ERROR_LOGS=$(docker logs --tail 100 conference-frontend-prod 2>&1 | grep -iE "error|Error|ERROR|fatal|Fatal|crash|Crash|killed|Killed|OOM" | tail -20 || echo "无错误日志")
if [ "$ERROR_LOGS" != "无错误日志" ]; then
    echo "$ERROR_LOGS"
else
    echo "✅ 没有明显的错误日志"
fi

echo ""
echo "[8/8] 检查SSR相关日志（最近50行）..."
echo "----------------------------------------"
SSR_LOGS=$(docker logs --tail 50 conference-frontend-prod 2>&1 | grep -E "SSR|Homepage|timeout|Loaded data" | tail -10 || echo "无SSR日志")
if [ "$SSR_LOGS" != "无SSR日志" ]; then
    echo "$SSR_LOGS"
    echo ""
    # 检查是否有超时
    if echo "$SSR_LOGS" | grep -q "timeout\|Timeout"; then
        echo "⚠️  发现SSR超时日志"
    fi
else
    echo "⚠️  没有SSR相关日志"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "可能的原因："
echo "  1. 内存泄漏导致内存耗尽（检查内存使用率）"
echo "  2. SSR渲染卡住累积（检查SSR日志）"
echo "  3. 进程崩溃但容器未重启（检查进程数）"
echo "  4. 连接数过多（检查网络连接）"
echo "  5. 资源限制（检查CPU/内存限制）"
echo ""
echo "建议修复："
if [ "$HOME_RESPONSE" = "TIMEOUT" ]; then
    echo "  1. 重启前端容器: docker-compose -f docker-compose.prod.yml restart frontend"
    echo "  2. 如果问题持续，应用代码修复: bash 应用崩溃修复.sh"
    echo "  3. 设置定时重启: bash 设置定时重启-临时方案.sh"
else
    echo "  1. 如果内存使用率高，重启容器"
    echo "  2. 如果问题持续，应用内存泄漏修复"
    echo "  3. 考虑增加内存限制"
fi
echo ""

