#!/bin/bash

# 初始化数据库表 - 使用 prisma db push（不需要迁移文件）

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
echo "🗄️  初始化数据库表"
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

POSTGRES_USER=${POSTGRES_USER:-conference_user}
POSTGRES_DB=${POSTGRES_DB:-conference_db}

# 检查后端容器
log_info "检查后端容器状态..."
if ! docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    log_warning "后端容器未运行，正在启动..."
    docker compose -f docker-compose.prod.yml up -d backend
    log_info "等待后端容器启动..."
    sleep 15
fi

# 检查数据库连接
log_info "检查数据库连接..."
if ! docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
    log_error "数据库连接失败！"
    exit 1
fi

log_info "✅ 数据库已就绪"

echo ""
log_info "步骤 1: 检查迁移文件..."
if docker compose -f docker-compose.prod.yml exec -T backend sh -c "test -d /app/prisma/migrations && ls /app/prisma/migrations | head -5" 2>/dev/null; then
    log_info "✅ 迁移文件存在"
    MIGRATION_METHOD="migrate"
else
    log_warning "⚠️  迁移文件不存在或不可访问，将使用 db push"
    MIGRATION_METHOD="push"
fi

echo ""
if [ "$MIGRATION_METHOD" = "migrate" ]; then
    log_info "步骤 2: 尝试运行 Prisma 迁移..."
    if docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy 2>&1; then
        log_info "✅ 迁移成功"
        MIGRATION_SUCCESS=true
    else
        log_warning "迁移失败，改用 db push..."
        MIGRATION_SUCCESS=false
    fi
fi

if [ "$MIGRATION_METHOD" = "push" ] || [ "$MIGRATION_SUCCESS" = "false" ]; then
    echo ""
    log_info "步骤 2: 使用 prisma db push 创建表结构..."
    log_warning "这将根据 schema.prisma 直接创建/更新数据库表"
    
    if docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss --skip-generate 2>&1; then
        log_info "✅ 表结构创建成功"
    else
        log_error "❌ db push 失败"
        log_info "查看详细错误："
        docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss --skip-generate 2>&1
        exit 1
    fi
fi

echo ""
log_info "步骤 3: 生成 Prisma Client..."
# 先尝试以 root 用户生成（因为权限问题）
if docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "chown -R nestjs:nodejs /app/node_modules/.prisma 2>/dev/null || true && chmod -R 755 /app/node_modules/.prisma 2>/dev/null || true && npx prisma generate" 2>&1; then
    log_info "✅ Prisma Client 生成成功"
elif docker compose -f docker-compose.prod.yml exec -T backend npx prisma generate 2>&1; then
    log_info "✅ Prisma Client 生成成功"
else
    log_warning "⚠️  Prisma Client 生成失败，尝试修复权限后重试..."
    # 尝试修复权限
    docker compose -f docker-compose.prod.yml exec -u root -T backend sh -c "rm -rf /app/node_modules/.prisma && chown -R nestjs:nodejs /app/node_modules && npx prisma generate" 2>&1 || log_warning "⚠️  Prisma Client 生成可能失败（但可能不影响运行）"
fi

echo ""
log_info "步骤 4: 验证表是否创建..."
# 等待一秒确保数据库操作完成
sleep 2

# 检查所有表（包括系统表）
TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")

# 检查核心表
CORE_TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'events', 'news');" 2>/dev/null || echo "0")

# 直接列出表
log_info "正在列出数据库中的表..."
TABLE_LIST=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "\dt" 2>/dev/null || echo "")

if [ -n "$TABLE_LIST" ] && [ "$TABLES" -gt "0" ]; then
    log_info "✅ 数据库表已创建 (共 $TABLES 个表)"
    
    if [ "$CORE_TABLES" = "3" ]; then
        log_info "✅ 核心表已创建 (users, events, news)"
    else
        log_warning "⚠️  部分核心表可能未创建 (找到 $CORE_TABLES/3)"
        log_info "检查具体表..."
        docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" 2>/dev/null || true
    fi
    
    echo ""
    log_info "所有表列表："
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt" 2>/dev/null || true
elif [ -n "$TABLE_LIST" ]; then
    log_info "✅ 检测到表存在（通过列表查询）"
    echo "$TABLE_LIST"
else
    log_error "❌ 没有创建任何表"
    log_info "尝试查看详细错误信息..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt" 2>&1
    log_info "检查数据库连接..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" 2>&1
    exit 1
fi

echo ""
log_info "步骤 5: 重启后端服务..."
docker compose -f docker-compose.prod.yml restart backend

log_info "等待后端重启..."
sleep 10

echo ""
log_info "步骤 6: 检查后端健康状态..."
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
log_info "✅ 数据库初始化完成！"
log_info "=========================================="
echo ""
log_info "下一步："
echo "  1. 创建管理员用户（如果需要）"
echo "  2. 检查服务状态: docker compose -f docker-compose.prod.yml ps"
echo "  3. 查看日志: docker compose -f docker-compose.prod.yml logs -f backend"

