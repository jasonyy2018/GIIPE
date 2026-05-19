#!/bin/bash

# 诊断和修复 502 Bad Gateway 错误

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
echo "🔍 诊断和修复 502 Bad Gateway 错误"
echo "=========================================="
echo ""

# 1. 检查前端服务状态
log_info "[1/6] 检查前端服务状态..."
FRONTEND_STATUS=$(docker compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log_info "前端服务状态: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" != "running" ]; then
    log_warning "前端服务未运行，尝试启动..."
    docker compose -f docker-compose.prod.yml up -d frontend
    sleep 10
fi

# 2. 检查前端日志
log_info "[2/6] 检查前端日志（最近50行）..."
docker compose -f docker-compose.prod.yml logs frontend --tail 50 | tail -20

# 3. 检查前端是否监听端口
log_info "[3/6] 检查前端是否监听 3000 端口..."
docker compose -f docker-compose.prod.yml exec -T frontend sh -c "
    netstat -tlnp 2>/dev/null | grep :3000 || \
    ss -tlnp 2>/dev/null | grep :3000 || \
    echo '⚠️  端口 3000 未监听'
" 2>/dev/null || log_warning "无法检查端口"

# 4. 测试前端健康检查
log_info "[4/6] 测试前端健康检查..."
docker compose -f docker-compose.prod.yml exec -T frontend sh -c "
    wget -q -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -5 || \
    curl -s --max-time 5 http://127.0.0.1:3000/ | head -5 || \
    echo '❌ 前端服务无响应'
" 2>/dev/null || log_warning "前端服务可能未完全启动"

# 5. 检查 Nginx 到前端的连接
log_info "[5/6] 检查 Nginx 到前端的连接..."
docker compose -f docker-compose.prod.yml exec -T nginx sh -c "
    wget -q -O- --timeout=5 http://frontend:3000/ 2>&1 | head -5 || \
    echo '❌ Nginx 无法连接到前端'
" 2>/dev/null || log_warning "Nginx 无法连接到前端"

# 6. 检查 Nginx 错误日志
log_info "[6/6] 检查 Nginx 错误日志..."
docker compose -f docker-compose.prod.yml logs nginx --tail 50 | grep -iE "error|502|upstream|connect" | tail -10 || log_info "没有发现相关错误"

echo ""
echo "=========================================="
echo "📋 修复建议："
echo "=========================================="
echo ""
echo "如果前端服务有问题："
echo "1. 查看完整日志："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 100"
echo ""
echo "2. 重新构建前端："
echo "   docker compose -f docker-compose.prod.yml build --no-cache frontend"
echo "   docker compose -f docker-compose.prod.yml up -d frontend"
echo ""
echo "3. 如果前端需要很长时间启动，可以临时禁用健康检查依赖："
echo "   编辑 docker-compose.prod.yml，将 Nginx 的 depends_on 改为："
echo "   depends_on:"
echo "     frontend:"
echo "       condition: service_started  # 而不是 service_healthy"
echo ""
echo "4. 或者让 Nginx 在 frontend 失败时也能工作（只代理后端）："
echo "   这需要修改 Nginx 配置，添加错误处理"
echo ""

