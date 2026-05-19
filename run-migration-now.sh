#!/bin/bash

# 直接执行数据库迁移脚本
# 使用 .env.production 中的实际配置

set -e

echo "=========================================="
echo "执行数据库迁移"
echo "=========================================="
echo ""

cd ~/dockerdata/GIIPE

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 从 .env.production 读取配置
if [ -f ".env.production" ]; then
    # 使用 source 加载环境变量
    set -a
    source .env.production
    set +a
fi

# 设置变量（使用环境变量或默认值）
DB_USER="${POSTGRES_USER:-conference_user}"
DB_NAME="${POSTGRES_DB:-conference_platform}"

echo "数据库配置:"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 检查数据库连接
echo "[1/3] 检查数据库连接..."
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
    echo "   尝试检查数据库服务..."
    docker-compose -f docker-compose.prod.yml ps postgres
    exit 1
fi
echo ""

# 检查列是否已存在
echo "[2/3] 检查 submitUrl 列..."
COLUMN_EXISTS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='submitUrl');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$COLUMN_EXISTS" = "t" ]; then
    echo -e "${GREEN}✅ submitUrl 列已存在，无需迁移${NC}"
    echo ""
    echo "=========================================="
    echo "迁移完成（列已存在）"
    echo "=========================================="
    exit 0
else
    echo "   submitUrl 列不存在，需要添加"
fi
echo ""

# 执行迁移
echo "[3/3] 执行数据库迁移..."
MIGRATION_SQL="ALTER TABLE events ADD COLUMN IF NOT EXISTS \"submitUrl\" TEXT;"

echo "   执行 SQL: $MIGRATION_SQL"
if docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$MIGRATION_SQL" 2>&1; then
    echo -e "${GREEN}✅ 数据库迁移成功${NC}"
else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    exit 1
fi
echo ""

# 验证迁移
echo "验证迁移结果..."
COLUMN_EXISTS_AFTER=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='submitUrl');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$COLUMN_EXISTS_AFTER" = "t" ]; then
    echo -e "${GREEN}✅ submitUrl 列已成功添加${NC}"
else
    echo -e "${RED}❌ submitUrl 列添加失败${NC}"
    exit 1
fi
echo ""

echo "=========================================="
echo "数据库迁移完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 重启后端容器以应用更改："
echo "   docker-compose -f docker-compose.prod.yml restart backend"
echo ""
echo "2. 检查后端日志："
echo "   docker-compose -f docker-compose.prod.yml logs backend --tail 50"
echo ""

