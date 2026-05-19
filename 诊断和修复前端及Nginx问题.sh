#!/bin/bash

# 诊断和修复前端及 Nginx 问题
# 解决 Nginx Proxy Manager 页面显示问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} ⚠️  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} ❌ $1"; }

echo "=========================================="
echo "🔍 诊断和修复前端及 Nginx 问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/8] 检查前端容器状态..."
FRONTEND_STATUS=$(docker compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
if echo "$FRONTEND_STATUS" | grep -q "unhealthy"; then
    log_warning "前端容器状态：unhealthy"
else
    log_success "前端容器状态正常"
fi
echo ""

log_info "[2/8] 检查前端日志（最近 30 行）..."
docker compose -f docker-compose.prod.yml logs frontend --tail 30
echo ""

log_info "[3/8] 测试前端服务是否可访问..."
if docker compose -f docker-compose.prod.yml ps frontend | grep -q "Up"; then
    # 测试前端是否响应
    FRONTEND_TEST=$(docker compose -f docker-compose.prod.yml exec -T frontend wget -q -O- --timeout=5 http://localhost:3000/ 2>/dev/null | head -20 || echo "FAILED")
    if echo "$FRONTEND_TEST" | grep -q "<!DOCTYPE\|<html\|Next.js"; then
        log_success "前端服务正常响应"
    else
        log_warning "前端服务可能未完全启动或有问题"
        log_info "尝试使用 curl 测试..."
        docker compose -f docker-compose.prod.yml exec -T frontend curl -f http://localhost:3000/ 2>&1 | head -10 || log_error "前端服务无法访问"
    fi
else
    log_error "前端容器未运行"
fi
echo ""

log_info "[4/8] 检查 Nginx 是否能连接到前端..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    NGINX_TO_FRONTEND=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- --timeout=5 http://frontend:3000/ 2>/dev/null | head -20 || echo "FAILED")
    if echo "$NGINX_TO_FRONTEND" | grep -q "<!DOCTYPE\|<html\|Next.js"; then
        log_success "Nginx 可以连接到前端"
    else
        log_error "Nginx 无法连接到前端"
        log_info "这可能是导致显示 Nginx Proxy Manager 页面的原因"
    fi
else
    log_error "Nginx 容器未运行"
fi
echo ""

log_info "[5/8] 检查端口访问..."
log_info "重要提示："
log_warning "1. 我们的 Nginx 监听在端口 8085（不是 80）"
log_warning "2. 端口 80 被 Nginx Proxy Manager 占用"
log_warning "3. 请确保访问 http://your-server-ip:8085（不是 80）"
echo ""

log_info "测试我们的 Nginx（端口 8085）..."
NGINX_8085_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/health 2>/dev/null || echo "FAILED")
if [ "$NGINX_8085_TEST" = "200" ]; then
    log_success "端口 8085 的 Nginx 健康检查正常"
else
    log_warning "端口 8085 的 Nginx 可能有问题（HTTP 状态码：$NGINX_8085_TEST）"
fi
echo ""

log_info "[6/8] 检查 Nginx 配置中的前端代理..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    NGINX_CONFIG=$(docker compose -f docker-compose.prod.yml exec -T nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "")
    if echo "$NGINX_CONFIG" | grep -q "proxy_pass http://frontend"; then
        log_success "Nginx 配置包含前端代理"
    else
        log_error "Nginx 配置可能缺少前端代理设置"
    fi
fi
echo ""

log_info "[7/8] 检查前端健康检查问题..."
log_info "前端健康检查使用 wget，检查是否可用..."
if docker compose -f docker-compose.prod.yml ps frontend | grep -q "Up"; then
    WGET_CHECK=$(docker compose -f docker-compose.prod.yml exec -T frontend which wget 2>/dev/null || echo "NOT_FOUND")
    if [ "$WGET_CHECK" != "NOT_FOUND" ]; then
        log_success "wget 已安装"
        # 手动测试健康检查
        HEALTH_TEST=$(docker compose -f docker-compose.prod.yml exec -T frontend wget --no-verbose --tries=1 --spider http://localhost:3000/ 2>&1 || echo "FAILED")
        if echo "$HEALTH_TEST" | grep -q "200 OK\|saved"; then
            log_success "前端健康检查命令可以正常工作"
        else
            log_warning "前端健康检查命令可能有问题"
            log_info "健康检查输出：$HEALTH_TEST"
        fi
    else
        log_error "wget 未安装，这会导致健康检查失败"
        log_info "需要检查 Dockerfile.prod 是否安装了 wget"
    fi
fi
echo ""

log_info "[8/8] 生成修复建议..."
echo ""
echo "=========================================="
log_info "诊断完成"
echo "=========================================="
echo ""
echo "📋 问题总结："
echo ""
if echo "$FRONTEND_STATUS" | grep -q "unhealthy"; then
    log_warning "1. 前端容器状态为 unhealthy"
    echo "   - 但应用可能已启动（检查日志确认）"
    echo "   - 可能是健康检查配置问题"
fi
echo ""
log_warning "2. Nginx Proxy Manager 占用 80/443 端口"
echo "   - 这是正常的，不影响我们的服务"
echo "   - 我们的 Nginx 使用 8085 端口"
echo ""
log_info "3. 访问地址确认"
echo "   ✅ 正确地址：http://your-server-ip:8085"
echo "   ❌ 错误地址：http://your-server-ip:80（会显示 Nginx Proxy Manager 页面）"
echo ""
echo "📋 修复步骤："
echo ""
echo "1. 确认访问端口："
echo "   访问 http://your-server-ip:8085（不是 80）"
echo ""
echo "2. 如果前端 unhealthy 但应用已启动："
echo "   可以忽略健康检查状态，或运行以下命令修复："
echo "   docker compose -f docker-compose.prod.yml restart frontend"
echo ""
echo "3. 如果前端确实无法访问："
echo "   查看详细日志：docker compose -f docker-compose.prod.yml logs frontend --tail 100"
echo ""
echo "4. 测试 Nginx 代理："
echo "   curl http://localhost:8085/"
echo "   应该返回前端页面，而不是 Nginx Proxy Manager 页面"
echo ""
echo "5. 如果仍然看到 Nginx Proxy Manager 页面："
echo "   检查 Nginx Proxy Manager 是否配置了代理规则"
echo "   停止 Nginx Proxy Manager：docker stop 1Panel-nginx-proxy-manager-zfxx"
echo "   或确保访问的是 8085 端口，不是 80 端口"
echo ""

