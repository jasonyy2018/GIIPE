#!/bin/bash

# 检查首页SSR日志

set -e

echo "=========================================="
echo "🔍 检查首页SSR日志"
echo "=========================================="
echo ""

echo "[1/4] 查找所有SSR相关日志..."
echo "----------------------------------------"
SSR_LOGS=$(docker logs conference-frontend-prod 2>&1 | grep -iE "SSR|Homepage|Loaded data" || echo "无SSR日志")
if [ "$SSR_LOGS" != "无SSR日志" ]; then
    echo "$SSR_LOGS" | tail -20
else
    echo "⚠️  没有找到SSR相关日志"
    echo "   这可能意味着："
    echo "   1. SSR没有执行（使用了静态生成）"
    echo "   2. 日志被过滤掉了"
    echo "   3. SSR超时但没有记录日志"
fi

echo ""
echo "[2/4] 查找超时相关日志..."
echo "----------------------------------------"
TIMEOUT_LOGS=$(docker logs conference-frontend-prod 2>&1 | grep -iE "timeout|Timeout" || echo "无超时日志")
if [ "$TIMEOUT_LOGS" != "无超时日志" ]; then
    echo "$TIMEOUT_LOGS" | tail -10
else
    echo "✅ 没有超时日志"
fi

echo ""
echo "[3/4] 查找错误日志..."
echo "----------------------------------------"
ERROR_LOGS=$(docker logs conference-frontend-prod 2>&1 | grep -iE "error|Error|ERROR" | grep -v "chrome-extension" | tail -20 || echo "无错误日志")
if [ "$ERROR_LOGS" != "无错误日志" ]; then
    echo "$ERROR_LOGS"
else
    echo "✅ 没有错误日志"
fi

echo ""
echo "[4/4] 测试首页访问并实时查看日志..."
echo "----------------------------------------"
echo "正在访问首页，同时监控日志（5秒）..."
echo ""

# 在后台访问首页
(docker exec conference-frontend-prod curl -s --max-time 15 http://127.0.0.1:3000/ > /dev/null 2>&1) &
CURL_PID=$!

# 监控日志5秒
timeout 5 docker logs -f conference-frontend-prod 2>&1 | grep -E "SSR|Homepage|Loaded data|timeout|error" --line-buffered || true

# 等待curl完成
wait $CURL_PID 2>/dev/null || true

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "如果看到SSR日志，说明SSR正在工作"
echo "如果没有SSR日志，可能是："
echo "  1. 使用了静态生成而非SSR"
echo "  2. SSR超时但没有记录"
echo "  3. 首页路由配置问题"
echo ""

