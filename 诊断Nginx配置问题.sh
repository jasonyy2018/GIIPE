#!/bin/bash

# 诊断 Nginx 配置问题
# 检查是否有 Nginx Proxy Manager 或其他服务占用端口

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
echo "🔍 诊断 Nginx 配置问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/7] 检查所有运行中的容器..."
echo ""
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
echo ""

log_info "[2/7] 检查是否有 Nginx Proxy Manager 在运行..."
NPM_CONTAINERS=$(docker ps --filter "name=nginx-proxy-manager" --format "{{.Names}}")
if [ -n "$NPM_CONTAINERS" ]; then
    log_warning "发现 Nginx Proxy Manager 容器："
    echo "$NPM_CONTAINERS"
    log_warning "Nginx Proxy Manager 可能占用 80/443 端口，导致我们的 Nginx 无法正常工作"
else
    log_success "未发现 Nginx Proxy Manager 容器"
fi
echo ""

log_info "[3/7] 检查端口占用情况..."
echo ""
log_info "检查 8085 端口（我们的 Nginx 端口）..."
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep ":8085" || echo "端口 8085 未被占用"
elif command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep ":8085" || echo "端口 8085 未被占用"
else
    log_warning "无法检查端口占用（需要 netstat 或 ss 命令）"
fi
echo ""

log_info "检查 80 端口..."
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep ":80 " || echo "端口 80 未被占用"
elif command -v ss >/dev/null 2>&1; then
    ss -tlnp | grep ":80 " || echo "端口 80 未被占用"
else
    log_warning "无法检查端口占用（需要 netstat 或 ss 命令）"
fi
echo ""

log_info "[4/7] 检查我们的 Nginx 容器状态..."
docker compose -f docker-compose.prod.yml ps nginx
echo ""

log_info "[5/7] 检查 Nginx 容器内的配置..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    log_info "检查 Nginx 配置文件是否正确加载..."
    docker compose -f docker-compose.prod.yml exec nginx nginx -t 2>&1 || log_error "Nginx 配置测试失败"
    echo ""
    
    log_info "检查 Nginx 是否监听 80 端口..."
    docker compose -f docker-compose.prod.yml exec nginx netstat -tlnp 2>/dev/null | grep ":80" || \
    docker compose -f docker-compose.prod.yml exec nginx ss -tlnp 2>/dev/null | grep ":80" || \
    log_warning "无法检查容器内端口"
    echo ""
    
    log_info "检查 Nginx 配置文件内容（前 50 行）..."
    docker compose -f docker-compose.prod.yml exec nginx head -50 /etc/nginx/conf.d/default.conf
    echo ""
else
    log_error "Nginx 容器未运行"
fi

log_info "[6/7] 测试 Nginx 健康检查..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    HEALTH_CHECK=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- --timeout=5 http://127.0.0.1/health 2>/dev/null || echo "FAILED")
    if echo "$HEALTH_CHECK" | grep -q "healthy"; then
        log_success "Nginx 健康检查通过"
    else
        log_error "Nginx 健康检查失败"
    fi
else
    log_warning "无法测试健康检查（容器未运行）"
fi
echo ""

log_info "[7/7] 检查 Nginx 日志（最近的错误）..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    docker compose -f docker-compose.prod.yml logs nginx --tail 30 | grep -iE "error|warn|fail" || log_info "未发现错误日志"
else
    log_warning "无法查看日志（容器未运行）"
fi
echo ""

echo "=========================================="
log_info "诊断完成"
echo "=========================================="
echo ""
echo "📋 可能的问题和解决方案："
echo ""
echo "1. 如果发现 Nginx Proxy Manager 在运行："
echo "   - 停止 Nginx Proxy Manager：docker stop <container-name>"
echo "   - 或者修改 docker-compose.prod.yml 中的端口映射"
echo ""
echo "2. 如果端口被占用："
echo "   - 检查占用端口的进程：sudo lsof -i :8085 或 sudo lsof -i :80"
echo "   - 停止占用端口的服务"
echo ""
echo "3. 如果 Nginx 配置有问题："
echo "   - 检查 nginx/conf.d/default.conf 文件"
echo "   - 重新加载配置：docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"
echo ""
echo "4. 如果 Nginx 容器未运行："
echo "   - 启动容器：docker compose -f docker-compose.prod.yml up -d nginx"
echo "   - 查看日志：docker compose -f docker-compose.prod.yml logs nginx"
echo ""

