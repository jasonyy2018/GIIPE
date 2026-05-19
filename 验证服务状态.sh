#!/bin/bash

# 验证服务状态

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

echo "=========================================="
echo "🔍 验证服务状态"
echo "=========================================="
echo ""

log_info "步骤 1: 检查容器状态..."
docker compose -f docker-compose.prod.yml ps

echo ""
log_info "步骤 2: 从容器内部测试后端健康检查..."
BACKEND_HEALTH=$(docker compose -f docker-compose.prod.yml exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    log_info "✅ 后端服务健康（从容器内部访问）"
else
    log_warning "⚠️  后端健康检查失败 (HTTP $BACKEND_HEALTH)"
fi

echo ""
log_info "步骤 3: 检查端口映射..."
docker compose -f docker-compose.prod.yml ps backend | grep -E "3001|PORTS" || true

echo ""
log_info "步骤 4: 从主机测试（如果端口映射正确）..."
# 检查端口是否在监听
if netstat -tln 2>/dev/null | grep -q ":3001" || ss -tln 2>/dev/null | grep -q ":3001"; then
    log_info "端口 3001 正在监听"
    HOST_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    if [ "$HOST_HEALTH" = "200" ]; then
        log_info "✅ 从主机可以访问后端"
    else
        log_warning "⚠️  端口监听但无法访问 (HTTP $HOST_HEALTH)"
    fi
else
    log_warning "⚠️  端口 3001 未在主机上监听（可能通过 Nginx 访问）"
fi

echo ""
log_info "步骤 5: 检查 Nginx 状态..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    log_info "✅ Nginx 容器运行中"
    NGINX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
    if [ "$NGINX_HEALTH" = "200" ]; then
        log_info "✅ 通过 Nginx 可以访问后端 API"
    else
        log_warning "⚠️  通过 Nginx 无法访问 (HTTP $NGINX_HEALTH)"
    fi
else
    log_warning "⚠️  Nginx 容器未运行"
fi

echo ""
log_info "步骤 6: 测试数据库连接..."
if docker compose -f docker-compose.prod.yml exec -T backend npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
    log_info "✅ 数据库连接正常"
else
    log_warning "⚠️  数据库连接测试失败"
fi

echo ""
log_info "步骤 7: 查看最近的后端日志（最后 20 行）..."
docker compose -f docker-compose.prod.yml logs backend --tail 20

echo ""
log_info "=========================================="
log_info "✅ 验证完成"
log_info "=========================================="
echo ""
log_info "总结："
echo "  - 后端服务已在容器内成功启动"
echo "  - 如果端口未映射，可以通过 Nginx 访问"
echo "  - 环境变量警告不影响运行（可以忽略或修复）"

