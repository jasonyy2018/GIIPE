#!/bin/bash

# 快速运行数据库迁移脚本

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
echo "📦 运行数据库迁移"
echo "=========================================="
echo ""

# 确保在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本。"
    exit 1
fi

# 加载环境变量
if [ -f ".env.production" ]; then
    set -a
    source .env.production
    set +a
    log_info "已加载环境变量"
else
    log_error ".env.production 文件不存在！"
    exit 1
fi

# 检查后端容器是否运行
log_info "检查后端容器状态..."
if ! docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    log_warning "后端容器未运行，正在启动..."
    docker compose -f docker-compose.prod.yml up -d backend
    
    log_info "等待后端容器启动..."
    sleep 15
fi

# 检查数据库是否就绪
log_info "检查数据库连接..."
if ! docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_db}" &> /dev/null; then
    log_warning "数据库可能未就绪，等待中..."
    sleep 5
    
    if ! docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_db}" &> /dev/null; then
        log_error "数据库连接失败！"
        log_info "请检查："
        echo "  1. 数据库容器是否运行: docker compose -f docker-compose.prod.yml ps postgres"
        echo "  2. 数据库日志: docker compose -f docker-compose.prod.yml logs postgres"
        exit 1
    fi
fi

log_info "✅ 数据库已就绪"

echo ""
log_info "步骤 1: 检查迁移文件..."
if docker compose -f docker-compose.prod.yml exec -T backend sh -c "test -d /app/prisma/migrations && ls /app/prisma/migrations | head -5" 2>/dev/null; then
    log_info "✅ 迁移文件存在，尝试运行迁移..."
    if docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy 2>&1; then
        log_info "✅ 迁移成功"
    else
        log_warning "迁移失败，尝试使用 db push..."
        if docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss --skip-generate 2>&1; then
            log_info "✅ db push 成功"
        else
            log_error "❌ 迁移和 db push 都失败了"
            log_info "请检查后端日志："
            echo "  docker compose -f docker-compose.prod.yml logs backend --tail 50"
            exit 1
        fi
    fi
else
    log_warning "迁移文件不存在，使用 db push..."
    if docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss --skip-generate 2>&1; then
        log_info "✅ db push 成功"
    else
        log_error "❌ db push 失败"
        log_info "请检查后端日志："
        echo "  docker compose -f docker-compose.prod.yml logs backend --tail 50"
        exit 1
    fi
fi

echo ""
log_info "步骤 2: 重新生成 Prisma Client..."
if docker compose -f docker-compose.prod.yml exec -T backend npx prisma generate; then
    log_info "✅ Prisma Client 生成成功"
else
    log_warning "⚠️  Prisma Client 生成失败（可能不影响运行）"
fi

echo ""
log_info "步骤 3: 重启后端服务..."
docker compose -f docker-compose.prod.yml restart backend

log_info "等待后端重启..."
sleep 10

echo ""
log_info "步骤 4: 验证迁移..."
# 检查表是否存在
TABLES_CHECK=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_db}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'events', 'news');" 2>/dev/null || echo "0")

if [ "$TABLES_CHECK" = "3" ]; then
    log_info "✅ 核心表已创建 (users, events, news)"
else
    log_warning "⚠️  部分表可能未创建，检查到的表数: $TABLES_CHECK"
    log_info "查看所有表："
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U "${POSTGRES_USER:-conference_user}" -d "${POSTGRES_DB:-conference_db}" -c "\dt" 2>/dev/null || true
fi

echo ""
log_info "步骤 5: 检查后端健康状态..."
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
log_info "✅ 迁移完成！"
log_info "=========================================="
echo ""
log_info "下一步："
echo "  1. 创建管理员用户（如果需要）"
echo "  2. 检查服务状态: docker compose -f docker-compose.prod.yml ps"
echo "  3. 查看日志: docker compose -f docker-compose.prod.yml logs -f"

