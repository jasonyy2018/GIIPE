#!/bin/bash

# 修复首页 Upcoming Events 显示问题
# 1. 添加日期过滤，只显示今天或未来的事件
# 2. 将排序改为升序（最早的事件在前面）

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
echo "🔧 修复首页 Upcoming Events 显示问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/2] 停止前端服务..."
docker compose -f docker-compose.prod.yml stop frontend
log_success "前端服务已停止"

log_info "[2/2] 重新构建前端（应用 Upcoming Events 修复）..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
log_success "前端构建完成"

log_info "启动前端服务..."
docker compose -f docker-compose.prod.yml up -d frontend
log_success "前端服务已启动"

log_info "等待服务启动..."
sleep 20

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps frontend

# 测试前端健康
log_info "测试前端健康检查..."
FRONTEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T frontend wget -q -O- http://localhost:3000 2>/dev/null | head -20 || echo "FAILED")
if echo "$FRONTEND_HEALTH" | grep -q "html\|<!DOCTYPE"; then
    log_success "前端服务正常响应"
else
    log_warning "前端服务可能未完全启动，请检查日志"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ 添加了日期过滤（startDateFrom），只显示今天或未来的 PUBLISHED 事件"
echo "2. ✅ 将排序改为升序（sortOrder=asc），最早的事件显示在前面"
echo "3. ✅ 修复了 SSR 和客户端重试逻辑中的查询参数"
echo ""
echo "📋 修复说明："
echo "- 之前：显示所有 PUBLISHED 事件，按开始日期降序排列（可能包含过去的事件）"
echo "- 现在：只显示今天或未来的 PUBLISHED 事件，按开始日期升序排列（最早的在前面）"
echo ""
echo "📋 验证步骤："
echo "1. 在浏览器中访问首页"
echo "2. 检查 'Upcoming Events' 部分是否显示 PUBLISHED 状态的事件"
echo "3. 确认只显示今天或未来的事件（不显示过去的事件）"
echo "4. 确认事件按开始日期升序排列（最早的在前面）"
echo ""
echo "📋 检查日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""

