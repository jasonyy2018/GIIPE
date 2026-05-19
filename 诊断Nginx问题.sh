#!/bin/bash

# 诊断 Nginx 问题

echo "=========================================="
echo "🔍 诊断 Nginx 问题"
echo "=========================================="
echo ""

echo "[1/6] 检查 Nginx 进程..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "ps aux | grep nginx | grep -v grep" || echo "❌ Nginx 进程未运行"

echo ""
echo "[2/6] 检查 Nginx 监听的端口..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "netstat -tlnp 2>/dev/null | grep :80 || ss -tlnp 2>/dev/null | grep :80" || echo "⚠️  无法检查端口"

echo ""
echo "[3/6] 检查 Nginx 配置语法..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "nginx -t 2>&1" || echo "❌ 配置语法错误"

echo ""
echo "[4/6] 检查 Nginx 错误日志（详细）..."
docker compose -f docker-compose.prod.yml logs nginx --tail 100 | tail -30

echo ""
echo "[5/6] 检查 Nginx 配置文件是否存在..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    echo '检查主配置文件：'
    ls -la /etc/nginx/nginx.conf
    echo ''
    echo '检查站点配置：'
    ls -la /etc/nginx/conf.d/
    echo ''
    echo '检查配置文件内容（前20行）：'
    head -20 /etc/nginx/nginx.conf 2>/dev/null || echo '无法读取配置文件'
"

echo ""
echo "[6/6] 尝试手动启动 Nginx（如果未运行）..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    if ! pgrep nginx > /dev/null; then
        echo '尝试启动 Nginx...'
        nginx
        sleep 2
        pgrep nginx && echo '✅ Nginx 已启动' || echo '❌ Nginx 启动失败'
    else
        echo '✅ Nginx 进程正在运行'
    fi
"

echo ""
echo "=========================================="
echo "📋 如果 Nginx 未运行，尝试重启："
echo "=========================================="
echo "docker compose -f docker-compose.prod.yml restart nginx"
echo ""

