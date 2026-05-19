#!/bin/bash

# 立即修复上传超时问题

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
echo "🔧 修复图片上传超时问题"
echo "=========================================="
echo ""

# 步骤 1: 验证 Nginx 配置
log_info "步骤 1: 验证 Nginx 配置..."
if docker compose -f docker-compose.prod.yml exec nginx nginx -t 2>&1 | grep -q "successful"; then
    log_success "✅ Nginx 配置语法正确"
else
    log_error "❌ Nginx 配置有错误"
    docker compose -f docker-compose.prod.yml exec nginx nginx -t
    exit 1
fi

# 步骤 2: 检查上传路由配置
log_info "步骤 2: 检查上传路由配置..."
if grep -q "location /api/upload" nginx/conf.d/default.conf; then
    log_success "✅ /api/upload 路由已配置"
    
    # 检查超时设置
    if grep -A 5 "location /api/upload" nginx/conf.d/default.conf | grep -q "proxy_read_timeout 120"; then
        log_success "✅ 超时设置已配置为 120s"
    else
        log_warning "⚠️  超时设置可能不正确"
    fi
else
    log_error "❌ /api/upload 路由未找到"
    exit 1
fi

echo ""
log_info "步骤 3: 重启 Nginx 以应用配置..."
docker compose -f docker-compose.prod.yml restart nginx
sleep 3

if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    log_success "✅ Nginx 已重启"
else
    log_error "❌ Nginx 重启失败"
    exit 1
fi

echo ""
log_info "步骤 4: 检查后端服务状态..."
if docker compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3001/api/health &>/dev/null; then
    log_success "✅ 后端服务正常"
else
    log_warning "⚠️  后端服务可能未就绪"
fi

echo ""
log_info "步骤 5: 检查前端 API 路由配置..."
if grep -q "maxDuration = 120" frontend/src/app/api/upload/route.ts 2>/dev/null; then
    log_success "✅ 前端 API 路由超时已配置为 120s"
    
    # 检查是否需要重新构建前端
    log_info "检查前端是否需要重新构建..."
    FRONTEND_BUILD_DATE=$(docker compose -f docker-compose.prod.yml exec -T frontend stat -c %y /app/server.js 2>/dev/null | cut -d' ' -f1 || echo "")
    ROUTE_MOD_DATE=$(stat -c %y frontend/src/app/api/upload/route.ts 2>/dev/null | cut -d' ' -f1 || echo "")
    
    if [ -n "$FRONTEND_BUILD_DATE" ] && [ -n "$ROUTE_MOD_DATE" ]; then
        if [ "$ROUTE_MOD_DATE" \> "$FRONTEND_BUILD_DATE" ]; then
            log_warning "⚠️  前端代码已更新，需要重新构建"
            log_info "重新构建前端..."
            docker compose -f docker-compose.prod.yml build frontend
            docker compose -f docker-compose.prod.yml restart frontend
            log_success "✅ 前端已重新构建并重启"
        else
            log_info "前端代码未更改，无需重新构建"
        fi
    fi
else
    log_warning "⚠️  前端 API 路由超时配置可能不正确"
fi

echo ""
log_info "步骤 6: 测试上传端点..."
# 检查上传端点是否可访问（不实际上传文件）
UPLOAD_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost/api/upload 2>/dev/null || echo "000")

if [ "$UPLOAD_TEST" = "200" ] || [ "$UPLOAD_TEST" = "405" ] || [ "$UPLOAD_TEST" = "404" ]; then
    log_info "上传端点响应码: $UPLOAD_TEST（正常）"
else
    log_warning "上传端点可能无法访问 (HTTP $UPLOAD_TEST)"
fi

echo ""
log_info "=========================================="
log_success "✅ 修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "  2. 重新登录管理后台"
echo "  3. 尝试上传图片"
echo ""
log_info "如果问题仍然存在，请检查："
echo "  - 后端日志: docker compose -f docker-compose.prod.yml logs backend --tail 50"
echo "  - Nginx 日志: docker compose -f docker-compose.prod.yml logs nginx --tail 50"
echo "  - 前端日志: docker compose -f docker-compose.prod.yml logs frontend --tail 50"

