#!/bin/bash

# 快速诊断后端启动问题

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
echo "🔍 后端启动问题诊断"
echo "=========================================="
echo ""

# 确保在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本。"
    exit 1
fi

log_info "步骤 1: 检查容器状态..."
docker compose -f docker-compose.prod.yml ps

echo ""
log_info "步骤 2: 查看后端日志（最后100行）..."
docker compose -f docker-compose.prod.yml logs backend --tail 100

echo ""
log_info "步骤 3: 检查后端容器是否运行..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    log_info "后端容器正在运行"
    
    echo ""
    log_info "步骤 4: 测试健康检查端点..."
    docker compose -f docker-compose.prod.yml exec backend curl -f http://localhost:3001/health || log_error "健康检查失败"
    
    echo ""
    log_info "步骤 5: 测试 API 健康检查端点..."
    docker compose -f docker-compose.prod.yml exec backend curl -f http://localhost:3001/api/health || log_warning "API 健康检查端点不可用（可能正常）"
    
    echo ""
    log_info "步骤 6: 检查数据库连接..."
    docker compose -f docker-compose.prod.yml exec backend npx prisma db pull > /dev/null 2>&1 && log_info "数据库连接正常" || log_error "数据库连接失败"
else
    log_error "后端容器未运行"
fi

echo ""
log_info "步骤 7: 检查环境变量..."
docker compose -f docker-compose.prod.yml exec backend env | grep -E "DATABASE_URL|REDIS|PORT|NODE_ENV" | head -10

echo ""
log_info "=========================================="
log_info "✅ 诊断完成"
log_info "=========================================="
log_info ""
log_info "如果看到错误，请："
log_info "1. 检查后端日志中的具体错误信息"
log_info "2. 确认数据库和 Redis 已启动"
log_info "3. 确认环境变量配置正确"
log_info "4. 尝试重新启动后端: docker compose -f docker-compose.prod.yml restart backend"

