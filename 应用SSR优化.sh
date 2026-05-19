#!/bin/bash

# 应用SSR优化 - 解决端口3000响应慢问题

set -e

echo "=========================================="
echo "🚀 应用SSR渲染速度优化"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/5] 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  警告: 有未提交的更改"
    echo "   建议先提交更改: git add . && git commit -m '优化SSR渲染速度'"
    read -p "   继续吗? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "[2/5] 检查前端容器状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    CONTAINER_RUNNING=true
else
    echo "⚠️  前端容器未运行"
    CONTAINER_RUNNING=false
fi

echo ""
echo "[3/5] 重新构建前端镜像（包含SSR优化）..."
echo "   这将优化:"
echo "   - SSR超时: 15s → 8s"
echo "   - API超时: 10s → 5s"
echo "   - 超时后立即渲染（空数据），客户端会获取"
echo ""
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
echo "=========================================="
echo "✅ SSR优化已应用"
echo "=========================================="
echo ""
echo "优化内容:"
echo "  ✅ SSR超时: 8秒（之前15秒）"
echo "  ✅ API超时: 5秒（之前10秒）"
echo "  ✅ 超时后立即渲染页面（客户端会获取数据）"
echo ""
echo "测试命令:"
echo "  # 测试响应时间"
echo "  time curl -s http://localhost:3000/ > /dev/null"
echo ""
echo "  # 查看日志"
echo "  docker logs --tail 50 conference-frontend-prod"
echo ""
echo "  # 检查容器状态"
echo "  docker ps | grep frontend"
echo ""
echo "如果仍然慢，检查:"
echo "  1. 后端API响应时间"
echo "  2. 网络延迟"
echo "  3. 服务器资源（CPU/内存）"
echo ""

