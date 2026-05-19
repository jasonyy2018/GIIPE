#!/bin/bash

# 检查端口3000的安全限制和网络配置

set -e

echo "=========================================="
echo "🔍 检查端口3000安全限制和网络配置"
echo "=========================================="
echo ""

FRONTEND_CONTAINER="conference-frontend-prod"

# 1. 检查Docker端口映射
echo "[1/8] 检查Docker端口映射..."
docker port "$FRONTEND_CONTAINER" 2>/dev/null || echo "⚠️  无法获取端口映射"
echo ""

# 2. 检查容器内端口监听
echo "[2/8] 检查容器内端口监听..."
echo "检查监听地址："
docker exec "$FRONTEND_CONTAINER" netstat -tlnp 2>/dev/null | grep :3000 || \
docker exec "$FRONTEND_CONTAINER" ss -tlnp 2>/dev/null | grep :3000 || \
echo "❌ 端口3000未监听"
echo ""

# 3. 检查Docker网络配置
echo "[3/8] 检查Docker网络配置..."
docker inspect "$FRONTEND_CONTAINER" --format='{{range .NetworkSettings.Ports}}{{.}}{{end}}' 2>/dev/null || echo "无法获取网络配置"
echo ""

# 4. 检查防火墙状态（Ubuntu/Debian）
echo "[4/8] 检查防火墙状态..."
if command -v ufw >/dev/null 2>&1; then
    echo "UFW状态:"
    sudo ufw status | grep -E "Status|3000" || echo "UFW未运行或未配置"
elif command -v firewall-cmd >/dev/null 2>&1; then
    echo "Firewalld状态:"
    sudo firewall-cmd --list-ports 2>/dev/null | grep 3000 || echo "端口3000未在firewalld中开放"
else
    echo "未检测到常见防火墙工具"
fi
echo ""

# 5. 检查iptables规则
echo "[5/8] 检查iptables规则（端口3000）..."
sudo iptables -L -n | grep 3000 || echo "未发现端口3000的iptables规则"
echo ""

# 6. 检查Docker的iptables规则
echo "[6/8] 检查Docker的iptables规则..."
sudo iptables -t nat -L -n | grep 3000 || echo "未发现Docker NAT规则中的3000端口"
echo ""

# 7. 测试本地访问
echo "[7/8] 测试本地访问..."
echo "从容器内测试:"
docker exec "$FRONTEND_CONTAINER" wget -q -O- --timeout=5 http://127.0.0.1:3000/api/health 2>&1 | head -3 || echo "❌ 容器内无法访问"
echo ""
echo "从主机测试容器IP:"
FRONTEND_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$FRONTEND_CONTAINER" 2>/dev/null || echo "")
if [ -n "$FRONTEND_IP" ]; then
    echo "容器IP: $FRONTEND_IP"
    curl -s --max-time 5 "http://$FRONTEND_IP:3000/api/health" 2>&1 | head -3 || echo "❌ 从主机无法访问容器IP"
else
    echo "❌ 无法获取容器IP"
fi
echo ""

# 8. 检查端口是否被占用
echo "[8/8] 检查端口3000是否被占用..."
sudo netstat -tlnp | grep :3000 || sudo ss -tlnp | grep :3000 || echo "端口3000未被占用（可能未正确映射）"
echo ""

# 9. 检查云服务器安全组（提示）
echo "[9/9] 云服务器安全组检查（需要手动检查）..."
echo ""
echo "⚠️  如果是云服务器，需要检查："
echo "1. 阿里云/腾讯云/AWS安全组规则"
echo "2. 确保入站规则允许端口3000"
echo "3. 协议: TCP, 端口: 3000, 源: 0.0.0.0/0"
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "常见问题和解决方案："
echo ""
echo "1. 防火墙阻止："
echo "   sudo ufw allow 3000/tcp"
echo "   sudo ufw reload"
echo ""
echo "2. 云服务器安全组："
echo "   需要在云控制台添加安全组规则"
echo ""
echo "3. Docker端口映射："
echo "   确保docker-compose.prod.yml中有 ports: - \"3000:3000\""
echo ""
echo "4. 端口绑定："
echo "   确保HOSTNAME=0.0.0.0（不是localhost）"

