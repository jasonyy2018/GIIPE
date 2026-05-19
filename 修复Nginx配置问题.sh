#!/bin/bash

# 修复 Nginx 配置问题
# 确保我们的 Nginx 配置正确加载，而不是显示 Nginx Proxy Manager 的默认页面

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
echo "🔧 修复 Nginx 配置问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 检查配置文件是否存在
if [ ! -f "nginx/conf.d/default.conf" ]; then
    log_error "Nginx 配置文件不存在：nginx/conf.d/default.conf"
    exit 1
fi

if [ ! -f "nginx/nginx.conf" ]; then
    log_error "Nginx 主配置文件不存在：nginx/nginx.conf"
    exit 1
fi

log_info "[1/6] 检查是否有 Nginx Proxy Manager 在运行..."
NPM_CONTAINERS=$(docker ps --filter "name=nginx-proxy-manager" --format "{{.Names}}" 2>/dev/null || echo "")
if [ -n "$NPM_CONTAINERS" ]; then
    log_warning "发现 Nginx Proxy Manager 容器，可能会冲突"
    log_info "Nginx Proxy Manager 容器：$NPM_CONTAINERS"
    log_warning "建议：停止 Nginx Proxy Manager 或使用不同的端口"
    read -p "是否要停止 Nginx Proxy Manager 容器？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop $NPM_CONTAINERS 2>/dev/null || true
        log_success "已停止 Nginx Proxy Manager 容器"
    fi
else
    log_success "未发现 Nginx Proxy Manager 容器"
fi
echo ""

log_info "[2/6] 停止我们的 Nginx 容器..."
docker compose -f docker-compose.prod.yml stop nginx
log_success "Nginx 容器已停止"
echo ""

log_info "[3/6] 验证 Nginx 配置文件语法..."
# 使用临时容器验证配置
docker run --rm \
    -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v "$(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro" \
    nginx:alpine \
    nginx -t

if [ $? -eq 0 ]; then
    log_success "Nginx 配置文件语法正确"
else
    log_error "Nginx 配置文件语法错误，请检查配置文件"
    exit 1
fi
echo ""

log_info "[4/6] 检查配置文件内容..."
log_info "检查 default.conf 是否包含我们的配置..."
if grep -q "upstream backend" nginx/conf.d/default.conf && \
   grep -q "upstream frontend" nginx/conf.d/default.conf && \
   grep -q "location /api" nginx/conf.d/default.conf; then
    log_success "配置文件包含正确的配置"
else
    log_error "配置文件可能不完整，请检查 nginx/conf.d/default.conf"
    exit 1
fi
echo ""

log_info "[5/6] 重新启动 Nginx 容器..."
docker compose -f docker-compose.prod.yml up -d nginx
log_success "Nginx 容器已启动"
echo ""

log_info "等待 Nginx 启动..."
sleep 5

log_info "[6/6] 验证 Nginx 是否正常工作..."
# 检查容器状态
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    log_success "Nginx 容器正在运行"
    
    # 测试健康检查
    HEALTH_CHECK=$(docker compose -f docker-compose.prod.yml exec -T nginx wget -q -O- --timeout=5 http://127.0.0.1/health 2>/dev/null || echo "FAILED")
    if echo "$HEALTH_CHECK" | grep -q "healthy"; then
        log_success "Nginx 健康检查通过"
    else
        log_warning "Nginx 健康检查失败，但容器正在运行"
    fi
    
    # 检查配置是否正确加载
    CONFIG_TEST=$(docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>&1)
    if echo "$CONFIG_TEST" | grep -q "successful"; then
        log_success "Nginx 配置测试通过"
    else
        log_error "Nginx 配置测试失败"
        echo "$CONFIG_TEST"
    fi
else
    log_error "Nginx 容器未运行"
    log_info "查看日志："
    docker compose -f docker-compose.prod.yml logs nginx --tail 50
    exit 1
fi
echo ""

echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 验证步骤："
echo "1. 访问 http://your-server-ip:8085/health"
echo "   应该返回：healthy"
echo ""
echo "2. 访问 http://your-server-ip:8085/"
echo "   应该显示前端应用，而不是 Nginx Proxy Manager 页面"
echo ""
echo "3. 如果仍然看到 Nginx Proxy Manager 页面："
echo "   - 检查是否有其他 Nginx 服务在运行：docker ps | grep nginx"
echo "   - 检查端口占用：netstat -tlnp | grep 8085"
echo "   - 查看 Nginx 日志：docker compose -f docker-compose.prod.yml logs nginx"
echo ""
echo "📋 如果问题仍然存在，运行诊断脚本："
echo "   bash 诊断Nginx配置问题.sh"
echo ""

