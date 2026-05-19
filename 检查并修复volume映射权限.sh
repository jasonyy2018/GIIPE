#!/bin/bash

# 检查并修复 Docker volume 映射权限问题

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
echo "🔍 检查 Docker Volume 映射权限"
echo "=========================================="
echo ""

# 步骤 1: 检查 docker-compose 配置
log_info "步骤 1: 检查 docker-compose.prod.yml 配置..."
BACKEND_VOLUME=$(grep -A 1 "backend:" docker-compose.prod.yml | grep "uploads" | head -1)
NGINX_VOLUME=$(grep -A 1 "nginx:" docker-compose.prod.yml | grep "uploads" | head -1)

log_info "后端 volume 映射: $BACKEND_VOLUME"
log_info "Nginx volume 映射: $NGINX_VOLUME"

# 检查映射配置
if echo "$BACKEND_VOLUME" | grep -q "./uploads:/app/uploads"; then
    log_success "✅ 后端映射配置正确: ./uploads -> /app/uploads"
else
    log_error "❌ 后端映射配置可能有问题"
fi

if echo "$NGINX_VOLUME" | grep -q "./uploads:/var/www/uploads:ro"; then
    log_success "✅ Nginx 映射配置正确: ./uploads -> /var/www/uploads (只读)"
else
    log_warning "⚠️  Nginx 映射配置可能有问题"
fi

echo ""
log_info "步骤 2: 检查主机目录权限..."
UPLOADS_DIR="./uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
    log_info "创建 uploads 目录..."
    mkdir -p "$UPLOADS_DIR"
fi

# 获取当前所有者和权限
CURRENT_OWNER=$(stat -c "%U:%G" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
CURRENT_PERMS=$(stat -c "%a" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
CURRENT_UID=$(stat -c "%u" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")
CURRENT_GID=$(stat -c "%g" "$UPLOADS_DIR" 2>/dev/null || echo "unknown")

log_info "当前目录所有者: $CURRENT_OWNER (UID:$CURRENT_UID GID:$CURRENT_GID)"
log_info "当前目录权限: $CURRENT_PERMS"

# 检查容器内用户 UID/GID
log_info "步骤 3: 检查容器内用户配置..."
CONTAINER_UID=$(docker compose -f docker-compose.prod.yml exec -T backend id -u nestjs 2>/dev/null | xargs || echo "1001")
CONTAINER_GID=$(docker compose -f docker-compose.prod.yml exec -T backend id -g nestjs 2>/dev/null | xargs || echo "1001")

log_info "容器内 nestjs 用户: UID=$CONTAINER_UID, GID=$CONTAINER_GID"

echo ""
log_info "步骤 4: 分析权限问题..."
if [ "$CURRENT_UID" != "$CONTAINER_UID" ] && [ "$CURRENT_UID" != "unknown" ]; then
    log_error "❌ 权限不匹配！"
    log_error "   主机目录所有者 UID: $CURRENT_UID"
    log_error "   容器内用户 UID: $CONTAINER_UID"
    log_warning "   这会导致容器内用户无法写入文件"
    NEED_FIX=true
else
    log_success "✅ UID 匹配"
    NEED_FIX=false
fi

if [ "$CURRENT_PERMS" != "755" ] && [ "$CURRENT_PERMS" != "777" ]; then
    log_warning "⚠️  目录权限可能需要调整（当前: $CURRENT_PERMS，建议: 755 或 777）"
    NEED_FIX=true
fi

echo ""
if [ "$NEED_FIX" = "true" ]; then
    log_info "步骤 5: 修复权限..."
    
    # 方法 1: 更改目录所有者（如果可能）
    log_info "尝试更改目录所有者到 UID $CONTAINER_UID..."
    if chown -R $CONTAINER_UID:$CONTAINER_GID "$UPLOADS_DIR" 2>/dev/null; then
        log_success "✅ 目录所有者已更改"
    else
        log_warning "⚠️  无法更改所有者（可能需要 root 权限）"
        log_info "尝试使用更宽松的权限..."
        chmod -R 777 "$UPLOADS_DIR" 2>/dev/null && log_success "✅ 权限已设置为 777" || log_error "❌ 权限设置失败"
    fi
    
    # 方法 2: 确保子目录存在并有正确权限
    mkdir -p "$UPLOADS_DIR/images" "$UPLOADS_DIR/pdfs" "$UPLOADS_DIR/documents"
    chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || chmod -R 777 "$UPLOADS_DIR" 2>/dev/null
    
    log_success "✅ 目录权限已修复"
else
    log_info "权限检查通过，无需修复"
fi

echo ""
log_info "步骤 6: 检查容器内权限..."
CONTAINER_PERMS=$(docker compose -f docker-compose.prod.yml exec -T backend ls -ld /app/uploads 2>/dev/null | awk '{print $1, $3, $4}' || echo "无法检查")

log_info "容器内 /app/uploads 权限: $CONTAINER_PERMS"

# 如果容器内权限不对，修复它
if ! echo "$CONTAINER_PERMS" | grep -q "nestjs\|nodejs\|1001"; then
    log_warning "⚠️  容器内权限可能不正确，尝试修复..."
    docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
        chown -R nestjs:nodejs /app/uploads
        chmod -R 755 /app/uploads
        ls -ld /app/uploads
    " 2>&1 | tail -3
fi

echo ""
log_info "步骤 7: 检查环境变量配置..."
if grep -q "UPLOAD_PATH" docker-compose.prod.yml 2>/dev/null || grep -q "UPLOAD_PATH" .env.production 2>/dev/null; then
    UPLOAD_PATH=$(grep "^UPLOAD_PATH" .env.production 2>/dev/null | cut -d'=' -f2 | xargs || echo "")
    if [ -n "$UPLOAD_PATH" ]; then
        log_info "UPLOAD_PATH 环境变量: $UPLOAD_PATH"
        if [ "$UPLOAD_PATH" = "/app/uploads" ] || [ "$UPLOAD_PATH" = "./uploads" ]; then
            log_success "✅ UPLOAD_PATH 配置正确"
        else
            log_warning "⚠️  UPLOAD_PATH 可能不正确: $UPLOAD_PATH"
            log_info "建议设置为: /app/uploads (容器内绝对路径)"
        fi
    fi
else
    log_warning "⚠️  UPLOAD_PATH 未配置，将使用默认值 ./uploads"
    log_info "建议在 docker-compose.prod.yml 或 .env.production 中添加："
    echo "  UPLOAD_PATH=/app/uploads"
fi

echo ""
log_info "步骤 8: 测试写入权限..."
TEST_FILE="uploads/test-write-$(date +%s).txt"
if echo "test" > "$TEST_FILE" 2>/dev/null; then
    log_success "✅ 主机写入测试成功"
    rm -f "$TEST_FILE"
else
    log_error "❌ 主机写入测试失败"
fi

# 测试容器内写入
CONTAINER_TEST=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "echo 'test' > /app/uploads/test-container.txt && echo 'OK' || echo 'FAIL'" 2>&1)
if echo "$CONTAINER_TEST" | grep -q "OK"; then
    log_success "✅ 容器内写入测试成功"
    docker compose -f docker-compose.prod.yml exec -T backend rm -f /app/uploads/test-container.txt 2>/dev/null || true
else
    log_error "❌ 容器内写入测试失败"
    log_info "错误信息: $CONTAINER_TEST"
fi

echo ""
log_info "=========================================="
log_success "✅ 检查完成"
log_info "=========================================="
echo ""
log_info "总结："
echo "  - Volume 映射: ./uploads -> /app/uploads (后端), ./uploads -> /var/www/uploads:ro (Nginx)"
echo "  - 容器内用户: nestjs (UID:$CONTAINER_UID GID:$CONTAINER_GID)"
echo "  - 主机目录所有者: UID:$CURRENT_UID GID:$CURRENT_GID"
echo ""
log_info "如果仍有问题，建议："
echo "  1. 确保主机目录权限为 755 或 777"
echo "  2. 或者更改主机目录所有者到 UID $CONTAINER_UID"
echo "  3. 检查环境变量 UPLOAD_PATH 是否设置为 /app/uploads"

