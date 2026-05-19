#!/bin/bash

# Docker部署测试脚本
# 用于验证Docker部署后的各项功能

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

# 检查是否在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${CYAN}🐳 Docker部署测试${NC}"
echo "=========================================="
echo ""

# 测试1: 检查容器状态
log_test "测试1: 检查所有容器状态..."
CONTAINER_STATUS=$(docker-compose -f docker-compose.prod.yml ps)
echo "$CONTAINER_STATUS"

# 检查关键容器是否运行
if echo "$CONTAINER_STATUS" | grep -q "conference-backend-prod.*Up"; then
    log_info "✅ 后端容器运行中"
else
    log_error "❌ 后端容器未运行"
    exit 1
fi

if echo "$CONTAINER_STATUS" | grep -q "conference-frontend-prod.*Up"; then
    log_info "✅ 前端容器运行中"
else
    log_error "❌ 前端容器未运行"
    exit 1
fi

if echo "$CONTAINER_STATUS" | grep -q "conference-postgres-prod.*Up"; then
    log_info "✅ 数据库容器运行中"
else
    log_error "❌ 数据库容器未运行"
    exit 1
fi

if echo "$CONTAINER_STATUS" | grep -q "conference-redis-prod.*Up"; then
    log_info "✅ Redis容器运行中"
else
    log_warn "⚠️  Redis容器未运行（可选）"
fi

echo ""

# 测试2: 检查后端健康状态
log_test "测试2: 检查后端健康状态..."
BACKEND_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    log_info "✅ 后端健康检查通过 (HTTP $BACKEND_HEALTH)"
else
    log_error "❌ 后端健康检查失败 (HTTP $BACKEND_HEALTH)"
    log_info "查看后端日志:"
    docker-compose -f docker-compose.prod.yml logs backend --tail 20
    exit 1
fi

echo ""

# 测试3: 检查前端健康状态
log_test "测试3: 检查前端健康状态..."
FRONTEND_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")

if [ "$FRONTEND_HEALTH" = "200" ] || [ "$FRONTEND_HEALTH" = "304" ]; then
    log_info "✅ 前端健康检查通过 (HTTP $FRONTEND_HEALTH)"
else
    log_warn "⚠️  前端健康检查返回 (HTTP $FRONTEND_HEALTH) - 可能正在启动中"
fi

echo ""

# 测试4: 测试容器间网络连接
log_test "测试4: 测试前端到后端的网络连接..."
if docker-compose -f docker-compose.prod.yml exec -T frontend ping -c 2 backend >/dev/null 2>&1; then
    log_info "✅ 前端可以ping通后端"
else
    log_error "❌ 前端无法ping通后端"
    exit 1
fi

# 测试从前端访问后端API
FRONTEND_TO_BACKEND=$(docker-compose -f docker-compose.prod.yml exec -T frontend curl -s -o /dev/null -w "%{http_code}" http://backend:3001/health 2>/dev/null || echo "000")

if [ "$FRONTEND_TO_BACKEND" = "200" ]; then
    log_info "✅ 前端可以访问后端API (HTTP $FRONTEND_TO_BACKEND)"
else
    log_error "❌ 前端无法访问后端API (HTTP $FRONTEND_TO_BACKEND)"
    exit 1
fi

echo ""

# 测试5: 测试后端API端点
log_test "测试5: 测试后端API端点..."

# 测试健康检查端点
API_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T backend curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    log_info "✅ 后端API健康检查端点正常"
else
    log_warn "⚠️  后端API健康检查端点返回 (HTTP $API_HEALTH)"
fi

# 测试事件API端点（不需要认证的公开端点）
EVENTS_API=$(docker-compose -f docker-compose.prod.yml exec -T backend curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/events?status=PUBLISHED&limit=1" 2>/dev/null || echo "000")
if [ "$EVENTS_API" = "200" ]; then
    log_info "✅ 后端事件API端点正常"
else
    log_warn "⚠️  后端事件API端点返回 (HTTP $EVENTS_API)"
fi

echo ""

# 测试6: 测试前端API代理
log_test "测试6: 测试前端API代理..."
FRONTEND_API=$(docker-compose -f docker-compose.prod.yml exec -T frontend curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/events?status=PUBLISHED&limit=1" 2>/dev/null || echo "000")

if [ "$FRONTEND_API" = "200" ]; then
    log_info "✅ 前端API代理正常 (HTTP $FRONTEND_API)"
else
    log_warn "⚠️  前端API代理返回 (HTTP $FRONTEND_API)"
fi

echo ""

# 测试7: 检查环境变量
log_test "测试7: 检查关键环境变量..."

# 检查前端环境变量
FRONTEND_SERVER_API_URL=$(docker-compose -f docker-compose.prod.yml exec -T frontend env | grep "SERVER_API_URL" || echo "")
if echo "$FRONTEND_SERVER_API_URL" | grep -q "http://backend:3001"; then
    log_info "✅ 前端SERVER_API_URL配置正确: $FRONTEND_SERVER_API_URL"
else
    log_warn "⚠️  前端SERVER_API_URL可能未正确配置"
    echo "  当前值: $FRONTEND_SERVER_API_URL"
fi

# 检查后端环境变量
BACKEND_DATABASE_URL=$(docker-compose -f docker-compose.prod.yml exec -T backend env | grep "DATABASE_URL" | head -1 || echo "")
if echo "$BACKEND_DATABASE_URL" | grep -q "postgres"; then
    log_info "✅ 后端DATABASE_URL配置正确"
else
    log_warn "⚠️  后端DATABASE_URL可能未正确配置"
fi

echo ""

# 测试8: 测试数据库连接
log_test "测试8: 测试数据库连接..."
if docker-compose -f docker-compose.prod.yml exec -T backend npx prisma db pull >/dev/null 2>&1; then
    log_info "✅ 数据库连接正常"
else
    log_warn "⚠️  数据库连接测试失败（可能正常，如果数据库未初始化）"
fi

echo ""

# 测试9: 检查hydration修复
log_test "测试9: 检查hydration修复（检查代码）..."
if grep -q "useState.*currentYear" frontend/src/components/public/PublicLayout.tsx 2>/dev/null; then
    log_info "✅ PublicLayout.tsx hydration修复已应用"
else
    log_warn "⚠️  未找到PublicLayout.tsx hydration修复"
fi

if grep -q "useEffect.*isRegistrationOpen" frontend/src/components/public/EventCard.tsx 2>/dev/null; then
    log_info "✅ EventCard.tsx hydration修复已应用"
else
    log_warn "⚠️  未找到EventCard.tsx hydration修复"
fi

echo ""

# 测试10: 检查Nginx（如果运行）
log_test "测试10: 检查Nginx状态..."
if docker-compose -f docker-compose.prod.yml ps nginx 2>/dev/null | grep -q "Up"; then
    log_info "✅ Nginx容器运行中"
    NGINX_HEALTH=$(docker-compose -f docker-compose.prod.yml exec -T nginx wget --quiet --tries=1 --spider --timeout=5 http://127.0.0.1/health 2>&1 && echo "OK" || echo "FAIL")
    if [ "$NGINX_HEALTH" = "OK" ]; then
        log_info "✅ Nginx健康检查通过"
    else
        log_warn "⚠️  Nginx健康检查失败"
    fi
else
    log_warn "⚠️  Nginx容器未运行（可选）"
fi

echo ""

# 总结
echo "=========================================="
echo -e "${CYAN}📊 测试总结${NC}"
echo "=========================================="
echo ""
log_info "所有关键测试已完成"
log_info "如果看到任何错误，请检查相应的容器日志："
echo "  - 后端日志: docker-compose -f docker-compose.prod.yml logs backend"
echo "  - 前端日志: docker-compose -f docker-compose.prod.yml logs frontend"
echo ""
log_info "测试完成！"

