#!/bin/bash

# 最终修复权限问题 - 使用 entrypoint 脚本自动修复

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
echo "🔧 最终修复权限问题（使用 entrypoint 脚本）"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/5] 停止后端服务..."
docker compose -f docker-compose.prod.yml stop backend
log_success "后端服务已停止"

log_info "[2/5] 修复主机上传目录权限..."
# 确保主机目录存在且有正确权限
mkdir -p uploads/images uploads/documents uploads/pdfs uploads/avatars
chmod -R 777 uploads
log_success "主机目录权限已设置"

log_info "[3/5] 重新构建后端（应用 entrypoint 脚本）..."
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

log_info "[4/5] 启动后端服务..."
docker compose -f docker-compose.prod.yml up -d backend
log_success "后端服务已启动"

log_info "[5/5] 等待后端启动并验证..."
sleep 15

# 检查后端日志中是否有权限修复信息
log_info "检查后端启动日志（应该看到权限修复信息）..."
PERMISSION_LOG=$(docker compose -f docker-compose.prod.yml logs backend --tail 30 | grep -i "Fixing permissions\|Permissions fixed\|Switching to nestjs" || echo "")

if [ -n "$PERMISSION_LOG" ]; then
    log_success "✅ 权限修复脚本已执行"
    echo "$PERMISSION_LOG" | head -5
else
    log_warning "⚠️  未找到权限修复日志，请检查 entrypoint 脚本"
fi

# 检查权限错误
log_info "检查权限错误..."
PERMISSION_ERRORS=$(docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i "EACCES\|permission denied" || echo "")

if [ -z "$PERMISSION_ERRORS" ]; then
    log_success "✅ 未发现权限错误"
else
    log_warning "⚠️  仍可能有权限错误，请检查日志"
    echo "$PERMISSION_ERRORS" | head -3
fi

# 测试写入权限
log_info "测试写入权限..."
TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    TEST_FILE=\"/app/uploads/test_write_\$(date +%s).txt\"
    echo 'test' > \"\$TEST_FILE\" 2>&1 && rm -f \"\$TEST_FILE\" && echo 'SUCCESS' || echo 'FAILED'
" 2>&1)

if echo "$TEST_RESULT" | grep -q "SUCCESS"; then
    log_success "✅ 写入权限测试成功"
else
    log_error "❌ 写入权限测试失败"
    echo "$TEST_RESULT"
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
echo "1. ✅ Entrypoint 脚本已添加（启动时自动修复权限）"
echo "2. ✅ 容器以 root 启动，修复权限后切换到 nestjs 用户"
echo "3. ✅ 主机目录权限已修复"
echo ""
echo "📋 验证步骤："
echo "1. 检查后端日志，应该看到权限修复信息："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 30 | grep -i 'permission'"
echo ""
echo "2. 检查权限错误："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i 'EACCES'"
echo ""
echo "3. 测试文件上传功能"
echo ""

