#!/bin/bash

# 检查前端服务状态和诊断 503 错误

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
echo "🔍 检查前端服务状态和诊断 503 错误"
echo "=========================================="
echo ""

# 1. 检查容器状态
log_info "[1/8] 检查前端容器状态..."
FRONTEND_STATUS=$(docker-compose -f docker-compose.prod.yml ps frontend --format json 2>/dev/null | grep -o '"Status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
log_info "前端容器状态: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" != "running" ]; then
    log_error "前端容器未运行！"
    log_info "尝试启动容器..."
    docker-compose -f docker-compose.prod.yml up -d frontend
    sleep 10
fi
echo ""

# 2. 检查容器内进程
log_info "[2/8] 检查容器内 Node.js 进程..."
if docker-compose -f docker-compose.prod.yml exec -T frontend ps aux 2>/dev/null | grep -q "node"; then
    log_success "Node.js 进程正在运行"
    docker-compose -f docker-compose.prod.yml exec -T frontend ps aux | grep node | head -3
else
    log_error "Node.js 进程未运行！"
    log_info "查看容器日志..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
fi
echo ""

# 3. 检查端口监听
log_info "[3/8] 检查端口 3000 是否监听..."
if docker-compose -f docker-compose.prod.yml exec -T frontend sh -c "netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000" 2>/dev/null | grep -q ":3000"; then
    log_success "端口 3000 正在监听"
    docker-compose -f docker-compose.prod.yml exec -T frontend sh -c "netstat -tlnp 2>/dev/null | grep :3000 || ss -tlnp 2>/dev/null | grep :3000" 2>/dev/null | head -1
else
    log_error "端口 3000 未监听！"
fi
echo ""

# 4. 检查文件权限
log_info "[4/8] 检查关键文件权限..."
docker-compose -f docker-compose.prod.yml exec -T frontend sh -c "
    echo '检查 server.js:'
    ls -la /app/server.js 2>/dev/null || echo 'server.js 不存在！'
    echo ''
    echo '检查 .next/static:'
    ls -la /app/.next/static 2>/dev/null | head -3 || echo '.next/static 不存在！'
    echo ''
    echo '检查 public:'
    ls -la /app/public 2>/dev/null | head -3 || echo 'public 不存在！'
" 2>/dev/null || log_warning "无法检查文件权限"
echo ""

# 5. 测试容器内访问
log_info "[5/8] 测试容器内直接访问 Next.js..."
if docker-compose -f docker-compose.prod.yml exec -T frontend wget -q --spider --timeout=5 http://127.0.0.1:3000/ 2>/dev/null; then
    log_success "容器内可以访问 Next.js"
else
    log_error "容器内无法访问 Next.js"
    log_info "尝试获取更多信息..."
    docker-compose -f docker-compose.prod.yml exec -T frontend wget -O- --timeout=5 http://127.0.0.1:3000/ 2>&1 | head -10
fi
echo ""

# 6. 测试从 nginx 访问
log_info "[6/8] 测试从 nginx 容器访问前端..."
if docker-compose -f docker-compose.prod.yml exec -T nginx wget -q --spider --timeout=5 http://frontend:3000/ 2>/dev/null; then
    log_success "nginx 可以访问前端"
else
    log_error "nginx 无法访问前端"
    log_info "检查网络连接..."
    docker-compose -f docker-compose.prod.yml exec -T nginx ping -c 2 frontend 2>/dev/null || log_error "无法 ping 通 frontend 容器"
fi
echo ""

# 7. 检查资源使用
log_info "[7/8] 检查容器资源使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" conference-frontend-prod 2>/dev/null || log_warning "无法获取资源使用情况"
echo ""

# 8. 查看最近的错误日志
log_info "[8/8] 查看最近的错误日志..."
docker-compose -f docker-compose.prod.yml logs --tail=30 frontend | grep -i "error\|fatal\|crash\|503" || log_info "未发现明显错误"
echo ""

# 总结和建议
echo "=========================================="
log_info "诊断完成！"
echo "=========================================="
echo ""
log_info "如果发现问题，建议执行："
log_info "1. 重启前端: docker-compose -f docker-compose.prod.yml restart frontend"
log_info "2. 查看完整日志: docker-compose -f docker-compose.prod.yml logs -f frontend"
log_info "3. 重新构建: docker-compose -f docker-compose.prod.yml build --no-cache frontend"
log_info "4. 检查 nginx 日志: docker-compose -f docker-compose.prod.yml logs nginx | grep 503"

