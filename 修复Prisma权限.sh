#!/bin/bash

# 修复 Prisma Client 权限问题

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
echo "🔧 修复 Prisma Client 权限"
echo "=========================================="
echo ""

log_info "步骤 1: 停止后端服务（避免文件锁定）..."
docker compose -f docker-compose.prod.yml stop backend

log_info "步骤 2: 修复权限并重新生成 Prisma Client..."
if docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
    echo '清理旧的 Prisma Client...'
    rm -rf /app/node_modules/.prisma 2>/dev/null || true
    echo '修复 node_modules 权限...'
    chown -R nestjs:nodejs /app/node_modules 2>/dev/null || true
    chmod -R 755 /app/node_modules 2>/dev/null || true
    echo '切换到 nestjs 用户生成 Prisma Client...'
    su - nestjs -c 'cd /app && npx prisma generate'
"; then
    log_info "✅ Prisma Client 生成成功"
else
    log_warning "使用备用方法..."
    # 备用方法：直接以 root 用户生成，然后改权限
    docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "
        rm -rf /app/node_modules/.prisma
        npx prisma generate
        chown -R nestjs:nodejs /app/node_modules/.prisma
        chmod -R 755 /app/node_modules/.prisma
    " && log_info "✅ Prisma Client 生成成功（使用备用方法）" || log_error "❌ Prisma Client 生成失败"
fi

log_info "步骤 3: 启动后端服务..."
docker compose -f docker-compose.prod.yml start backend

log_info "等待后端启动..."
sleep 10

log_info "步骤 4: 验证后端健康状态..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    log_info "✅ 后端服务健康"
else
    log_warning "⚠️  后端可能未就绪 (HTTP $BACKEND_HEALTH)"
    log_info "查看后端日志："
    echo "  docker compose -f docker-compose.prod.yml logs backend --tail 50"
fi

echo ""
log_info "=========================================="
log_info "✅ 修复完成"
log_info "=========================================="

