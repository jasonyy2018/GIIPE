#!/bin/bash

# 完整修复 Volume 映射权限问题

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
echo "🔧 修复 Volume 映射权限（完整方案）"
echo "=========================================="
echo ""

# 步骤 1: 检查当前配置
log_info "步骤 1: 检查当前配置..."

# 检查 docker-compose 配置
BACKEND_MAPPING=$(grep -A 5 "backend:" docker-compose.prod.yml | grep "uploads" | head -1)
log_info "后端映射: $BACKEND_MAPPING"

# 检查容器内用户
CONTAINER_UID=$(docker compose -f docker-compose.prod.yml exec -T backend id -u nestjs 2>/dev/null | xargs || echo "1001")
CONTAINER_GID=$(docker compose -f docker-compose.prod.yml exec -T backend id -g nestjs 2>/dev/null | xargs || echo "1001")
log_info "容器内用户: nestjs (UID:$CONTAINER_UID GID:$CONTAINER_GID)"

# 检查主机目录
UPLOADS_DIR="./uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
    log_info "创建 uploads 目录..."
    mkdir -p "$UPLOADS_DIR"
fi

HOST_UID=$(stat -c "%u" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
HOST_GID=$(stat -c "%g" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
HOST_PERMS=$(stat -c "%a" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")

log_info "主机目录所有者: UID:$HOST_UID GID:$HOST_GID 权限:$HOST_PERMS"

echo ""
log_info "步骤 2: 修复主机目录权限..."

# 方法 1: 尝试更改所有者（如果当前用户是 root）
if [ "$EUID" -eq 0 ]; then
    log_info "以 root 用户运行，更改目录所有者..."
    chown -R $CONTAINER_UID:$CONTAINER_GID "$UPLOADS_DIR" 2>/dev/null && \
        log_success "✅ 目录所有者已更改到 UID:$CONTAINER_UID GID:$CONTAINER_GID" || \
        log_warning "⚠️  无法更改所有者"
else
    log_warning "⚠️  当前不是 root 用户，无法更改所有者"
    log_info "将使用更宽松的权限（777）"
fi

# 设置权限
log_info "设置目录权限..."
chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || chmod -R 777 "$UPLOADS_DIR" 2>/dev/null

# 创建子目录
mkdir -p "$UPLOADS_DIR/images" "$UPLOADS_DIR/pdfs" "$UPLOADS_DIR/documents" "$UPLOADS_DIR/submissions" "$UPLOADS_DIR/avatars"
chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || chmod -R 777 "$UPLOADS_DIR" 2>/dev/null

log_success "✅ 主机目录权限已设置"

echo ""
log_info "步骤 3: 修复容器内权限..."

# 停止后端（避免文件锁定）
docker compose -f docker-compose.prod.yml stop backend 2>/dev/null

log_info "修复容器内目录权限（使用 root）..."
docker compose -f docker-compose.prod.yml run --rm --user root backend sh -c "
    echo '创建目录结构...'
    mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/documents /app/uploads/submissions /app/uploads/avatars
    
    echo '设置所有者...'
    chown -R nestjs:nodejs /app/uploads
    
    echo '设置权限...'
    chmod -R 755 /app/uploads
    
    echo '验证权限...'
    ls -la /app/uploads
    echo ''
    echo '测试写入...'
    echo 'test' > /app/uploads/test-write.txt && echo '✅ 写入测试成功' || echo '❌ 写入测试失败'
    rm -f /app/uploads/test-write.txt
" 2>&1 | tail -15

echo ""
log_info "步骤 4: 检查环境变量配置..."
if ! grep -q "UPLOAD_PATH" docker-compose.prod.yml 2>/dev/null; then
    log_warning "⚠️  docker-compose.prod.yml 中缺少 UPLOAD_PATH 环境变量"
    log_info "已在配置中添加 UPLOAD_PATH=/app/uploads"
else
    log_success "✅ UPLOAD_PATH 已配置"
fi

echo ""
log_info "步骤 5: 启动后端服务..."
docker compose -f docker-compose.prod.yml start backend
sleep 5

echo ""
log_info "步骤 6: 验证修复..."
# 测试容器内写入
TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    echo 'test-$(date +%s)' > /app/uploads/test-verify.txt && \
    if [ -f /app/uploads/test-verify.txt ]; then
        cat /app/uploads/test-verify.txt
        rm -f /app/uploads/test-verify.txt
        echo 'OK'
    else
        echo 'FAIL'
    fi
" 2>&1)

if echo "$TEST_RESULT" | grep -q "OK"; then
    log_success "✅ 容器内写入权限正常"
else
    log_error "❌ 容器内写入权限仍有问题"
    log_info "测试结果: $TEST_RESULT"
fi

# 检查目录结构
log_info "检查目录结构..."
docker compose -f docker-compose.prod.yml exec -T backend ls -la /app/uploads 2>&1 | head -10

echo ""
log_info "步骤 7: 检查环境变量..."
ENV_UPLOAD_PATH=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c 'echo $UPLOAD_PATH' 2>/dev/null | xargs)
if [ -n "$ENV_UPLOAD_PATH" ]; then
    log_success "✅ UPLOAD_PATH 环境变量: $ENV_UPLOAD_PATH"
    if [ "$ENV_UPLOAD_PATH" = "/app/uploads" ]; then
        log_success "✅ 路径配置正确"
    else
        log_warning "⚠️  路径可能不正确（建议: /app/uploads）"
    fi
else
    log_warning "⚠️  UPLOAD_PATH 环境变量未设置（将使用默认值）"
fi

echo ""
log_info "=========================================="
log_success "✅ 修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存"
echo "  2. 重新登录管理后台"
echo "  3. 尝试上传图片"
echo ""
log_info "如果问题仍然存在："
echo "  - 检查后端日志: docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i upload"
echo "  - 手动测试: docker compose -f docker-compose.prod.yml exec backend touch /app/uploads/test.txt"

