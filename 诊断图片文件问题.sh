#!/bin/bash

# 诊断图片文件问题
# 检查文件是否存在，挂载是否正确

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
echo "🔍 诊断图片文件问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

TARGET_FILE="giip101-1762480663991-4ef73f7f3de310a9.jpg"

log_info "[1/6] 检查主机上的文件..."
if [ -d "uploads/images" ]; then
    FILE_COUNT=$(find uploads/images -type f | wc -l)
    log_info "找到 $FILE_COUNT 个图片文件"
    
    if [ -f "uploads/images/$TARGET_FILE" ]; then
        log_success "文件存在于主机: uploads/images/$TARGET_FILE"
        ls -lh "uploads/images/$TARGET_FILE"
    else
        log_warning "文件不存在于主机: uploads/images/$TARGET_FILE"
        log_info "主机上的图片文件列表："
        find uploads/images -type f | head -10 | while read f; do
            log_info "  - $f"
        done
    fi
else
    log_error "uploads/images 目录不存在"
fi

log_info "[2/6] 检查容器内的文件..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    if docker compose -f docker-compose.prod.yml exec -T backend test -f "/app/uploads/images/$TARGET_FILE"; then
        log_success "文件存在于容器: /app/uploads/images/$TARGET_FILE"
        docker compose -f docker-compose.prod.yml exec -T backend ls -lh "/app/uploads/images/$TARGET_FILE"
    else
        log_warning "文件不存在于容器: /app/uploads/images/$TARGET_FILE"
        log_info "容器内的图片文件列表："
        docker compose -f docker-compose.prod.yml exec -T backend find /app/uploads/images -type f 2>/dev/null | head -10 | while read f; do
            log_info "  - $f"
        done || log_warning "无法列出容器内的文件"
    fi
else
    log_error "后端容器未运行"
fi

log_info "[3/6] 检查挂载配置..."
MOUNT_INFO=$(docker compose -f docker-compose.prod.yml config | grep -A 2 "backend:" | grep -A 1 "volumes:" | grep "uploads" || echo "")
if [ -n "$MOUNT_INFO" ]; then
    log_success "找到挂载配置"
    echo "$MOUNT_INFO"
else
    log_warning "未找到 uploads 挂载配置"
fi

log_info "[4/6] 检查容器内的目录权限..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    docker compose -f docker-compose.prod.yml exec -T backend ls -ld /app/uploads 2>/dev/null || log_warning "无法检查 /app/uploads 权限"
    docker compose -f docker-compose.prod.yml exec -T backend ls -ld /app/uploads/images 2>/dev/null || log_warning "无法检查 /app/uploads/images 权限"
fi

log_info "[5/6] 检查后端日志中的文件请求..."
RECENT_REQUESTS=$(docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i "StaticFilesController" | tail -5)
if [ -n "$RECENT_REQUESTS" ]; then
    log_info "最近的文件请求："
    echo "$RECENT_REQUESTS"
else
    log_warning "未找到文件请求日志"
fi

log_info "[6/6] 测试文件访问..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    TEST_RESULT=$(docker compose -f docker-compose.prod.yml exec -T backend wget -q -O- --timeout=5 "http://localhost:3001/api/uploads/images/$TARGET_FILE" 2>&1 || echo "FAILED")
    if echo "$TEST_RESULT" | grep -q "FAILED\|404\|Not Found"; then
        log_warning "后端无法访问文件（404 或连接失败）"
    else
        log_success "后端可以访问文件"
    fi
fi

echo ""
echo "=========================================="
log_info "诊断完成"
echo "=========================================="
echo ""
echo "📋 可能的问题和解决方案："
echo ""
echo "1. 如果文件在主机但不在容器："
echo "   - 检查 Docker 卷挂载是否正确"
echo "   - 重启后端容器：docker compose -f docker-compose.prod.yml restart backend"
echo ""
echo "2. 如果文件不存在："
echo "   - 文件可能上传失败或被删除"
echo "   - 检查上传日志：docker compose -f docker-compose.prod.yml logs backend | grep -i 'upload\|EACCES'"
echo "   - 尝试重新上传文件"
echo ""
echo "3. 如果权限问题："
echo "   - 运行权限修复脚本"
echo "   - 检查 entrypoint 脚本是否正确执行"
echo ""
echo "4. 如果挂载问题："
echo "   - 检查 docker-compose.prod.yml 中的 volumes 配置"
echo "   - 确保主机上的 uploads 目录存在"
echo ""

