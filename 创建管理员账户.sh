#!/bin/bash

# 快速创建管理员账户

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
echo "👤 创建管理员账户"
echo "=========================================="
echo ""

# 1. 检查数据库配置
if [ -f ".env.production" ]; then
    POSTGRES_DB=$(grep "^POSTGRES_DB=" .env.production | cut -d'=' -f2 | xargs)
    log_info "目标数据库: ${POSTGRES_DB:-conference_db}"
else
    POSTGRES_DB="conference_db"
    log_warning "未找到 .env.production，使用默认数据库: $POSTGRES_DB"
fi

# 使用实际存在的数据库
EXISTING_DB=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d postgres -tAc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres') ORDER BY datname LIMIT 1;" 2>/dev/null | xargs)

if [ -n "$EXISTING_DB" ]; then
    ACTUAL_DB="$EXISTING_DB"
    log_info "使用实际数据库: $ACTUAL_DB"
else
    ACTUAL_DB="${POSTGRES_DB:-conference_db}"
    log_warning "无法检测数据库，使用: $ACTUAL_DB"
fi

echo ""
log_info "方法 1: 尝试使用 seed 脚本（最简单）..."
if docker compose -f docker-compose.prod.yml exec -T backend npm run db:seed 2>&1; then
    log_success "✅ 管理员账户创建成功（使用 seed 脚本）"
    echo ""
    log_info "默认登录信息："
    echo "  邮箱: admin@giip.info"
    echo "  密码: admin123"
    echo "  用户名: giip-admin"
    exit 0
else
    log_warning "Seed 脚本失败，尝试方法 2..."
fi

echo ""
log_info "方法 2: 使用 create-admin 脚本..."
if docker compose -f docker-compose.prod.yml exec -T backend npx ts-node scripts/create-admin.ts \
    --email admin@giip.info \
    --username giip-admin \
    --password admin123 \
    --firstName Admin \
    --lastName User 2>&1; then
    log_success "✅ 管理员账户创建成功（使用 create-admin 脚本）"
    echo ""
    log_info "登录信息："
    echo "  邮箱: admin@giip.info"
    echo "  密码: admin123"
    echo "  用户名: giip-admin"
    exit 0
else
    log_warning "Create-admin 脚本失败，尝试方法 3（SQL 直接插入）..."
fi

echo ""
log_info "方法 3: 使用 SQL 直接创建（需要生成密码哈希）..."
log_info "生成密码哈希..."

# 生成密码哈希
HASH=$(docker compose -f docker-compose.prod.yml exec -T backend node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(hash => console.log(hash));" 2>/dev/null | tail -1 | xargs)

if [ -z "$HASH" ] || [ "$HASH" = "undefined" ]; then
    log_error "无法生成密码哈希，尝试备用方法..."
    # 使用预生成的哈希（admin123 的 bcrypt 哈希）
    HASH='$2a$10$rGDtvItTdifzq7MANCgUOOkJMhJh3fklomkvIbpB.ReTMs.9TmEGK'
    log_warning "使用预生成的密码哈希（admin123）"
else
    log_success "密码哈希生成成功"
fi

echo ""
log_info "插入管理员账户到数据库..."
INSERT_RESULT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$ACTUAL_DB" <<EOF 2>&1
INSERT INTO users (
    id, 
    username, 
    email, 
    password, 
    role, 
    "isActive", 
    "emailVerified", 
    "firstName", 
    "lastName", 
    "createdAt", 
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'giip-admin',
    'admin@giip.info',
    '$HASH',
    'ADMIN',
    true,
    true,
    'Admin',
    'User',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    role = 'ADMIN',
    "isActive" = true,
    "emailVerified" = true,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    "updatedAt" = NOW();
SELECT email, username, role, "isActive" FROM users WHERE email = 'admin@giip.info';
EOF
)

if echo "$INSERT_RESULT" | grep -q "admin@giip.info"; then
    log_success "✅ 管理员账户创建/更新成功！"
    echo ""
    log_info "登录信息："
    echo "  邮箱: admin@giip.info"
    echo "  密码: admin123"
    echo "  用户名: giip-admin"
    echo ""
    log_info "账户详情："
    echo "$INSERT_RESULT" | grep -A 5 "admin@giip.info" || true
else
    log_error "❌ 创建管理员账户失败"
    echo ""
    log_info "错误信息："
    echo "$INSERT_RESULT" | tail -10
    exit 1
fi

echo ""
log_info "=========================================="
log_success "✅ 完成"
log_info "=========================================="
echo ""
log_info "现在可以使用以下凭据登录："
echo "  📧 邮箱: admin@giip.info"
echo "  🔒 密码: admin123"
echo ""
log_warning "⚠️  安全提示：首次登录后请立即修改密码！"

