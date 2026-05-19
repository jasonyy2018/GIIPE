#!/bin/bash

# 统一数据库配置，确保所有地方使用相同的数据库名称

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
echo "🔧 统一数据库配置"
echo "=========================================="
echo ""

# 1. 检查当前环境变量
if [ ! -f ".env.production" ]; then
    log_error ".env.production 文件不存在！"
    exit 1
fi

POSTGRES_DB=$(grep "^POSTGRES_DB=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$POSTGRES_DB" ]; then
    log_warning "POSTGRES_DB 未设置，使用默认值: conference_db"
    POSTGRES_DB="conference_db"
    echo "POSTGRES_DB=$POSTGRES_DB" >> .env.production
fi

log_info "当前数据库名称: $POSTGRES_DB"

# 2. 更新 docker-compose.prod.yml 中的默认值
log_info "更新 docker-compose.prod.yml..."
sed -i 's/conference_platform/conference_db/g' docker-compose.prod.yml 2>/dev/null || \
perl -i -pe 's/conference_platform/conference_db/g' docker-compose.prod.yml 2>/dev/null || \
python3 << EOF
import re
with open('docker-compose.prod.yml', 'r') as f:
    content = f.read()
content = re.sub(r'conference_platform', 'conference_db', content)
with open('docker-compose.prod.yml', 'w') as f:
    f.write(content)
EOF

if [ $? -eq 0 ]; then
    log_success "✅ docker-compose.prod.yml 已更新"
else
    log_warning "⚠️  更新 docker-compose.prod.yml 可能失败，请手动检查"
fi

# 3. 确保 DATABASE_URL 正确
log_info "检查 DATABASE_URL..."
if ! grep -q "^DATABASE_URL=" .env.production; then
    POSTGRES_USER=$(grep "^POSTGRES_USER=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "conference_user")
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    
    if [ -n "$POSTGRES_PASSWORD" ]; then
        echo "DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" >> .env.production
        log_success "✅ DATABASE_URL 已添加"
    else
        log_warning "⚠️  无法添加 DATABASE_URL（密码未设置）"
    fi
else
    # 更新现有的 DATABASE_URL
    POSTGRES_USER=$(grep "^POSTGRES_USER=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "conference_user")
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    
    if [ -n "$POSTGRES_PASSWORD" ]; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}|" .env.production 2>/dev/null || \
        perl -i -pe "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}|" .env.production 2>/dev/null
        log_success "✅ DATABASE_URL 已更新"
    fi
fi

# 4. 验证数据库是否存在
log_info "验证数据库状态..."
if docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$POSTGRES_DB" -c "\dt" &>/dev/null; then
    TABLES=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null || echo "0")
    log_success "✅ 数据库 '$POSTGRES_DB' 存在，包含 $TABLES 个表"
else
    log_warning "⚠️  数据库 '$POSTGRES_DB' 可能不存在或无法访问"
fi

echo ""
log_info "=========================================="
log_success "✅ 配置统一完成"
log_info "=========================================="
echo ""
log_info "建议："
echo "  1. 重启服务以应用新配置: docker compose -f docker-compose.prod.yml restart"
echo "  2. 运行检查脚本验证: bash 检查数据库配置.sh"

