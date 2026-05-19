#!/bin/bash

# 修复数据库名称不匹配问题

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
echo "🔧 修复数据库名称不匹配"
echo "=========================================="
echo ""

# 1. 检查实际存在的数据库
log_info "步骤 1: 检查实际存在的数据库..."
EXISTING_DB=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d postgres -tAc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres') ORDER BY datname LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$EXISTING_DB" ]; then
    log_error "无法连接到数据库或没有找到数据库"
    exit 1
fi

log_success "发现实际数据库: $EXISTING_DB"

# 检查这个数据库是否有表
TABLES_COUNT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$EXISTING_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")

if [ "$TABLES_COUNT" -gt "0" ]; then
    log_success "数据库 '$EXISTING_DB' 包含 $TABLES_COUNT 个表（这是正确的数据库）"
else
    log_warning "数据库 '$EXISTING_DB' 没有表，可能不是目标数据库"
fi

echo ""
log_info "步骤 2: 备份当前环境变量文件..."
if [ -f ".env.production" ]; then
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    log_success "✅ 已备份到 .env.production.backup.*"
fi

echo ""
log_info "步骤 3: 更新环境变量文件..."
# 读取当前密码
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
POSTGRES_USER=$(grep "^POSTGRES_USER=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "conference_user")

if [ -z "$POSTGRES_PASSWORD" ]; then
    log_error "无法获取数据库密码"
    exit 1
fi

# 更新 POSTGRES_DB
log_info "更新 POSTGRES_DB 为: $EXISTING_DB"
if grep -q "^POSTGRES_DB=" .env.production; then
    sed -i "s/^POSTGRES_DB=.*/POSTGRES_DB=$EXISTING_DB/" .env.production 2>/dev/null || \
    perl -i -pe "s/^POSTGRES_DB=.*/POSTGRES_DB=$EXISTING_DB/" .env.production 2>/dev/null || \
    python3 << EOF
import re
with open('.env.production', 'r') as f:
    content = f.read()
content = re.sub(r'^POSTGRES_DB=.*', f'POSTGRES_DB=$EXISTING_DB', content, flags=re.MULTILINE)
with open('.env.production', 'w') as f:
    f.write(content)
EOF
    log_success "✅ POSTGRES_DB 已更新"
else
    echo "POSTGRES_DB=$EXISTING_DB" >> .env.production
    log_success "✅ POSTGRES_DB 已添加"
fi

# 更新 DATABASE_URL
log_info "更新 DATABASE_URL..."
NEW_DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${EXISTING_DB}"
if grep -q "^DATABASE_URL=" .env.production; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production 2>/dev/null || \
    perl -i -pe "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production 2>/dev/null || \
    python3 << EOF
import re
with open('.env.production', 'r') as f:
    content = f.read()
content = re.sub(r'^DATABASE_URL=.*', f'DATABASE_URL=$NEW_DATABASE_URL', content, flags=re.MULTILINE)
with open('.env.production', 'w') as f:
    f.write(content)
EOF
    log_success "✅ DATABASE_URL 已更新"
else
    echo "DATABASE_URL=$NEW_DATABASE_URL" >> .env.production
    log_success "✅ DATABASE_URL 已添加"
fi

echo ""
log_info "步骤 4: 验证更新..."
CURRENT_DB=$(grep "^POSTGRES_DB=" .env.production | cut -d'=' -f2 | xargs)
DB_FROM_URL=$(grep "^DATABASE_URL=" .env.production | cut -d'=' -f2- | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ "$CURRENT_DB" = "$EXISTING_DB" ] && [ "$DB_FROM_URL" = "$EXISTING_DB" ]; then
    log_success "✅ 配置已统一为: $EXISTING_DB"
else
    log_warning "⚠️  配置可能未完全更新"
    echo "  POSTGRES_DB: $CURRENT_DB"
    echo "  DATABASE_URL 中的数据库: $DB_FROM_URL"
fi

echo ""
log_info "步骤 5: 测试数据库连接..."
if docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$EXISTING_DB" -c "\dt" &>/dev/null; then
    TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$EXISTING_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
    log_success "✅ 数据库连接成功，包含 $TABLES 个表"
else
    log_error "❌ 数据库连接失败"
    exit 1
fi

echo ""
log_info "=========================================="
log_success "✅ 修复完成"
log_info "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 重启服务以应用新配置："
echo "     docker compose -f docker-compose.prod.yml restart"
echo ""
echo "  2. 验证配置："
echo "     bash 检查数据库配置.sh"
echo ""
log_warning "注意：如果后端服务正在运行且使用旧配置，重启后会自动使用新配置"

