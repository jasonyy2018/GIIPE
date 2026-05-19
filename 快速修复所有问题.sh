#!/bin/bash

# 快速修复所有问题：Nginx 日志 + 重新构建后端

echo "=========================================="
echo "🔧 快速修复所有问题"
echo "=========================================="
echo ""

# 1. 创建 Nginx 日志文件
echo "[1/4] 创建 Nginx 日志文件..."
mkdir -p logs/nginx
touch logs/nginx/error.log logs/nginx/access.log
chmod 666 logs/nginx/*.log 2>/dev/null || chmod 777 logs/nginx/*.log
echo "✅ 完成"

# 2. 验证 Nginx 配置
echo ""
echo "[2/4] 验证 Nginx 配置..."
docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>&1 | grep -E "syntax is ok|test failed"
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Nginx 配置验证通过"
else
    echo "⚠️  Nginx 配置可能有问题，但继续执行..."
fi

# 3. 重新构建后端（应用 remark 修复）
echo ""
echo "[3/4] 重新构建后端镜像（应用 remark ES Module 修复）..."
echo "这可能需要几分钟，请耐心等待..."
docker compose -f docker-compose.prod.yml build backend 2>&1 | tail -30

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 后端构建成功"
else
    echo "❌ 后端构建失败，请检查错误信息"
    exit 1
fi

# 4. 重启服务
echo ""
echo "[4/4] 重启服务..."
docker compose -f docker-compose.prod.yml restart nginx backend
sleep 5

echo ""
echo "=========================================="
echo "✅ 修复完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 清除浏览器缓存"
echo "  2. 重新尝试创建事件"
echo ""
echo "如果仍有问题，检查日志："
echo "  docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i error"
