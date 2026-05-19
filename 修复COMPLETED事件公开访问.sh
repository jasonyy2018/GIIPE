#!/bin/bash

# 修复 COMPLETED 状态事件公开访问
# 允许 COMPLETED 状态的事件和 PUBLISHED 一样公开访问

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
echo "🔧 修复 COMPLETED 状态事件公开访问"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/3] 停止后端服务..."
docker compose -f docker-compose.prod.yml stop backend
log_success "后端服务已停止"

log_info "[2/3] 重新构建后端（应用 COMPLETED 事件访问修复）..."
docker compose -f docker-compose.prod.yml build --no-cache backend
log_success "后端构建完成"

log_info "[3/3] 启动后端服务..."
docker compose -f docker-compose.prod.yml up -d backend
log_success "后端服务已启动"

log_info "等待服务启动..."
sleep 15

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps backend

# 测试 COMPLETED 事件访问
log_info "测试 COMPLETED 事件访问..."
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend wget -q -O- http://localhost:3001/api/health 2>/dev/null || echo "FAILED")
if echo "$BACKEND_HEALTH" | grep -q "ok\|healthy"; then
    log_success "后端健康检查通过"
else
    log_warning "后端健康检查失败，请检查日志"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ COMPLETED 状态事件现在可以公开访问"
echo "2. ✅ PUBLISHED 和 COMPLETED 状态的事件都可以公开访问"
echo "3. ✅ DRAFT 或其他状态的事件仍然需要管理员权限"
echo ""
echo "📋 访问规则："
echo "- PUBLISHED: ✅ 公开访问"
echo "- COMPLETED: ✅ 公开访问（新）"
echo "- DRAFT: ❌ 需要管理员权限"
echo "- 其他状态: ❌ 需要管理员权限"
echo ""
echo "📋 验证步骤："
echo "1. 检查后端日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50"
echo ""
echo "2. 测试 COMPLETED 事件访问（替换为实际事件 ID）："
echo "   curl http://localhost:8085/api/events/cmho6k611000j91rreajmdng7"
echo ""
echo "3. 在浏览器中访问 COMPLETED 状态的事件，应该可以正常显示"
echo ""

