#!/bin/bash

# 直接执行数据库迁移脚本（不依赖 source .env.production）
# 直接从文件读取配置，避免语法错误

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

# 从 .env.production 读取配置（使用 grep，避免 source 语法错误）
if [ -f ".env.production" ]; then
    DB_USER=$(grep "^POSTGRES_USER=" .env.production | cut -d= -f2 | tr -d ' ' | tr -d '"' | tr -d "'" | head -1)
    DB_NAME=$(grep "^POSTGRES_DB=" .env.production | cut -d= -f2 | tr -d ' ' | tr -d '"' | tr -d "'" | head -1)
fi

# 设置默认值
DB_USER="${DB_USER:-conference_user}"
DB_NAME="${DB_NAME:-conference_platform}"

echo "数据库配置:"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 步骤 1: 列出所有数据库，找到正确的数据库名
echo "[1/4] 查找数据库..."
echo "   尝试列出所有数据库（使用 conference_user）..."
ALL_DBS=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -tAc "SELECT datname FROM pg_database WHERE datistemplate = false;" 2>/dev/null || echo "")

if [ -z "$ALL_DBS" ]; then
    echo "   无法使用 $DB_USER 列出数据库，尝试查找..."
    # 尝试常见的数据库名
    for test_db in conference_platform conference_db conference platform; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres psql -U "$DB_USER" -d "$test_db" -c "SELECT 1;" >/dev/null 2>&1; then
            DB_NAME="$test_db"
            echo "   ✅ 找到数据库: $DB_NAME"
            break
        fi
    done
else
    echo "   可用的数据库:"
    echo "$ALL_DBS" | while read db; do
        if [ ! -z "$db" ]; then
            echo "     - $db"
            # 如果找到匹配的数据库，使用它
            if [ "$db" = "$DB_NAME" ] || [ "$db" = "conference_platform" ] || [ "$db" = "conference_db" ]; then
                DB_NAME="$db"
            fi
        fi
    done
fi
echo ""

# 步骤 2: 检查数据库连接
echo "[2/4] 检查数据库连接..."
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
    echo "   使用: 用户=$DB_USER, 数据库=$DB_NAME"
else
    echo -e "${YELLOW}⚠️ 无法连接到数据库 $DB_NAME，尝试查找正确的数据库名...${NC}"
    
    # 尝试所有可能的数据库名
    for test_db in conference_platform conference_db conference platform; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DB_USER" -d "$test_db" >/dev/null 2>&1; then
            DB_NAME="$test_db"
            echo -e "${GREEN}✅ 找到可用的数据库: $DB_NAME${NC}"
            break
        fi
    done
    
    # 如果还是失败，列出所有数据库让用户选择
    if ! docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        echo -e "${RED}❌ 无法连接到数据库${NC}"
        echo ""
        echo "请手动指定数据库名："
        echo "  docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER -d <数据库名> -c \"ALTER TABLE events ADD COLUMN IF NOT EXISTS submitUrl TEXT;\""
        exit 1
    fi
fi
echo ""

# 步骤 3: 检查列是否已存在
echo "[3/4] 检查 submitUrl 列..."
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

# 步骤 4: 执行迁移
echo "[4/4] 执行数据库迁移..."
MIGRATION_SQL="ALTER TABLE events ADD COLUMN IF NOT EXISTS \"submitUrl\" TEXT;"

echo "   执行 SQL: $MIGRATION_SQL"
echo "   用户: $DB_USER"
echo "   数据库: $DB_NAME"

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
echo "使用的配置:"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""
echo "下一步："
echo "1. 重启后端容器以应用更改："
echo "   docker-compose -f docker-compose.prod.yml restart backend"
echo ""
echo "2. 检查后端日志："
echo "   docker-compose -f docker-compose.prod.yml logs backend --tail 50"
echo ""

