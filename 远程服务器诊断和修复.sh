#!/bin/bash

# ==========================================
# 🔧 远程服务器诊断和修复脚本
# 在 Ubuntu 24 服务器上运行此脚本
# ==========================================

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
echo "🔍 远程服务器诊断和修复"
echo "=========================================="
echo ""

# 检查是否在项目目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    log_info "通常目录是: /root/dockerdata/GIIPE 或 ~/dockerdata/GIIPE"
    exit 1
fi

log_info "当前目录: $(pwd)"
log_info ""

# 1. 检查所有服务状态
log_info "[1/8] 检查所有服务状态..."
docker compose -f docker-compose.prod.yml ps

# 2. 检查前端服务
log_info ""
log_info "[2/8] 检查前端服务..."
FRONTEND_STATUS=$(docker compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log_info "前端服务状态: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" != "running" ]; then
    log_warning "前端服务未运行"
    log_info "查看前端日志..."
    docker compose -f docker-compose.prod.yml logs frontend --tail 50 | tail -20
fi

# 3. 检查后端服务
log_info ""
log_info "[3/8] 检查后端服务..."
BACKEND_STATUS=$(docker compose -f docker-compose.prod.yml ps backend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log_info "后端服务状态: $BACKEND_STATUS"

if [ "$BACKEND_STATUS" != "running" ]; then
    log_warning "后端服务未运行"
    log_info "查看后端日志..."
    docker compose -f docker-compose.prod.yml logs backend --tail 50 | tail -20
fi

# 4. 检查 Nginx 服务
log_info ""
log_info "[4/8] 检查 Nginx 服务..."
NGINX_STATUS=$(docker compose -f docker-compose.prod.yml ps nginx --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log_info "Nginx 服务状态: $NGINX_STATUS"

# 5. 测试前端连接
log_info ""
log_info "[5/8] 测试前端连接..."
docker compose -f docker-compose.prod.yml exec -T frontend sh -c "
    wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -3 || \
    curl -s --max-time 5 http://127.0.0.1:3000/ | head -3 || \
    echo '❌ 前端无响应'
" 2>/dev/null || log_warning "无法测试前端连接"

# 6. 测试后端连接
log_info ""
log_info "[6/8] 测试后端连接..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    curl -s --max-time 5 http://localhost:3001/api/health || echo '❌ 后端无响应'
" 2>/dev/null || log_warning "无法测试后端连接"

# 7. 测试 Nginx 到前端的连接
log_info ""
log_info "[7/8] 测试 Nginx 到前端的连接..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    wget -q -O- --timeout=5 http://frontend:3000/ 2>&1 | head -3 || \
    echo '❌ Nginx 无法连接到前端'
" 2>/dev/null || log_warning "Nginx 无法连接到前端"

# 8. 检查 Nginx 错误日志
log_info ""
log_info "[8/8] 检查 Nginx 错误日志..."
docker compose -f docker-compose.prod.yml logs nginx --tail 30 | grep -iE "error|502|upstream|connect" | tail -10 || log_info "没有发现相关错误"

echo ""
echo "=========================================="
echo "📋 修复建议："
echo "=========================================="
echo ""

if [ "$FRONTEND_STATUS" != "running" ]; then
    echo "1. 前端服务未运行，尝试启动："
    echo "   docker compose -f docker-compose.prod.yml up -d frontend"
    echo "   等待 30-60 秒后检查："
    echo "   docker compose -f docker-compose.prod.yml ps frontend"
    echo ""
fi

if [ "$BACKEND_STATUS" != "running" ]; then
    echo "2. 后端服务未运行，尝试启动："
    echo "   docker compose -f docker-compose.prod.yml up -d backend"
    echo ""
fi

echo "3. 如果前端一直无法启动，查看详细日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 100"
echo ""
echo "4. 重新构建前端（如果需要）："
echo "   docker compose -f docker-compose.prod.yml build --no-cache frontend"
echo "   docker compose -f docker-compose.prod.yml up -d frontend"
echo ""
echo "5. 重启所有服务："
echo "   docker compose -f docker-compose.prod.yml restart"
echo ""

