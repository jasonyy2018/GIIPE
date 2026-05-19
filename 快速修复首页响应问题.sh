#!/bin/bash

# 快速修复首页HTML响应问题

set -e

echo "=========================================="
echo "🔧 快速修复首页HTML响应问题"
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
    echo "❌ 前端容器未运行，无法修复"
    exit 1
fi

echo ""
echo "[2/5] 检查内存使用..."
MEMORY=$(docker stats --no-stream conference-frontend-prod 2>&1 | tail -1 | awk '{print $4}')
echo "   当前内存使用: $MEMORY"

echo ""
echo "[3/5] 重启前端容器（清理状态）..."
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
            echo "   ⚠️  健康检查未通过，但继续测试"
        else
            echo "   等待5秒后重试 ($i/6)..."
            sleep 5
        fi
    fi
done

echo ""
echo "   测试首页响应..."
HTML=$(docker exec conference-frontend-prod curl -s --max-time 10 http://127.0.0.1:3000/ 2>&1)
HTML_LENGTH=${#HTML}

if [ $HTML_LENGTH -gt 0 ]; then
    if echo "$HTML" | grep -q "UPCOMING EVENTS"; then
        echo "   ✅ 首页HTML正常，包含关键内容"
        echo "   ✅ 修复成功"
    else
        echo "   ⚠️  首页HTML存在但不完整"
        echo "   建议运行: bash 深入诊断首页问题.sh"
    fi
else
    echo "   ❌ 首页HTML仍然为空"
    echo "   建议："
    echo "     1. 运行: bash 深入诊断首页问题.sh"
    echo "     2. 如果问题持续，运行: bash 应用崩溃修复.sh"
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "如果问题仍然存在："
echo "  1. 运行详细诊断: bash 深入诊断首页问题.sh"
echo "  2. 应用所有修复: bash 应用崩溃修复.sh"
echo "  3. 检查SSR日志: docker logs --tail 200 conference-frontend-prod | grep SSR"
echo ""

