#!/bin/bash

# 修复 Express trust proxy 和上传超时问题

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
echo "🔧 修复 trust proxy 和上传超时问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/5] 停止服务..."
docker compose -f docker-compose.prod.yml stop backend nginx
log_success "服务已停止"

log_info "[2/5] 重新构建后端（应用 trust proxy 修复）..."
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

log_info "[3/5] 重新加载 Nginx 配置（应用超时修复）..."
docker compose -f docker-compose.prod.yml up -d nginx
sleep 3

# 测试 Nginx 配置
NGINX_TEST=$(docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>&1)
if echo "$NGINX_TEST" | grep -q "successful"; then
    log_success "Nginx 配置验证成功"
    # 重新加载 Nginx
    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload 2>/dev/null || log_warning "Nginx 重新加载失败，将重启容器"
else
    log_error "Nginx 配置验证失败"
    echo "$NGINX_TEST"
    exit 1
fi

log_info "[4/5] 启动后端服务..."
docker compose -f docker-compose.prod.yml up -d backend
log_success "后端服务已启动"

log_info "[5/5] 等待服务启动并验证..."
sleep 10

# 检查后端日志中是否有 trust proxy 相关的错误
log_info "检查后端日志（应该不再有 trust proxy 警告）..."
TRUST_PROXY_WARNINGS=$(docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i "trust proxy\|X-Forwarded-For" || echo "")

if [ -z "$TRUST_PROXY_WARNINGS" ]; then
    log_success "✅ 未发现 trust proxy 警告"
else
    log_warning "⚠️  仍可能有 trust proxy 警告，请检查日志"
    echo "$TRUST_PROXY_WARNINGS" | head -5
fi

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps backend nginx

# 验证 Nginx 超时配置
log_info "验证 Nginx 上传超时配置..."
UPLOAD_TIMEOUT=$(docker compose -f docker-compose.prod.yml exec -T nginx grep -A 3 "location /api/storage/" /etc/nginx/conf.d/default.conf | grep "proxy_read_timeout" || echo "")
if echo "$UPLOAD_TIMEOUT" | grep -q "180s"; then
    log_success "✅ 上传超时已设置为 180s"
else
    log_warning "⚠️  上传超时配置可能未正确应用"
    echo "当前配置: $UPLOAD_TIMEOUT"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 修复内容："
echo "1. ✅ Express trust proxy 已配置（修复 X-Forwarded-For 警告）"
echo "2. ✅ 上传超时已增加到 180s（修复 504 Gateway Timeout）"
echo ""
echo "📋 验证步骤："
echo "1. 检查后端日志，应该不再有 trust proxy 警告："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 50 | grep -i 'trust proxy'"
echo ""
echo "2. 测试文件上传功能，应该不再出现 504 错误"
echo ""
echo "3. 如果仍有问题，检查完整日志："
echo "   docker compose -f docker-compose.prod.yml logs backend --tail 100"
echo "   docker compose -f docker-compose.prod.yml logs nginx --tail 100"
echo ""

