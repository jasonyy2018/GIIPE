#!/bin/bash

# 修复前端 SSR 连接问题 - 添加客户端重试机制

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
echo "🔧 修复前端 SSR 连接问题"
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

log_info "[2/4] 重新构建前端（应用客户端重试修复）..."
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

log_info "[4/4] 等待前端启动..."
sleep 20

# 检查前端日志
log_info "检查前端启动日志..."
FRONTEND_LOG=$(docker compose -f docker-compose.prod.yml logs frontend --tail 30 | grep -i "Ready\|Error\|Failed" || echo "")

if echo "$FRONTEND_LOG" | grep -q "Ready"; then
    log_success "✅ 前端服务已启动"
else
    log_warning "⚠️  前端可能还在启动中，请检查日志"
fi

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps frontend backend

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 修复内容："
echo "1. ✅ 添加了 FeaturedContentClient 组件（客户端重试机制）"
echo "2. ✅ SSR 失败时，客户端会自动重试获取数据"
echo "3. ✅ 改进了错误处理和加载状态显示"
echo ""
echo "📋 验证步骤："
echo "1. 访问网站首页，检查是否显示内容"
echo "2. 如果 SSR 失败，客户端会在 1 秒后自动重试"
echo "3. 检查浏览器控制台，应该看到客户端重试日志"
echo ""
echo "📋 如果仍有问题，检查："
echo "1. 前端和后端是否在同一网络中："
echo "   docker compose -f docker-compose.prod.yml exec frontend ping -c 3 backend"
echo ""
echo "2. 后端 API 是否可访问："
echo "   docker compose -f docker-compose.prod.yml exec frontend wget -q -O- http://backend:3001/api/health"
echo ""
echo "3. 前端日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""

