#!/bin/bash

# 修复前端端口问题（前端监听 3001 而不是 3000）

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
echo "🔧 修复前端端口问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/4] 停止前端服务..."
docker compose -f docker-compose.prod.yml stop frontend
log_success "前端服务已停止"

log_info "[2/4] 重新构建前端（应用 PORT=3000 环境变量）..."
log_warning "这可能需要几分钟..."

BUILD_OUTPUT=$(docker compose -f docker-compose.prod.yml build --no-cache frontend 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log_success "前端构建成功"
else
    log_error "前端构建失败"
    echo "$BUILD_OUTPUT" | tail -50
    exit 1
fi

log_info "[3/4] 启动前端服务..."
docker compose -f docker-compose.prod.yml up -d frontend
log_success "前端服务已启动"

log_info "[4/4] 等待前端启动并验证端口..."
sleep 15

# 检查端口
log_info "检查前端是否监听 3000 端口..."
PORT_CHECK=$(docker compose -f docker-compose.prod.yml exec -T frontend sh -c "
    netstat -tlnp 2>/dev/null | grep :3000 || \
    ss -tlnp 2>/dev/null | grep :3000 || \
    echo '未找到 3000 端口'
" 2>/dev/null || echo "检查失败")

if echo "$PORT_CHECK" | grep -q ":3000"; then
    log_success "✅ 前端正在监听 3000 端口"
else
    log_warning "⚠️  前端可能仍未监听 3000 端口"
    log_info "检查结果: $PORT_CHECK"
fi

# 检查服务状态
log_info "检查前端服务状态..."
docker compose -f docker-compose.prod.yml ps frontend

# 查看日志
log_info "查看前端启动日志..."
docker compose -f docker-compose.prod.yml logs frontend --tail 20 | grep -E "Ready|Local|Network|port|3000|3001" || log_info "查看完整日志: docker compose -f docker-compose.prod.yml logs frontend --tail 50"

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 验证步骤："
echo "1. 检查前端日志，应该看到："
echo "   - Local: http://...:3000"
echo "   - Network: http://...:3000"
echo ""
echo "2. 测试前端连接："
echo "   docker compose -f docker-compose.prod.yml exec frontend curl http://localhost:3000/"
echo ""
echo "3. 测试 Nginx 到前端："
echo "   docker compose -f docker-compose.prod.yml exec nginx wget -q -O- http://frontend:3000/"
echo ""

