#!/bin/bash

# 修复 PDF 上传目录权限问题

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
echo "🔧 修复 PDF 上传目录权限"
echo "=========================================="
echo ""

# 步骤 1: 修复主机目录
log_info "步骤 1: 创建并设置主机目录权限..."
UPLOADS_DIR="./uploads"

# 创建所有必要的子目录
mkdir -p "$UPLOADS_DIR/images" "$UPLOADS_DIR/pdfs" "$UPLOADS_DIR/documents" "$UPLOADS_DIR/submissions" "$UPLOADS_DIR/avatars"

# 设置权限（777 最宽松，确保可以写入）
chmod -R 777 "$UPLOADS_DIR"

log_success "✅ 主机目录权限已设置"

# 检查容器内用户 UID/GID
log_info "步骤 2: 检查容器内用户配置..."
CONTAINER_UID=$(docker compose -f docker-compose.prod.yml exec -T backend id -u nestjs 2>/dev/null | xargs || echo "1001")
CONTAINER_GID=$(docker compose -f docker-compose.prod.yml exec -T backend id -g nestjs 2>/dev/null | xargs || echo "1001")

log_info "容器内 nestjs 用户: UID=$CONTAINER_UID, GID=$CONTAINER_GID"

# 如果可能，更改所有者
if [ "$EUID" -eq 0 ]; then
    log_info "以 root 用户运行，更改目录所有者..."
    chown -R $CONTAINER_UID:$CONTAINER_GID "$UPLOADS_DIR" 2>/dev/null && \
        log_success "✅ 目录所有者已更改到 UID:$CONTAINER_UID GID:$CONTAINER_GID" || \
        log_warning "⚠️  无法更改所有者（将继续使用 777 权限）"
else
    log_warning "⚠️  当前不是 root 用户，使用 777 权限"
fi

echo ""
log_info "步骤 3: 修复容器内目录权限..."
# 停止后端（避免文件锁定）
docker compose -f docker-compose.prod.yml stop backend 2>/dev/null

log_info "修复容器内目录权限（使用 root）..."
docker compose -f docker-compose.prod.yml run --rm --user root backend sh -c "
    echo '创建所有必要的目录...'
    mkdir -p /app/uploads/images
    mkdir -p /app/uploads/pdfs
    mkdir -p /app/uploads/documents
    mkdir -p /app/uploads/submissions
    mkdir -p /app/uploads/avatars
    
    echo '设置所有者...'
    chown -R nestjs:nodejs /app/uploads
    
    echo '设置权限...'
    chmod -R 755 /app/uploads
    
    echo '验证权限...'
    ls -la /app/uploads
    echo ''
    echo '测试创建目录...'
    mkdir -p /app/uploads/test-dir && echo '✅ 目录创建测试成功' || echo '❌ 目录创建测试失败'
    rmdir /app/uploads/test-dir 2>/dev/null || true
    echo ''
    echo '测试写入...'
    echo 'test' > /app/uploads/test-write.txt && echo '✅ 写入测试成功' || echo '❌ 写入测试失败'
    rm -f /app/uploads/test-write.txt
" 2>&1 | tail -20

echo ""
log_info "步骤 4: 启动后端服务..."
docker compose -f docker-compose.prod.yml start backend
sleep 5

echo ""
log_info "步骤 5: 验证修复..."
# 测试容器内创建目录和写入
TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    mkdir -p /app/uploads/pdfs/test-$(date +%s) && \
    if [ -d /app/uploads/pdfs/test-* ]; then
        echo 'OK'
        rmdir /app/uploads/pdfs/test-* 2>/dev/null || true
    else
        echo 'FAIL'
    fi
" 2>&1)

if echo "$TEST_RESULT" | grep -q "OK"; then
    log_success "✅ 容器内目录创建权限正常"
else
    log_error "❌ 容器内目录创建权限仍有问题"
    log_info "测试结果: $TEST_RESULT"
    log_info "尝试使用 root 修复权限..."
    docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
        mkdir -p /app/uploads/pdfs
        chown -R nestjs:nodejs /app/uploads
        chmod -R 755 /app/uploads
        ls -la /app/uploads | head -10
    " 2>&1 | tail -10
fi

# 检查所有子目录
log_info "检查所有子目录..."
docker compose -f docker-compose.prod.yml exec -T backend ls -la /app/uploads 2>&1 | head -10

echo ""
log_info "=========================================="
log_success "✅ 权限修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存"
echo "  2. 重新尝试上传 PDF"
echo ""
log_info "如果问题仍然存在："
echo "  - 检查后端日志: docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i upload"
echo "  - 检查目录权限: ls -la uploads/"
echo "  - 手动测试: docker compose -f docker-compose.prod.yml exec backend mkdir -p /app/uploads/pdfs/test"

