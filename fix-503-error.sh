#!/bin/bash

# 修复 503 Service Unavailable 错误
# 这个脚本会诊断并修复 Next.js 服务器无法响应的问题

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
echo "🔧 修复 503 Service Unavailable 错误"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 1. 检查前端容器状态
log_info "[1/6] 检查前端容器状态..."
FRONTEND_STATUS=$(docker-compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$FRONTEND_STATUS" = "running" ]; then
    log_success "前端容器正在运行"
else
    log_warning "前端容器状态: $FRONTEND_STATUS"
fi
echo ""

# 2. 查看最近的错误日志
log_info "[2/6] 查看最近的错误日志..."
docker-compose -f docker-compose.prod.yml logs --tail=30 frontend | tail -20
echo ""

# 3. 检查容器内进程
log_info "[3/6] 检查容器内 Node.js 进程..."
if docker-compose -f docker-compose.prod.yml exec -T frontend ps aux 2>/dev/null | grep -q "node"; then
    log_success "Node.js 进程正在运行"
    docker-compose -f docker-compose.prod.yml exec -T frontend ps aux | grep node | head -3
else
    log_error "Node.js 进程未运行"
fi
echo ""

# 4. 检查端口监听
log_info "[4/6] 检查端口 3000 是否监听..."
if docker-compose -f docker-compose.prod.yml exec -T frontend sh -c "netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000" 2>/dev/null | grep -q ":3000"; then
    log_success "端口 3000 正在监听"
else
    log_error "端口 3000 未监听"
fi
echo ""

# 5. 测试直接访问
log_info "[5/6] 测试直接访问 Next.js 服务器..."
if docker-compose -f docker-compose.prod.yml exec -T nginx wget -q --spider --timeout=5 http://frontend:3000/ 2>/dev/null; then
    log_success "可以直接访问 Next.js 服务器"
else
    log_error "无法访问 Next.js 服务器"
    log_info "尝试从容器内测试..."
    docker-compose -f docker-compose.prod.yml exec -T frontend wget -q --spider --timeout=5 http://127.0.0.1:3000/ 2>/dev/null && log_success "容器内可以访问" || log_error "容器内也无法访问"
fi
echo ""

# 6. 重启服务
log_info "[6/6] 重启前端服务..."
read -p "是否重启前端服务？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "停止前端服务..."
    docker-compose -f docker-compose.prod.yml stop frontend
    
    log_info "启动前端服务..."
    docker-compose -f docker-compose.prod.yml up -d frontend
    
    log_info "等待服务启动（30秒）..."
    sleep 30
    
    log_info "检查服务状态..."
    docker-compose -f docker-compose.prod.yml ps frontend
    
    log_info "查看启动日志..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
else
    log_info "跳过重启"
fi

echo ""
log_info "诊断完成！"
log_info "如果问题仍然存在，请："
log_info "1. 查看完整日志: docker-compose -f docker-compose.prod.yml logs frontend"
log_info "2. 检查资源使用: docker stats conference-frontend-prod"
log_info "3. 重新构建: docker-compose -f docker-compose.prod.yml build --no-cache frontend"

