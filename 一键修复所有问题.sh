#!/bin/bash

# 一键修复所有问题：权限 + 重新构建后端

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo "=========================================="
echo "🔧 一键修复所有问题"
echo "=========================================="
echo ""

# 步骤 1: 创建 Nginx 日志文件
log_info "[1/5] 创建 Nginx 日志文件..."
mkdir -p logs/nginx
touch logs/nginx/error.log logs/nginx/access.log
chmod 666 logs/nginx/*.log 2>/dev/null || chmod 777 logs/nginx/*.log
log_success "✅ Nginx 日志文件已创建"

# 步骤 2: 修复上传目录权限
log_info "[2/5] 修复上传目录权限..."
mkdir -p uploads/images uploads/pdfs uploads/documents uploads/submissions uploads/avatars
chmod -R 777 uploads
log_success "✅ 主机目录权限已设置"

# 步骤 3: 修复容器内权限
log_info "[3/5] 修复容器内目录权限..."
docker compose -f docker-compose.prod.yml stop backend 2>/dev/null || true

docker compose -f docker-compose.prod.yml run --rm --user root backend sh -c "
    mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/documents /app/uploads/submissions /app/uploads/avatars
    chown -R nestjs:nodejs /app/uploads
    chmod -R 755 /app/uploads
    echo '✅ 容器内权限已修复'
    ls -la /app/uploads | head -5
" 2>&1 | tail -10

log_success "✅ 容器内权限已修复"

# 步骤 4: 重新构建后端（应用所有修复：remark + 路径处理 + logger）
log_info "[4/6] 重新构建后端镜像（应用所有修复）..."
log_warning "这可能需要几分钟，请耐心等待..."
log_warning "强制重新构建（不使用缓存）以确保代码更新..."

BUILD_OUTPUT=$(docker compose -f docker-compose.prod.yml build --no-cache backend 2>&1)
BUILD_EXIT_CODE=$?

echo "$BUILD_OUTPUT" | tail -30

# 检查构建是否成功（忽略警告信息）
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    # 检查是否有真正的错误（不是警告）
    if echo "$BUILD_OUTPUT" | grep -qiE "error.*failed|failed.*solve|exit code 1|TS[0-9]+.*error"; then
        log_error "❌ 构建过程中有错误"
        echo "$BUILD_OUTPUT" | grep -iE "error|failed" | tail -10
        exit 1
    else
        log_success "✅ 后端构建成功"
    fi
else
    log_error "❌ 后端构建失败 (退出码: $BUILD_EXIT_CODE)"
    echo "$BUILD_OUTPUT" | grep -iE "error|failed" | tail -10
    exit 1
fi

# 步骤 5: 重启后端服务
log_info "[5/6] 重启后端服务..."
docker compose -f docker-compose.prod.yml restart nginx backend
sleep 5

# 步骤 6: 在运行中的容器内再次修复权限（确保权限正确）
log_info "[6/6] 在运行中的容器内再次修复权限并验证..."
docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
    mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/documents /app/uploads/submissions /app/uploads/avatars
    chown -R nestjs:nodejs /app/uploads
    chmod -R 755 /app/uploads
    echo '✅ 运行时权限已修复'
    ls -la /app/uploads | head -5
" 2>&1 | tail -10

# 验证
log_info "验证服务状态..."
docker compose -f docker-compose.prod.yml ps | grep -E "nginx|backend" | head -2

log_info "检查后端启动日志..."
STARTUP_LOG=$(docker compose -f docker-compose.prod.yml logs backend --tail 30)
echo "$STARTUP_LOG" | grep -i "started\|LocalStorageProvider\|error\|remark" | tail -10

# 验证 LocalStorageProvider 是否正确初始化
if echo "$STARTUP_LOG" | grep -q "LocalStorageProvider initialized with upload path: /app/uploads"; then
    log_success "✅ LocalStorageProvider 已正确初始化（使用绝对路径）"
else
    log_warning "⚠️  未找到 LocalStorageProvider 初始化日志，可能仍在使用旧代码"
    log_info "请确认后端已重新构建并重启"
fi

# 测试写入权限
log_info "测试写入权限..."
TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "echo 'test' > /app/uploads/test-write.txt && echo 'OK' || echo 'FAIL'" 2>&1)
if echo "$TEST_RESULT" | grep -q "OK"; then
    log_success "✅ 写入权限测试成功"
    docker compose -f docker-compose.prod.yml exec -T backend rm -f /app/uploads/test-write.txt 2>/dev/null || true
else
    log_error "❌ 写入权限测试失败"
    log_info "测试结果: $TEST_RESULT"
fi

echo ""
log_info "=========================================="
log_success "✅ 所有修复完成！"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存"
echo "  2. 重新尝试上传图片和创建事件"
echo ""
log_info "如果仍有问题，检查日志："
echo "  docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i error"

