#!/bin/bash

# 修复 Next.js 图片代理问题
# 问题：Next.js rewrites 在 Docker 中使用 localhost:3001 而不是 http://backend:3001

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
echo "🔧 修复 Next.js 图片代理问题"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "[1/4] 检查 next.config.js 配置..."
if grep -q "SERVER_API_URL.*localhost:3001" frontend/next.config.js; then
    log_warning "发现 localhost:3001 回退配置"
else
    log_success "next.config.js 配置正确"
fi

log_info "[2/4] 停止前端服务..."
docker compose -f docker-compose.prod.yml stop frontend
log_success "前端服务已停止"

log_info "[3/4] 重新构建前端（应用 next.config.js 修复）..."
docker compose -f docker-compose.prod.yml build --no-cache frontend
log_success "前端构建完成"

log_info "[4/4] 启动前端服务..."
docker compose -f docker-compose.prod.yml up -d frontend
log_success "前端服务已启动"

log_info "等待服务启动..."
sleep 15

# 检查服务状态
log_info "检查服务状态..."
docker compose -f docker-compose.prod.yml ps frontend

# 检查前端日志
log_info "检查前端日志（查找代理错误）..."
ERROR_COUNT=$(docker compose -f docker-compose.prod.yml logs frontend --tail 50 | grep -c "ECONNREFUSED.*localhost:3001" || echo "0")
if [ "$ERROR_COUNT" -eq "0" ]; then
    log_success "没有发现 localhost:3001 连接错误"
else
    log_warning "仍然发现 $ERROR_COUNT 个 localhost:3001 连接错误"
    log_info "请检查前端日志："
    log_info "docker compose -f docker-compose.prod.yml logs frontend --tail 100 | grep -i 'ECONNREFUSED\|localhost:3001'"
fi

echo ""
echo "=========================================="
log_success "修复完成！"
echo "=========================================="
echo ""
echo "📋 已修复的问题："
echo "1. ✅ Next.js rewrites 配置：在 Docker 中使用 http://backend:3001"
echo "2. ✅ Next.js image remotePatterns：添加 backend 容器名称支持"
echo ""
echo "📋 验证步骤："
echo "1. 检查前端日志（不应该有 ECONNREFUSED 错误）："
echo "   docker compose -f docker-compose.prod.yml logs frontend --tail 50 | grep -i 'ECONNREFUSED\|localhost:3001'"
echo ""
echo "2. 测试图片访问（通过浏览器或 curl）："
echo "   curl -I http://localhost:8085/api/uploads/images/giip101-1762480663991-4ef73f7f3de310a9.jpg"
echo ""
echo "3. 检查 Next.js rewrites 是否生效："
echo "   docker compose -f docker-compose.prod.yml exec frontend cat .next/routes-manifest.json | grep -A 5 'rewrites'"
echo ""
echo "如果仍有问题，请检查："
echo "- SERVER_API_URL 环境变量是否正确设置"
echo "- 前端容器是否能访问 backend:3001"
echo ""

