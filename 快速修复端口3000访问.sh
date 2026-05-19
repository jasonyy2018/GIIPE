#!/bin/bash

# 快速修复端口3000访问问题

set -e

echo "=========================================="
echo "🔧 快速修复端口3000访问问题"
echo "=========================================="
echo ""

# 1. 检查并开放防火墙
echo "[1/4] 检查并开放防火墙..."
if command -v ufw >/dev/null 2>&1; then
    echo "检测到UFW防火墙"
    UFW_STATUS=$(sudo ufw status | grep -i "Status: active" || echo "")
    if [ -n "$UFW_STATUS" ]; then
        echo "UFW已启用，检查端口3000..."
        if sudo ufw status | grep -q "3000/tcp"; then
            echo "✅ 端口3000已在防火墙中开放"
        else
            echo "开放端口3000..."
            sudo ufw allow 3000/tcp
            sudo ufw reload
            echo "✅ 端口3000已开放"
        fi
    else
        echo "UFW未启用，跳过"
    fi
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "检测到Firewalld"
    if sudo firewall-cmd --list-ports 2>/dev/null | grep -q "3000/tcp"; then
        echo "✅ 端口3000已在firewalld中开放"
    else
        echo "开放端口3000..."
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --reload
        echo "✅ 端口3000已开放"
    fi
else
    echo "未检测到常见防火墙工具，跳过"
fi
echo ""

# 2. 检查Docker端口映射
echo "[2/4] 检查Docker端口映射..."
if docker port conference-frontend-prod 2>/dev/null | grep -q "3000"; then
    echo "✅ Docker端口映射正常"
    docker port conference-frontend-prod
else
    echo "⚠️  Docker端口映射可能有问题"
    echo "需要重启容器以应用新的端口映射配置"
fi
echo ""

# 3. 检查端口监听
echo "[3/4] 检查端口监听..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":3000 " || sudo ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "✅ 端口3000正在监听"
    sudo netstat -tlnp 2>/dev/null | grep ":3000 " || sudo ss -tlnp 2>/dev/null | grep ":3000 "
else
    echo "❌ 端口3000未监听（可能需要重启容器）"
fi
echo ""

# 4. 测试访问
echo "[4/4] 测试访问..."
echo "测试本地访问:"
if curl -f -s --max-time 5 http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ 本地访问正常"
else
    echo "❌ 本地访问失败"
fi
echo ""

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "无法获取")
if [ "$SERVER_IP" != "无法获取" ]; then
    echo "服务器公网IP: $SERVER_IP"
    echo "测试外部访问（需要安全组开放）:"
    echo "  curl http://$SERVER_IP:3000/api/health"
fi
echo ""

echo "=========================================="
echo "修复完成"
echo "=========================================="
echo ""
echo "如果仍然无法访问，请检查："
echo "1. 云服务器安全组规则（需要在云控制台配置）"
echo "2. 重启前端容器: docker-compose -f docker-compose.prod.yml restart frontend"
echo "3. 查看日志: docker logs --tail 100 conference-frontend-prod"
echo ""
echo "云服务器安全组配置："
echo "  - 协议: TCP"
echo "  - 端口: 3000"
echo "  - 源: 0.0.0.0/0 (或特定IP)"

