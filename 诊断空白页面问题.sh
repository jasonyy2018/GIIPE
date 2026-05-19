#!/bin/bash

# 诊断 giip.info 和 www.giip.info 空白页面问题

set -e

echo "=========================================="
echo "诊断空白页面问题"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "步骤 1: 检查 Docker 容器状态..."
echo ""

# 检查前端容器
if docker ps | grep -q "conference-frontend-prod"; then
    echo -e "${GREEN}✓${NC} 前端容器运行中"
    FRONTEND_STATUS=$(docker ps --filter "name=conference-frontend-prod" --format "{{.Status}}")
    echo "  状态: $FRONTEND_STATUS"
else
    echo -e "${RED}✗${NC} 前端容器未运行"
    echo "  尝试启动: docker-compose -f docker-compose.prod.yml up -d frontend"
fi

# 检查 Nginx 容器
if docker ps | grep -q "conference-nginx-prod"; then
    echo -e "${GREEN}✓${NC} Nginx 容器运行中"
    NGINX_STATUS=$(docker ps --filter "name=conference-nginx-prod" --format "{{.Status}}")
    echo "  状态: $NGINX_STATUS"
else
    echo -e "${RED}✗${NC} Nginx 容器未运行"
    echo "  尝试启动: docker-compose -f docker-compose.prod.yml up -d nginx"
fi

echo ""
echo "步骤 2: 检查容器健康状态..."
echo ""

# 检查前端健康
if docker inspect conference-frontend-prod 2>/dev/null | grep -q '"Health"' && docker inspect conference-frontend-prod | grep -q '"Status": "healthy"'; then
    echo -e "${GREEN}✓${NC} 前端容器健康"
else
    echo -e "${YELLOW}⚠${NC} 前端容器健康检查未通过或未配置"
fi

# 检查 Nginx 健康
if docker inspect conference-nginx-prod 2>/dev/null | grep -q '"Health"' && docker inspect conference-nginx-prod | grep -q '"Status": "healthy"'; then
    echo -e "${GREEN}✓${NC} Nginx 容器健康"
else
    echo -e "${YELLOW}⚠${NC} Nginx 容器健康检查未通过或未配置"
fi

echo ""
echo "步骤 3: 测试容器内部连接..."
echo ""

# 测试前端是否响应
if docker exec conference-frontend-prod wget -q --spider --timeout=5 http://localhost:3000/ 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 前端容器内部端口 3000 可访问"
else
    echo -e "${RED}✗${NC} 前端容器内部端口 3000 无法访问"
    echo "  查看日志: docker logs conference-frontend-prod --tail 50"
fi

# 测试 Nginx 是否响应
if docker exec conference-nginx-prod wget -q --spider --timeout=5 http://localhost/health 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx 容器内部可访问"
else
    echo -e "${RED}✗${NC} Nginx 容器内部无法访问"
fi

echo ""
echo "步骤 4: 检查端口映射..."
echo ""

# 检查端口映射
PORTS=$(docker port conference-nginx-prod 2>/dev/null || echo "")
if echo "$PORTS" | grep -q "80"; then
    echo -e "${GREEN}✓${NC} Nginx 端口映射:"
    echo "$PORTS" | grep "80"
else
    echo -e "${YELLOW}⚠${NC} 未找到 Nginx 80 端口映射"
    echo "  检查 docker-compose.prod.yml 中的端口配置"
fi

echo ""
echo "步骤 5: 检查 Nginx 配置..."
echo ""

# 检查 server_name 配置
if grep -q "giip.info\|www.giip.info" nginx/conf.d/default.conf; then
    echo -e "${GREEN}✓${NC} Nginx 配置包含域名"
    echo "  Server names:"
    grep "server_name" nginx/conf.d/default.conf | head -1
else
    echo -e "${RED}✗${NC} Nginx 配置中未找到域名"
fi

# 验证 Nginx 配置
if docker exec conference-nginx-prod nginx -t 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx 配置文件语法正确"
else
    echo -e "${RED}✗${NC} Nginx 配置文件有语法错误"
    echo "  查看错误: docker exec conference-nginx-prod nginx -t"
fi

echo ""
echo "步骤 6: 检查前端日志（最近 20 行）..."
echo ""

if docker logs conference-frontend-prod --tail 20 2>&1 | grep -q "Ready\|Error\|error"; then
    echo "前端日志（最近错误/就绪信息）:"
    docker logs conference-frontend-prod --tail 20 2>&1 | grep -i "ready\|error\|error\|failed" | tail -5
else
    echo "查看完整日志: docker logs conference-frontend-prod --tail 50"
fi

echo ""
echo "步骤 7: 检查 Nginx 日志（最近错误）..."
echo ""

if [ -f "logs/nginx/error.log" ]; then
    echo "Nginx 错误日志（最近 5 条）:"
    tail -5 logs/nginx/error.log 2>/dev/null || echo "  无错误日志"
else
    echo "检查容器内日志: docker exec conference-nginx-prod tail -10 /var/log/nginx/error.log"
fi

echo ""
echo "步骤 8: 测试本地连接..."
echo ""

# 测试本地连接
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/ 2>/dev/null | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓${NC} 本地端口 8085 可访问（HTTP 200/301/302）"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/ 2>/dev/null || echo "无法连接")
    echo -e "${RED}✗${NC} 本地端口 8085 返回: $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "常见问题和解决方案:"
echo ""
echo "1. 如果前端容器未运行:"
echo "   docker-compose -f docker-compose.prod.yml up -d frontend"
echo ""
echo "2. 如果 Nginx 容器未运行:"
echo "   docker-compose -f docker-compose.prod.yml up -d nginx"
echo ""
echo "3. 如果端口映射错误:"
echo "   检查 docker-compose.prod.yml 中 nginx 的 ports 配置"
echo "   应该是: \"80:80\" 或 \"8085:80\""
echo ""
echo "4. 如果域名无法访问:"
echo "   - 检查 DNS 配置（A 记录指向服务器 IP）"
echo "   - 检查防火墙是否开放 80/443 端口"
echo "   - 检查服务器是否监听 80 端口: netstat -tlnp | grep :80"
echo ""
echo "5. 如果页面空白但服务器响应:"
echo "   - 检查浏览器控制台错误（F12）"
echo "   - 检查前端 JavaScript 错误"
echo "   - 查看前端日志: docker logs conference-frontend-prod -f"
echo ""
echo "6. 检查域名 DNS:"
echo "   dig giip.info"
echo "   dig www.giip.info"
echo ""















