#!/bin/bash

# 修复 .env.production 文件中的语法错误

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
echo "🔧 修复环境变量文件"
echo "=========================================="
echo ""

ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env.production 文件不存在！"
    exit 1
fi

log_info "备份原文件..."
cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

log_info "修复 EMAIL_FROM 语法错误..."

# 修复 EMAIL_FROM 行 - 移除引号或使用正确的格式
sed -i.bak 's/^EMAIL_FROM=.*$/EMAIL_FROM=noreply@localhost/' "$ENV_FILE" 2>/dev/null || \
sed -i 's/^EMAIL_FROM=.*$/EMAIL_FROM=noreply@localhost/' "$ENV_FILE" 2>/dev/null || \
perl -i -pe 's/^EMAIL_FROM=.*$/EMAIL_FROM=noreply@localhost/' "$ENV_FILE" 2>/dev/null

# 如果上面都失败，使用 Python 或其他方法
if grep -q "EMAIL_FROM=Conference Platform" "$ENV_FILE" 2>/dev/null; then
    log_warning "使用 Python 修复..."
    python3 << 'EOF'
import re

env_file = ".env.production"
with open(env_file, 'r') as f:
    content = f.read()

# 修复 EMAIL_FROM 行
content = re.sub(
    r'^EMAIL_FROM=.*$',
    'EMAIL_FROM=noreply@localhost',
    content,
    flags=re.MULTILINE
)

with open(env_file, 'w') as f:
    f.write(content)
EOF
fi

log_info "验证修复..."
if grep -q "^EMAIL_FROM=" "$ENV_FILE" && ! grep -q "<" "$ENV_FILE" | grep "EMAIL_FROM"; then
    log_info "✅ EMAIL_FROM 已修复"
    grep "^EMAIL_FROM=" "$ENV_FILE"
else
    log_warning "⚠️  可能需要手动修复 EMAIL_FROM"
    echo "请编辑 .env.production，将 EMAIL_FROM 行改为："
    echo "  EMAIL_FROM=noreply@localhost"
fi

echo ""
log_info "测试环境变量加载..."
if bash -c "set -a; source '$ENV_FILE' 2>&1; set +a; echo '✅ 环境变量加载成功'"; then
    log_info "✅ 环境变量文件语法正确"
else
    log_error "❌ 环境变量文件仍有语法错误"
    log_info "请检查："
    echo "  cat $ENV_FILE | grep -n EMAIL_FROM"
    exit 1
fi

echo ""
log_info "=========================================="
log_info "✅ 修复完成"
log_info "=========================================="

