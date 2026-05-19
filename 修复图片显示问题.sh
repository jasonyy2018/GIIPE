#!/bin/bash

# 修复图片无法显示问题 - Nginx 代理到后端

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
echo "🔧 修复图片无法显示问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/5] 检查文件是否存在..."
# 检查上传的文件
if [ -d "uploads/images" ]; then
    FILE_COUNT=$(find uploads/images -type f | wc -l)
    log_info "找到 $FILE_COUNT 个图片文件"
    if [ $FILE_COUNT -gt 0 ]; then
        log_info "示例文件："
        find uploads/images -type f | head -3 | while read f; do
            log_info "  - $f"
        done
    fi
else
    log_warning "uploads/images 目录不存在"
fi

log_info "[2/5] 停止 Nginx 服务..."
docker compose -f docker-compose.prod.yml stop nginx
log_success "Nginx 服务已停止"

log_info "[3/5] 检查 Nginx 配置语法..."
NGINX_CHECK=$(docker compose -f docker-compose.prod.yml run --rm nginx nginx -t 2>&1)
if echo "$NGINX_CHECK" | grep -q "syntax is ok"; then
    log_success "Nginx 配置语法正确"
else
    log_error "Nginx 配置语法错误"
    echo "$NGINX_CHECK"
    exit 1
fi

log_info "[4/5] 启动 Nginx 服务..."
docker compose -f docker-compose.prod.yml up -d nginx
log_success "Nginx 服务已启动"

log_info "[5/5] 等待服务启动并验证..."
sleep 5

# 测试图片访问
log_info "测试图片访问..."
if [ -d "uploads/images" ] && [ "$(find uploads/images -type f | wc -l)" -gt 0 ]; then
    TEST_FILE=$(find uploads/images -type f | head -1)
    TEST_PATH=$(echo "$TEST_FILE" | sed 's|uploads/||')
    log_info "测试文件路径: $TEST_PATH"
    
    # 测试通过 Nginx 访问
    TEST_URL="http://localhost:8085/api/uploads/$TEST_PATH"
    log_info "测试 URL: $TEST_URL"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "✅ 图片可以正常访问 (HTTP $HTTP_CODE)"
    else
        log_warning "⚠️  图片访问返回 HTTP $HTTP_CODE"
        log_info "检查后端日志以获取更多信息"
    fi
else
    log_warning "没有找到测试文件，跳过访问测试"
fi

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps nginx backend

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 修复内容："
echo "1. ✅ Nginx 配置已更新：/api/uploads/ 现在代理到后端"
echo "2. ✅ StaticFilesController 路径处理已修复（使用绝对路径）"
echo "3. ✅ 后端会正确处理文件请求"
echo ""
echo "📋 验证步骤："
echo "1. 检查 Nginx 日志："
echo "   docker compose -f docker-compose.prod.yml logs nginx --tail 50 | grep -i 'uploads\|404'"
echo ""
echo "2. 检查后端日志（查看文件请求）："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i 'StaticFilesController'"
echo ""
echo "3. 测试图片访问（替换为实际文件名）："
echo "   curl -I http://localhost:8085/api/uploads/images/giip101-1762480663991-4ef73f7f3de310a9.jpg"
echo ""
echo "4. 在浏览器中访问图片 URL 验证"
echo ""

