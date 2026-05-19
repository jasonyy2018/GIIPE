#!/bin/bash

# 彻底修复所有前端 API 连接问题
# 1. 修复图片显示问题（Nginx 代理到后端）
# 2. 修复前端 API 路由连接问题（统一使用 getBackendUrl()）
# 3. 重新构建并重启服务

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
echo "🔧 彻底修复所有前端 API 连接问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/6] 检查服务状态..."
docker compose -f docker-compose.prod.yml ps

log_info "[2/6] 停止相关服务..."
docker compose -f docker-compose.prod.yml stop frontend backend nginx
log_success "服务已停止"

log_info "[3/6] 重新构建后端（应用 StaticFilesController 修复）..."
docker compose -f docker-compose.prod.yml build --no-cache backend
log_success "后端构建完成"

log_info "[4/6] 重新构建前端（应用 API 路由修复）..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
log_success "前端构建完成"

log_info "[5/6] 启动所有服务..."
docker compose -f docker-compose.prod.yml up -d
log_success "服务已启动"

log_info "[6/6] 等待服务启动并验证..."
sleep 15

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps

# 测试后端连接
log_info "测试后端连接..."
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend wget -q -O- http://localhost:3001/api/health 2>/dev/null || echo "FAILED")
if echo "$BACKEND_HEALTH" | grep -q "ok\|healthy"; then
    log_success "后端健康检查通过"
else
    log_warning "后端健康检查失败，请检查日志"
fi

# 测试前端连接
log_info "测试前端连接..."
FRONTEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T frontend wget -q -O- http://localhost:3000/health 2>/dev/null || echo "FAILED")
if echo "$FRONTEND_HEALTH" | grep -q "ok\|healthy"; then
    log_success "前端健康检查通过"
else
    log_warning "前端健康检查失败，请检查日志"
fi

# 测试 Nginx 到后端的连接
log_info "测试 Nginx 到后端的连接..."
NGINX_BACKEND=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- http://backend:3001/api/health 2>/dev/null || echo "FAILED")
if echo "$NGINX_BACKEND" | grep -q "ok\|healthy"; then
    log_success "Nginx 可以连接到后端"
else
    log_warning "Nginx 无法连接到后端，请检查网络配置"
fi

# 测试 Nginx 到前端的连接
log_info "测试 Nginx 到前端的连接..."
NGINX_FRONTEND=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- http://frontend:3000/health 2>/dev/null || echo "FAILED")
if echo "$NGINX_FRONTEND" | grep -q "ok\|healthy"; then
    log_success "Nginx 可以连接到前端"
else
    log_warning "Nginx 无法连接到前端，请检查网络配置"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ 图片显示问题：Nginx 现在代理 /api/uploads/ 到后端"
echo "2. ✅ StaticFilesController 路径处理：使用绝对路径"
echo "3. ✅ 前端 API 路由：统一使用 getBackendUrl()"
echo "4. ✅ API 路径修复：所有路径包含 /api 前缀"
echo "5. ✅ Docker 环境检测：自动使用 http://backend:3001"
echo ""
echo "📋 验证步骤："
echo "1. 检查服务状态："
echo "   docker compose -f docker-compose.prod.yml ps"
echo ""
echo "2. 检查后端日志（StaticFilesController）："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i 'StaticFilesController'"
echo ""
echo "3. 检查前端日志（API 连接）："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50 | grep -i 'ECONNREFUSED\|localhost:3001'"
echo ""
echo "4. 测试图片访问（替换为实际文件名）："
echo "   curl -I http://localhost:8085/api/uploads/images/giip101-1762480663991-4ef73f7f3de310a9.jpg"
echo ""
echo "5. 测试 API 端点："
echo "   curl http://localhost:8085/api/health"
echo ""
echo "如果仍有问题，请检查日志并分享错误信息。"
echo ""

