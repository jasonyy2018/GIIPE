#!/bin/bash

# 应用运行一段时间后崩溃问题的修复

set -e

echo "=========================================="
echo "🔧 应用运行一段时间后崩溃问题修复"
echo "=========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "[1/6] 检查Git状态..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  警告: 有未提交的更改"
    echo "   建议先提交更改: git add . && git commit -m '修复内存泄漏和定时器清理问题'"
    read -p "   继续吗? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "[2/6] 检查前端容器状态..."
if docker ps | grep -q conference-frontend-prod; then
    echo "✅ 前端容器正在运行"
    echo "   当前内存使用:"
    docker stats --no-stream conference-frontend-prod | tail -1 | awk '{print "   " $4 " / " $6}'
else
    echo "⚠️  前端容器未运行"
fi

echo ""
echo "[3/6] 检查修复内容..."
echo "   修复1: SSR超时Promise清理（防止内存泄漏）"
echo "   修复2: 客户端重试定时器清理（防止组件卸载后定时器继续运行）"
echo ""

echo "[4/6] 重新构建前端镜像（包含内存泄漏修复）..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "[5/6] 重启前端容器..."
docker-compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "[6/6] 等待容器启动（30秒）..."
sleep 30

echo ""
echo "=========================================="
echo "✅ 崩溃修复已应用"
echo "=========================================="
echo ""
echo "修复内容:"
echo "  ✅ SSR超时Promise清理"
echo "  ✅ 客户端重试定时器清理"
echo "  ✅ 防止内存泄漏"
echo ""
echo "监控命令:"
echo "  # 监控内存使用"
echo "  docker stats conference-frontend-prod"
echo ""
echo "  # 查看日志"
echo "  docker logs -f conference-frontend-prod"
echo ""
echo "  # 检查进程状态"
echo "  docker exec conference-frontend-prod ps aux | grep node"
echo ""
echo "  # 测试访问"
echo "  curl -I http://localhost:3000/"
echo ""
echo "如果问题仍然存在:"
echo "  1. 检查系统资源（CPU/内存/磁盘）"
echo "  2. 检查后端API响应时间"
echo "  3. 查看详细日志: docker logs --tail 200 conference-frontend-prod"
echo "  4. 考虑增加内存限制或添加进程监控"
echo ""

