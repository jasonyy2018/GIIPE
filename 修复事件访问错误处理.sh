#!/bin/bash

# 修复事件访问错误处理
# 1. 改进前端错误处理，区分 403 和 404
# 2. 重新构建前端

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
echo "🔧 修复事件访问错误处理"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/3] 停止前端服务..."
docker compose -f docker-compose.prod.yml stop frontend
log_success "前端服务已停止"

log_info "[2/3] 重新构建前端（应用错误处理修复）..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
log_success "前端构建完成"

log_info "[3/3] 启动前端服务..."
docker compose -f docker-compose.prod.yml up -d frontend
log_success "前端服务已启动"

log_info "等待服务启动..."
sleep 15

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps frontend

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ 前端错误处理：区分 403 Forbidden 和 404 Not Found"
echo "2. ✅ 错误消息改进：显示更具体的错误信息"
echo "3. ✅ 事件详情页面：显示 'Event Not Available' 而不是 'Event Not Found'（对于 403）"
echo ""
echo "📋 问题说明："
echo "- 事件存在但状态不是 PUBLISHED 时，后端返回 403 Forbidden"
echo "- 前端现在会显示：'This event is not available to the public. It may be a draft or unpublished event.'"
echo "- 如果事件不存在，会显示：'The event you are looking for does not exist.'"
echo ""
echo "📋 解决方案："
echo "如果事件是 DRAFT 状态，需要："
echo "1. 登录管理员账户"
echo "2. 进入事件管理页面"
echo "3. 找到该事件并点击 'Publish' 按钮"
echo "4. 发布后，事件状态变为 PUBLISHED，即可公开访问"
echo ""
echo "📋 验证步骤："
echo "1. 检查前端日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50"
echo ""
echo "2. 测试事件访问（替换为实际事件 ID）："
echo "   curl -I http://localhost:8085/events/cmhoab8h6000d8ksry07x4h2o"
echo ""
echo "3. 如果事件是 DRAFT，应该显示 'Event Not Available' 而不是 'Event Not Found'"
echo ""

