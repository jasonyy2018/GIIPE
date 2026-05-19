#!/bin/bash

# 修复 Nginx 日志问题并重新构建后端

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
echo "🔧 修复 Nginx 日志并重新构建后端"
echo "=========================================="
echo ""

# 步骤 1: 创建 Nginx 日志目录
log_info "步骤 1: 创建 Nginx 日志目录..."
mkdir -p logs/nginx
touch logs/nginx/error.log logs/nginx/access.log
chmod 666 logs/nginx/*.log 2>/dev/null || chmod 777 logs/nginx/*.log

log_success "✅ Nginx 日志目录已创建"

# 步骤 2: 修复容器内日志目录权限
log_info "步骤 2: 修复容器内日志目录权限..."
docker compose -f docker-compose.prod.yml run --rm --user root nginx sh -c "
    mkdir -p /var/log/nginx
    touch /var/log/nginx/error.log /var/log/nginx/access.log
    chmod 666 /var/log/nginx/*.log 2>/dev/null || chmod 777 /var/log/nginx/*.log
    ls -la /var/log/nginx/
" 2>&1 | tail -5

# 步骤 3: 验证 Nginx 配置
log_info "步骤 3: 验证 Nginx 配置..."
NGINX_TEST=$(docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>&1)

if echo "$NGINX_TEST" | grep -q "syntax is ok"; then
    log_success "✅ Nginx 配置验证通过"
else
    log_error "❌ Nginx 配置验证失败"
    echo "$NGINX_TEST"
    exit 1
fi

# 步骤 4: 重新构建后端（应用 remark 修复）
log_info "步骤 4: 重新构建后端镜像（应用 remark ES Module 修复）..."
log_warning "这可能需要几分钟时间..."

docker compose -f docker-compose.prod.yml build backend 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log_success "✅ 后端镜像构建成功"
else
    log_error "❌ 后端镜像构建失败"
    log_info "查看完整构建日志："
    echo "docker compose -f docker-compose.prod.yml build backend"
    exit 1
fi

# 步骤 5: 重启服务
log_info "步骤 5: 重启服务..."
docker compose -f docker-compose.prod.yml restart nginx backend

log_info "等待服务启动..."
sleep 5

# 步骤 6: 验证服务状态
log_info "步骤 6: 验证服务状态..."
docker compose -f docker-compose.prod.yml ps | grep -E "nginx|backend"

# 步骤 7: 检查后端日志（确认 remark 错误已修复）
log_info "步骤 7: 检查后端启动日志..."
docker compose -f docker-compose.prod.yml logs backend --tail 30 | grep -i "error\|remark\|started" | tail -10

echo ""
log_info "=========================================="
log_success "✅ 修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 清除浏览器缓存"
echo "  2. 重新尝试创建事件"
echo "  3. 如果仍有问题，检查日志："
echo "     docker compose -f docker-compose.prod.yml logs backend --tail 50"

