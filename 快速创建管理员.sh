#!/bin/bash

# 快速创建管理员账户（不依赖 TypeScript）

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
echo "👤 快速创建管理员账户"
echo "=========================================="
echo ""

# 1. 检测实际数据库
log_info "步骤 1: 检测数据库..."
EXISTING_DB=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d postgres -tAc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres') ORDER BY datname LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$EXISTING_DB" ]; then
    log_error "无法检测数据库，尝试从环境变量获取..."
    if [ -f ".env.production" ]; then
        EXISTING_DB=$(grep "^POSTGRES_DB=" .env.production | cut -d'=' -f2 | xargs)
    fi
    if [ -z "$EXISTING_DB" ]; then
        EXISTING_DB="conference_db"
        log_warning "使用默认数据库: $EXISTING_DB"
    fi
else
    log_success "检测到数据库: $EXISTING_DB"
fi

# 验证数据库是否存在
if ! docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$EXISTING_DB" -c "\dt" &>/dev/null; then
    log_error "数据库 '$EXISTING_DB' 无法访问"
    exit 1
fi

echo ""
log_info "步骤 2: 生成密码哈希..."
# 使用 Node.js 生成 bcrypt 哈希（不依赖 TypeScript）
HASH=$(docker compose -f docker-compose.prod.yml exec -T backend node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(hash => console.log(hash)).catch(e => { console.error('Error:', e.message); process.exit(1); });" 2>/dev/null | tail -1 | xargs)

if [ -z "$HASH" ] || [ "$HASH" = "undefined" ] || [ "$HASH" = "Error:" ]; then
    log_warning "无法生成密码哈希，使用预生成的哈希（admin123）"
    # admin123 的 bcrypt 哈希
    HASH='$2a$10$rGDtvItTdifzq7MANCgUOOkJMhJh3fklomkvIbpB.ReTMs.9TmEGK'
else
    log_success "密码哈希生成成功"
fi

echo ""
log_info "步骤 3: 创建管理员账户..."
log_info "数据库: $EXISTING_DB"
log_info "邮箱: admin@giip.info"
log_info "密码: admin123"

# 执行 SQL 插入
INSERT_RESULT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$EXISTING_DB" <<EOF 2>&1
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
EOF
)

# 检查结果
if echo "$INSERT_RESULT" | grep -q "INSERT\|UPDATE\|ON CONFLICT" || echo "$INSERT_RESULT" | grep -q "admin@giip.info"; then
    log_success "✅ SQL 执行成功"
else
    if echo "$INSERT_RESULT" | grep -q "duplicate key\|already exists"; then
        log_warning "账户可能已存在，尝试更新..."
    else
        log_error "❌ SQL 执行可能失败"
        echo "错误信息："
        echo "$INSERT_RESULT" | tail -5
    fi
fi

echo ""
log_info "步骤 4: 验证账户..."
VERIFY_RESULT=$(docker compose -f docker-compose.prod.yml exec -T postgres psql -U conference_user -d "$EXISTING_DB" -c "SELECT email, username, role, \"isActive\", \"emailVerified\" FROM users WHERE email = 'admin@giip.info';" 2>&1)

if echo "$VERIFY_RESULT" | grep -q "admin@giip.info"; then
    log_success "✅ 管理员账户创建/更新成功！"
    echo ""
    log_info "账户信息："
    echo "$VERIFY_RESULT" | grep -A 2 "admin@giip.info" | head -5
    echo ""
    log_success "=========================================="
    log_success "✅ 完成！"
    log_success "=========================================="
    echo ""
    log_info "登录凭据："
    echo "  📧 邮箱: admin@giip.info"
    echo "  🔒 密码: admin123"
    echo "  👤 用户名: giip-admin"
    echo ""
    log_warning "⚠️  安全提示：首次登录后请立即修改密码！"
else
    log_error "❌ 账户验证失败"
    echo ""
    log_info "查询结果："
    echo "$VERIFY_RESULT"
    echo ""
    log_info "尝试手动验证："
    echo "  docker compose -f docker-compose.prod.yml exec postgres psql -U conference_user -d $EXISTING_DB -c \"SELECT * FROM users;\""
    exit 1
fi

