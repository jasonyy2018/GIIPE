#!/bin/bash

# 修复数据库密码问题脚本

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
echo "🔧 修复数据库密码问题"
echo "=========================================="
echo ""

# 确保在项目根目录
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "请在项目根目录运行此脚本。"
    exit 1
fi

# 检查 .env.production 文件
if [ ! -f ".env.production" ]; then
    log_error ".env.production 文件不存在！"
    log_info "请先运行部署脚本生成环境变量文件。"
    exit 1
fi

log_info "步骤 1: 检查当前环境变量..."
if grep -q "DATABASE_URL" .env.production; then
    log_info "DATABASE_URL 已存在"
    grep "DATABASE_URL" .env.production
else
    log_warning "DATABASE_URL 不存在，需要添加"
fi

echo ""
log_info "步骤 2: 读取数据库配置..."
source .env.production 2>/dev/null || true

POSTGRES_USER=${POSTGRES_USER:-conference_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB:-conference_db}

if [ -z "$POSTGRES_PASSWORD" ]; then
    log_error "POSTGRES_PASSWORD 未设置！"
    log_info "请在 .env.production 文件中设置 POSTGRES_PASSWORD"
    exit 1
fi

log_info "数据库用户: $POSTGRES_USER"
log_info "数据库名称: $POSTGRES_DB"
log_info "密码长度: ${#POSTGRES_PASSWORD} 字符"

echo ""
log_info "步骤 3: 更新 DATABASE_URL..."
# 检查是否已有 DATABASE_URL
if grep -q "^DATABASE_URL=" .env.production; then
    # 更新现有的 DATABASE_URL
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}|" .env.production
    log_info "已更新 DATABASE_URL"
else
    # 添加新的 DATABASE_URL（在 POSTGRES_DB 之后）
    sed -i "/^POSTGRES_DB=/a DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" .env.production
    log_info "已添加 DATABASE_URL"
fi

# 检查并添加 REDIS_URL
if ! grep -q "^REDIS_URL=" .env.production; then
    REDIS_PASSWORD=${REDIS_PASSWORD}
    if [ -n "$REDIS_PASSWORD" ]; then
        sed -i "/^REDIS_PASSWORD=/a REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379" .env.production
        log_info "已添加 REDIS_URL"
    fi
fi

echo ""
log_info "步骤 4: 验证配置..."
if grep -q "DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" .env.production; then
    log_info "✅ DATABASE_URL 配置正确"
    # 显示（不显示密码）
    DATABASE_URL_SHOW=$(grep "^DATABASE_URL=" .env.production | sed "s|:${POSTGRES_PASSWORD}@|:***@|")
    echo "   $DATABASE_URL_SHOW"
else
    log_error "❌ DATABASE_URL 配置失败"
    exit 1
fi

echo ""
log_info "步骤 5: 停止现有服务..."
docker compose -f docker-compose.prod.yml stop backend postgres 2>/dev/null || true

echo ""
log_info "步骤 6: 删除旧的数据库容器（如果需要重置）..."
read -p "是否删除并重新创建数据库容器? (这将删除所有数据) (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_warning "删除数据库容器和数据卷..."
    docker compose -f docker-compose.prod.yml down -v postgres 2>/dev/null || true
    docker volume rm conference-postgres-prod_data 2>/dev/null || true
    log_info "数据库容器已删除"
fi

echo ""
log_info "步骤 7: 重新启动服务..."
docker compose -f docker-compose.prod.yml up -d postgres redis

log_info "等待数据库就绪..."
sleep 10

# 检查数据库连接
if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
    log_info "✅ 数据库已就绪"
else
    log_warning "数据库可能还在启动中，请稍等..."
    sleep 5
fi

echo ""
log_info "步骤 8: 启动后端服务..."
docker compose -f docker-compose.prod.yml up -d backend

log_info "等待后端启动..."
sleep 10

echo ""
log_info "检查后端状态..."
if docker compose -f docker-compose.prod.yml ps backend | grep -q "Up"; then
    log_info "✅ 后端服务已启动"
    log_info "查看日志: docker compose -f docker-compose.prod.yml logs backend --tail 50"
else
    log_error "❌ 后端服务启动失败"
    log_info "查看日志: docker compose -f docker-compose.prod.yml logs backend --tail 100"
fi

echo ""
log_info "=========================================="
log_info "✅ 修复完成"
log_info "=========================================="

