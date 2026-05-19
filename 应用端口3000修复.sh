#!/bin/bash

# 应用端口3000修复

set -e

echo "=========================================="
echo "🔧 应用端口3000修复"
echo "=========================================="
echo ""

echo "此修复将："
echo "1. 添加端口映射配置（3000:3000）"
echo "2. 添加SSR超时保护（防止渲染卡住）"
echo "3. 改进错误处理和日志"
echo ""

read -p "是否继续？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 1
fi

echo ""
echo "[1/4] 停止前端容器..."
docker-compose -f docker-compose.prod.yml stop frontend
echo "✅ 前端容器已停止"
echo ""

echo "[2/4] 重新构建前端..."
echo "⚠️  这可能需要几分钟..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
    exit 1
fi
echo ""

echo "[3/4] 启动前端容器（应用新的端口映射）..."
docker-compose -f docker-compose.prod.yml up -d frontend
echo "✅ 前端容器已启动"
echo ""

echo "[4/4] 等待前端启动并验证..."
echo "等待30秒让Next.js完全启动..."
sleep 30

echo ""
echo "检查端口映射..."
docker port conference-frontend-prod 2>/dev/null || echo "⚠️  无法获取端口映射"
echo ""

echo "测试端口3000..."
for i in {1..6}; do
    echo "尝试 $i/6..."
    if timeout 10 curl -f -s --max-time 10 http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ 健康检查端点响应正常"
        
        # 测试根路径
        echo "测试根路径..."
        if timeout 15 curl -f -s --max-time 15 http://localhost:3000/ >/dev/null 2>&1; then
            echo "✅ 根路径响应正常"
        else
            echo "⚠️  根路径响应慢或超时（可能是SSR渲染慢）"
        fi
        break
    else
        if [ $i -eq 6 ]; then
            echo "❌ 端口3000无响应"
        else
            echo "等待5秒后重试..."
            sleep 5
        fi
    fi
done

echo ""
echo "检查容器状态..."
docker ps | grep frontend-prod
echo ""

echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "如果端口3000仍然无法访问："
echo "1. 检查防火墙: sudo ufw status"
echo "2. 检查端口占用: sudo netstat -tlnp | grep 3000"
echo "3. 查看日志: docker logs --tail 200 conference-frontend-prod"
echo ""
echo "测试访问:"
echo "  - 健康检查: curl http://localhost:3000/api/health"
echo "  - 首页: curl http://localhost:3000/"

