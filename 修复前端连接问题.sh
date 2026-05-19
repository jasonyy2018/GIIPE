#!/bin/bash

# 修复前端连接问题
# 1. 添加 HOSTNAME=0.0.0.0 确保 Next.js 监听所有接口
# 2. 修改健康检查使用 127.0.0.1 而不是 localhost

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
echo "🔧 修复前端连接问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/5] 停止前端和 Nginx 服务..."
docker compose -f docker-compose.prod.yml stop frontend nginx
log_success "服务已停止"
echo ""

log_info "[2/5] 检查配置更改..."
if grep -q "HOSTNAME: 0.0.0.0" docker-compose.prod.yml && \
   grep -q "http://127.0.0.1:3000/" docker-compose.prod.yml; then
    log_success "配置已更新"
else
    log_error "配置未正确更新，请检查 docker-compose.prod.yml"
    log_info "需要添加："
    log_info "  - HOSTNAME: 0.0.0.0 在 frontend environment 中"
    log_info "  - 健康检查使用 http://127.0.0.1:3000/ 而不是 localhost"
    exit 1
fi
echo ""

log_info "[3/5] 重新启动前端服务..."
docker compose -f docker-compose.prod.yml up -d frontend
log_success "前端服务已启动"
echo ""

log_info "等待前端启动（最多 2 分钟）..."
for i in {1..24}; do
    sleep 5
    FRONTEND_STATUS=$(docker compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    if echo "$FRONTEND_STATUS" | grep -q "healthy"; then
        log_success "前端健康检查通过！"
        break
    elif [ $i -eq 24 ]; then
        log_warning "前端健康检查仍未通过，但继续验证..."
    else
        echo -n "."
    fi
done
echo ""
echo ""

log_info "[4/5] 测试前端服务..."
# 测试前端是否可访问
FRONTEND_TEST=$(docker compose -f docker-compose.prod.yml exec -T frontend wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>/dev/null | head -20 || echo "FAILED")
if echo "$FRONTEND_TEST" | grep -q "<!DOCTYPE\|<html\|Next.js"; then
    log_success "前端服务正常响应"
else
    log_warning "前端服务可能仍在启动中"
    log_info "查看前端日志："
    docker compose -f docker-compose.prod.yml logs frontend --tail 20
fi
echo ""

log_info "[5/5] 测试 Nginx 到前端的连接..."
docker compose -f docker-compose.prod.yml up -d nginx
sleep 3

NGINX_TO_FRONTEND=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- --timeout=5 http://frontend:3000/ 2>/dev/null | head -20 || echo "FAILED")
if echo "$NGINX_TO_FRONTEND" | grep -q "<!DOCTYPE\|<html\|Next.js"; then
    log_success "Nginx 可以连接到前端"
else
    log_warning "Nginx 仍无法连接到前端，可能需要更多时间"
    log_info "查看 Nginx 日志："
    docker compose -f docker-compose.prod.yml logs nginx --tail 20
fi
echo ""

echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ 添加 HOSTNAME=0.0.0.0 确保 Next.js 监听所有网络接口"
echo "2. ✅ 修改健康检查使用 127.0.0.1:3000 而不是 localhost:3000"
echo ""
echo "📋 验证步骤："
echo "1. 检查前端状态："
echo "   docker compose -f docker-compose.prod.yml ps frontend"
echo ""
echo "2. 测试前端服务："
echo "   docker compose -f docker-compose.prod.yml exec frontend wget -q -O- http://127.0.0.1:3000/ | head -20"
echo ""
echo "3. 测试 Nginx 代理："
echo "   curl http://localhost:8085/ | head -20"
echo "   应该返回前端页面，而不是 Nginx Proxy Manager 页面"
echo ""
echo "4. 如果前端仍 unhealthy，查看日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""
echo "⚠️  重要：确保访问 http://your-server-ip:8085（不是 80）"
echo ""

