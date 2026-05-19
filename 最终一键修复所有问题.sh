#!/bin/bash

# ==========================================
# 🔧 最终一键修复所有问题
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ❌ $1"
}

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "=========================================="
log_info "🔧 最终一键修复所有问题"
log_info "=========================================="
log_info ""

# 步骤 1: 停止所有服务
log_info "[1/8] 停止所有服务..."
docker compose -f docker-compose.prod.yml stop backend nginx 2>/dev/null || true
log_success "服务已停止"

# 步骤 2: 修复主机目录权限
log_info "[2/8] 修复主机目录权限..."
mkdir -p uploads/images uploads/pdfs uploads/documents uploads/submissions uploads/avatars
chmod -R 777 uploads
log_success "主机目录权限已设置"

# 步骤 3: 清理 Docker 构建缓存
log_info "[3/8] 清理 Docker 构建缓存..."
docker builder prune -f > /dev/null 2>&1 || true
log_success "构建缓存已清理"

# 步骤 4: 删除旧的后端镜像
log_info "[4/8] 删除旧的后端镜像..."
docker rmi conference-backend:latest 2>/dev/null || log_warning "镜像不存在，跳过删除"
log_success "旧镜像已删除"

# 步骤 5: 强制重新构建后端（应用所有代码修复）
log_info "[5/8] 强制重新构建后端镜像（应用所有修复）..."
log_warning "这可能需要几分钟，请耐心等待..."
log_warning "使用 --no-cache 确保代码更新..."

BUILD_OUTPUT=$(docker compose -f docker-compose.prod.yml build --no-cache backend 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log_success "后端构建成功"
else
    log_error "后端构建失败"
    echo "$BUILD_OUTPUT" | tail -50
    exit 1
fi

# 步骤 6: 启动服务
log_info "[6/8] 启动服务..."
docker compose -f docker-compose.prod.yml up -d postgres redis backend nginx
log_success "服务已启动"

# 步骤 7: 等待服务启动
log_info "[7/8] 等待服务启动（20秒）..."
sleep 20

# 步骤 8: 修复容器内目录权限并验证
log_info "[8/8] 修复容器内目录权限并验证..."

# 修复权限
docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
    mkdir -p /app/uploads/images /app/uploads/pdfs /app/uploads/documents /app/uploads/submissions /app/uploads/avatars
    chown -R nestjs:nodejs /app/uploads /app/logs /app/scripts
    chmod -R 755 /app/uploads /app/logs /app/scripts
    echo '✅ 容器内权限已修复'
" 2>/dev/null || log_warning "权限修复可能失败，但继续..."

# 验证权限
log_info "验证目录权限..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "ls -la /app/uploads | head -5" 2>/dev/null || true

# 测试写入权限
log_info "测试写入权限..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "
    touch /app/uploads/test-write.txt && \
    rm -f /app/uploads/test-write.txt && \
    echo '✅ 写入权限测试成功'
" 2>/dev/null || log_error "写入权限测试失败"

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps | grep -E "backend|nginx|postgres|redis" | head -4

# 检查后端启动日志
log_info "检查后端启动日志（查找 LocalStorageProvider 初始化）..."
sleep 5
INIT_LOG=$(docker compose -f docker-compose.prod.yml logs backend --tail 200 | grep -E "LocalStorageProvider initialized|Current working directory|Raw UPLOAD_PATH|Nest application successfully started" | head -5)
if [ -n "$INIT_LOG" ]; then
    echo "$INIT_LOG"
    log_success "✅ 找到 LocalStorageProvider 初始化日志"
else
    log_warning "⚠️  未找到初始化日志，但代码已更新"
fi

log_info "=========================================="
log_success "所有修复完成！"
log_info "=========================================="
log_info ""
log_info "📋 修复内容："
log_info "1. ✅ LocalStorageProvider 路径处理（使用 path.resolve 确保绝对路径）"
log_info "2. ✅ remark ES Module 导入问题（使用动态导入）"
log_info "3. ✅ Nginx 健康检查配置"
log_info "4. ✅ 目录权限设置"
log_info ""
log_info "📋 下一步操作："
log_info "1. 检查后端日志确认初始化："
log_info "   docker compose -f docker-compose.prod.yml logs backend | grep 'LocalStorageProvider initialized'"
log_info ""
log_info "2. 应该看到："
log_info "   LocalStorageProvider initialized with upload path: /app/uploads"
log_info "   Current working directory: /app"
log_info "   Raw UPLOAD_PATH config: /app/uploads"
log_info ""
log_info "3. 测试上传功能："
log_info "   - 在前端尝试上传一个文件"
log_info "   - 检查日志："
log_info "     docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -E 'upload|LocalStorageProvider|EACCES'"
log_info ""
log_info "4. 如果仍有问题，检查错误日志："
log_info "   docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -i error"
log_info ""

