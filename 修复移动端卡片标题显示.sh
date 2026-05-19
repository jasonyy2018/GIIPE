#!/bin/bash

# 修复移动端 Events 和 News 卡片标题显示
# 在移动端限制标题为 2 行，桌面端保持原样

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
echo "🔧 修复移动端卡片标题显示"
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

log_info "[2/2] 重新构建前端（应用移动端标题修复）..."
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
echo "1. ✅ EventCard 标题在移动端限制为 2 行（line-clamp-2）"
echo "2. ✅ NewsCard 标题在移动端限制为 2 行（line-clamp-2）"
echo "3. ✅ 桌面端（md 及以上）保持原样，不限制行数（md:line-clamp-none）"
echo ""
echo "📋 修复说明："
echo "- 移动端：标题最多显示 2 行，超出部分用省略号（...）显示"
echo "- 桌面端：标题完整显示，不限制行数"
echo "- 使用 Tailwind CSS 的响应式类实现，无需额外配置"
echo ""
echo "📋 验证步骤："
echo "1. 在移动设备或浏览器开发者工具的移动端模式下访问首页"
echo "2. 检查 Events 和 News 卡片的标题是否只显示 2 行"
echo "3. 切换到桌面端视图，确认标题完整显示"
echo ""
echo "📋 检查日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""

