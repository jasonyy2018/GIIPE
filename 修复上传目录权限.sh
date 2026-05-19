#!/bin/bash

# 修复上传目录权限问题

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "=========================================="
echo "🔧 修复上传目录权限"
echo "=========================================="
echo ""

# 步骤 1: 检查 uploads 目录
log_info "步骤 1: 检查 uploads 目录..."
if [ ! -d "uploads" ]; then
    log_info "创建 uploads 目录..."
    mkdir -p uploads
    log_success "✅ uploads 目录已创建"
fi

# 检查当前权限
CURRENT_PERMS=$(stat -c "%a" uploads 2>/dev/null || echo "unknown")
log_info "当前 uploads 目录权限: $CURRENT_PERMS"

echo ""
log_info "步骤 2: 修复主机目录权限..."
# 设置正确的权限（755 = rwxr-xr-x）
chmod 755 uploads
log_success "✅ 主机目录权限已设置为 755"

# 创建子目录
mkdir -p uploads/images uploads/pdfs uploads/documents
chmod -R 755 uploads

echo ""
log_info "步骤 3: 修复容器内目录权限..."
# 停止后端（避免文件锁定）
log_info "停止后端服务..."
docker compose -f docker-compose.prod.yml stop backend

# 修复容器内权限（使用 root 用户）
log_info "修复容器内目录权限..."
docker compose -f docker-compose.prod.yml run --rm --user root backend sh -c "
    mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/documents
    chown -R nestjs:nodejs /app/uploads
    chmod -R 755 /app/uploads
    ls -la /app/uploads
" 2>&1 | tail -10

if [ $? -eq 0 ]; then
    log_success "✅ 容器内目录权限已修复"
else
    log_warning "⚠️  容器可能不存在或已停止，将在启动时修复"
fi

echo ""
log_info "步骤 4: 启动后端服务..."
docker compose -f docker-compose.prod.yml start backend

log_info "等待后端启动..."
sleep 5

# 验证权限
log_info "步骤 5: 验证权限..."
CONTAINER_PERMS=$(docker compose -f docker-compose.prod.yml exec -T backend ls -ld /app/uploads 2>/dev/null | awk '{print $1, $3, $4}' || echo "无法检查")

if echo "$CONTAINER_PERMS" | grep -q "nestjs\|nodejs"; then
    log_success "✅ 容器内目录所有者正确"
    echo "   $CONTAINER_PERMS"
else
    log_warning "⚠️  可能需要手动修复容器内权限"
    log_info "手动修复命令："
    echo "   docker compose -f docker-compose.prod.yml exec -u root backend chown -R nestjs:nodejs /app/uploads"
    echo "   docker compose -f docker-compose.prod.yml exec -u root backend chmod -R 755 /app/uploads"
fi

echo ""
log_info "步骤 6: 测试写入权限..."
TEST_FILE="/app/uploads/test-$(date +%s).txt"
TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "echo 'test' > $TEST_FILE && echo 'OK' || echo 'FAIL'" 2>&1)

if echo "$TEST_RESULT" | grep -q "OK"; then
    log_success "✅ 写入权限正常"
    # 清理测试文件
    docker compose -f docker-compose.prod.yml exec -T backend rm -f "$TEST_FILE" 2>/dev/null || true
else
    log_error "❌ 写入权限测试失败"
    log_info "尝试使用 root 修复权限..."
    docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
        chown -R nestjs:nodejs /app/uploads
        chmod -R 755 /app/uploads
        echo 'test' > $TEST_FILE && echo 'OK' || echo 'FAIL'
    " 2>&1 | tail -5
fi

echo ""
log_info "=========================================="
log_success "✅ 权限修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存"
echo "  2. 重新登录管理后台"
echo "  3. 尝试上传图片"
echo ""
log_info "如果问题仍然存在，检查："
echo "  - 后端日志: docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i upload"
echo "  - 目录权限: ls -la uploads/"
echo "  - 容器权限: docker compose -f docker-compose.prod.yml exec backend ls -la /app/uploads"

