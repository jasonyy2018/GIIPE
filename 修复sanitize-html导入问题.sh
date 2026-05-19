#!/bin/bash

# 修复 sanitize-html 导入问题

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
echo "🔧 修复 sanitize-html 导入问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/4] 停止后端服务..."
docker compose -f docker-compose.prod.yml stop backend
log_success "后端服务已停止"

log_info "[2/4] 重新构建后端（应用 sanitize-html 修复）..."
log_warning "这可能需要几分钟..."

BUILD_OUTPUT=$(docker compose -f docker-compose.prod.yml build --no-cache backend 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log_success "后端构建成功"
else
    log_error "后端构建失败"
    echo "$BUILD_OUTPUT" | tail -50
    exit 1
fi

log_info "[3/4] 启动后端服务..."
docker compose -f docker-compose.prod.yml up -d backend
log_success "后端服务已启动"

log_info "[4/4] 等待后端启动并验证..."
sleep 15

# 检查后端日志中是否有 sanitize-html 错误
log_info "检查后端日志（应该不再有 sanitize-html 错误）..."
SANITIZE_ERRORS=$(docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i "sanitize.*html\|sanitize_html" || echo "")

if [ -z "$SANITIZE_ERRORS" ]; then
    log_success "✅ 未发现 sanitize-html 错误"
else
    log_warning "⚠️  仍可能有 sanitize-html 错误，请检查日志"
    echo "$SANITIZE_ERRORS" | head -5
fi

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps backend

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 修复内容："
echo "1. ✅ sanitize-html 导入已修复（支持 CommonJS 和 ES 模块）"
echo ""
echo "📋 验证步骤："
echo "1. 检查后端日志，应该不再有 sanitize-html 错误："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i 'sanitize'"
echo ""
echo "2. 测试创建事件功能（应该不再出现 markdown 处理错误）"
echo ""
echo "3. 如果仍有问题，检查完整日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 100"
echo ""

