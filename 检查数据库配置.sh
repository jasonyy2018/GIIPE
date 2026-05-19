#!/bin/bash

# 检查数据库配置并验证一致性

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

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "=========================================="
echo "🔍 检查数据库配置一致性"
echo "=========================================="
echo ""

# 1. 检查环境变量中的数据库配置
log_info "步骤 1: 检查环境变量配置..."
if [ -f ".env.production" ]; then
    POSTGRES_DB=$(grep "^POSTGRES_DB=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    POSTGRES_USER=$(grep "^POSTGRES_USER=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    DATABASE_URL=$(grep "^DATABASE_URL=" .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    log_info "环境变量中的配置："
    echo "  POSTGRES_DB: ${POSTGRES_DB:-未设置}"
    echo "  POSTGRES_USER: ${POSTGRES_USER:-未设置}"
    echo "  DATABASE_URL: ${DATABASE_URL:0:50}..." # 只显示前50个字符（隐藏密码）
    
    # 从 DATABASE_URL 提取数据库名
    DB_FROM_URL=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    log_info "从 DATABASE_URL 提取的数据库名: $DB_FROM_URL"
    
    # 检查一致性
    if [ "$POSTGRES_DB" = "$DB_FROM_URL" ]; then
        log_success "✅ 数据库名称一致: $POSTGRES_DB"
    else
        log_warning "⚠️  数据库名称不一致！"
        echo "  POSTGRES_DB: $POSTGRES_DB"
        echo "  DATABASE_URL 中的数据库: $DB_FROM_URL"
    fi
else
    log_error ".env.production 文件不存在！"
    exit 1
fi

echo ""
log_info "步骤 2: 检查实际存在的数据库..."
EXISTING_DBS=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres');" 2>/dev/null || echo "")

if [ -n "$EXISTING_DBS" ]; then
    log_info "当前数据库列表："
    echo "$EXISTING_DBS" | while read db; do
        if [ -n "$db" ]; then
            echo "  - $db"
            if [ "$db" = "$POSTGRES_DB" ]; then
                log_success "    ✅ 这是目标数据库"
            fi
        fi
    done
else
    log_warning "⚠️  无法获取数据库列表"
fi

echo ""
log_info "步骤 3: 检查表是否存在..."
TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "error")

if [ "$TABLES" != "error" ] && [ "$TABLES" -gt "0" ]; then
    log_success "✅ 数据库表已存在 (共 $TABLES 个表)"
    
    # 列出核心表
    log_info "核心表状态："
    for table in users events news; do
        EXISTS=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null || echo "false")
        if [ "$EXISTS" = "t" ]; then
            log_success "  ✅ $table"
        else
            log_error "  ❌ $table (不存在)"
        fi
    done
else
    log_error "❌ 无法访问数据库或表不存在"
    log_info "尝试诊断..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt" 2>&1 | head -20
fi

echo ""
log_info "步骤 4: 检查是否有其他数据库配置问题..."
# 检查是否有 conference_platform 数据库（旧配置）
OLD_DB_EXISTS=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT EXISTS (SELECT FROM pg_database WHERE datname = 'conference_platform');" 2>/dev/null || echo "false")

if [ "$OLD_DB_EXISTS" = "t" ]; then
    log_warning "⚠️  发现旧的数据库 'conference_platform'"
    log_info "这可能是旧配置留下的，如果不需要可以删除"
fi

echo ""
log_info "步骤 5: 验证后端连接..."
# 从后端容器测试数据库连接
BACKEND_DB_TEST=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c "echo \$DATABASE_URL" 2>/dev/null | grep -o '/[^/]*$' | tr -d '/' || echo "")
if [ -n "$BACKEND_DB_TEST" ]; then
    log_info "后端容器中的数据库名: $BACKEND_DB_TEST"
    if [ "$BACKEND_DB_TEST" = "$POSTGRES_DB" ]; then
        log_success "✅ 后端配置与环境变量一致"
    else
        log_warning "⚠️  后端配置的数据库名 ($BACKEND_DB_TEST) 与环境变量 ($POSTGRES_DB) 不一致"
    fi
fi

echo ""
log_info "=========================================="
log_info "✅ 检查完成"
log_info "=========================================="
echo ""
log_info "如果发现问题，请："
echo "  1. 确保 .env.production 中的 POSTGRES_DB 和 DATABASE_URL 一致"
echo "  2. 确保 docker-compose.prod.yml 中的数据库配置一致"
echo "  3. 重启所有服务以应用新配置"

